import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../services/tokenService.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateUsernameSuggestions, usernameError, normalizeUsername } from '../services/pgPlatform.js';
import * as accounts from '../repositories/accounts.js';
import * as tenants from '../repositories/tenants.js';
import { recordAudit } from '../services/auditService.js';

const ownerUser = (pg) => ({
  id: pg.id,
  pgName: pg.pgName,
  pgUsername: pg.pgUsername,
  ownerName: pg.ownerName,
  email: pg.ownerEmail,
  role: 'owner',
  pgId: pg.id,
});

const ownerSession = (pg) => ({
  success: true,
  token: signToken({ sub: pg.id, role: 'owner' }),
  user: ownerUser(pg),
});

// ================= Owner =================

// A PG owner signs up directly: account + PG workspace are created in one step.
export const ownerRegister = asyncHandler(async (req, res) => {
  const { owner, pg, pgUsername, password } = req.body;

  const nameError = usernameError(pgUsername);
  if (nameError) throw ApiError.badRequest(nameError);
  const username = normalizeUsername(pgUsername);

  const account = await accounts.createOwner({ owner, pg, pgUsername: username, passwordHash: await hashPassword(password) });
  recordAudit(account.id, account.id, 'owner.registered', 'PgAccount', account.id, `Registered ${account.pgName}`);
  res.status(201).json(ownerSession(account));
});

export const ownerLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const pg = await accounts.findOwnerForLogin(identifier);
  // One message for both cases so the endpoint cannot be used to probe for accounts.
  if (!pg || !(await verifyPassword(password, pg.passwordHash))) throw ApiError.unauthorized('Incorrect username/email or password');
  if (!pg.isActive) throw ApiError.forbidden('This PG account is deactivated');
  res.json(ownerSession(pg));
});

export const usernameAvailable = asyncHandler(async (req, res) => {
  const raw = String(req.query.username ?? '');
  const err = usernameError(raw);
  if (err) return res.json({ success: true, available: false, error: err, suggestions: [] });

  const taken = await accounts.usernameExists(normalizeUsername(raw));
  res.json({
    success: true,
    available: !taken,
    error: taken ? 'This username is already taken' : null,
    suggestions: taken ? await generateUsernameSuggestions(raw) : [],
  });
});

// ================= Manager =================

export const managerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const manager = await accounts.findManagerForLogin(email);
  if (!manager || !(await verifyPassword(password, manager.passwordHash))) throw ApiError.unauthorized('Incorrect email or password');
  res.json({
    success: true,
    token: signToken({ sub: manager.id, role: 'manager' }),
    user: { id: manager.id, fullName: manager.fullName, email: manager.email, role: 'manager', pgId: manager.pgId },
  });
});

// ================= Tenant =================
// Tenants cannot register themselves: the PG owner creates the account and shares
// the credentials. Sign-in is mobile number + password.

export const tenantLogin = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  const tenant = await tenants.findLiveByMobile(mobile);
  if (!tenant || !(await verifyPassword(password, tenant.passwordHash))) {
    throw ApiError.unauthorized('Incorrect mobile number or password. Ask your PG owner if you need your login details.');
  }
  res.json({
    success: true,
    token: signToken({ sub: tenant.id, role: 'tenant' }),
    user: { id: tenant.id, fullName: tenant.fullName, mobile: tenant.mobile, role: 'tenant', pgId: tenant.pgId },
  });
});

// ================= Session =================

export const me = asyncHandler(async (req, res) => {
  const { role, doc, pgId } = req.user;
  const base = { id: req.user.id, role, pgId };
  if (role === 'owner') Object.assign(base, { pgName: doc.pgName, pgUsername: doc.pgUsername, ownerName: doc.ownerName, email: doc.ownerEmail });
  else if (role === 'manager') Object.assign(base, { fullName: doc.fullName, email: doc.email });
  else Object.assign(base, { fullName: doc.fullName, mobile: doc.mobile, email: doc.email });
  res.json({ success: true, user: base });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { role, id, pgId } = req.user;
  const hash = await accounts.getPasswordHash(role, id);
  if (!(await verifyPassword(currentPassword, hash))) throw ApiError.badRequest('Current password is incorrect');
  await accounts.setPassword(role, id, await hashPassword(newPassword));
  recordAudit(pgId, id, 'password.changed', role, id, 'Password changed');
  res.json({ success: true, message: 'Password updated' });
});
