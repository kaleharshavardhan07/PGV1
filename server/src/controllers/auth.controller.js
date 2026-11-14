import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  PgAccount,
  TenantUser,
  Manager,
  PendingRegistration,
  Membership,
} from '../models/index.js';
import { signToken } from '../services/tokenService.js';
import { createOrder, simulateGatewayCallback, verifyCallback } from '../services/paymentGateway.js';
import { ensureWorkspace } from '../services/workspaceService.js';
import { getPlan } from '../constants/plans.js';
import { generateUsernameSuggestions, usernameError, normalizeUsername } from '../services/pgPlatform.js';
import { nextRequestId } from '../utils/ids.js';

const hash = (pw) => bcrypt.hash(pw, 10);

const tenantTokenPayload = async (user) => {
  // Attach the active membership's PG (if any) to the token.
  const membership = await Membership.findOne({ tenantUser: user._id, status: 'Active' }).sort({ createdAt: -1 }).lean();
  return {
    sub: String(user._id),
    role: 'tenant',
    pgId: membership ? String(membership.pg) : null,
  };
};

const publicUser = (u) => ({
  id: String(u._id),
  fullName: u.fullName,
  mobile: u.mobile,
  email: u.email,
  gender: u.gender,
});

/** Build a tenant auth response, always including role + resolved PG. */
const tenantAuthResponse = async (user) => {
  const payload = await tenantTokenPayload(user);
  return {
    success: true,
    token: signToken(payload),
    user: { ...publicUser(user), role: 'tenant', pgId: payload.pgId ?? null },
  };
};

// ================= Owner onboarding =================

// Step 1: register intent + create a simulated payment order.
export const ownerRegister = asyncHandler(async (req, res) => {
  const { owner, pg, planId, cycle } = req.body;

  if (await PgAccount.exists({ ownerEmail: owner.email })) {
    throw ApiError.conflict('An account with this email already exists. Please log in instead.');
  }
  if (await PgAccount.exists({ ownerMobile: owner.mobile })) {
    throw ApiError.conflict('An account with this mobile number already exists. Please log in instead.');
  }
  if (await PendingRegistration.exists({ 'owner.email': owner.email, status: { $nin: ['Active', 'Payment Verified'] } })) {
    throw ApiError.conflict('A registration is already in progress for this email.');
  }

  const plan = getPlan(planId);
  const amount = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const suggestedUsernames = await generateUsernameSuggestions(pg.pgName);

  const registration = await PendingRegistration.create({
    owner,
    pg,
    planId,
    cycle,
    amount,
    status: 'Awaiting Payment',
    suggestedUsernames,
    processedCallbacks: [],
  });

  const order = createOrder(amount, 'UPI');

  res.status(201).json({
    success: true,
    registration: { id: registration.id, status: registration.status, amount, planId, cycle },
    suggestedUsernames,
    order,
  });
});

// Step 2: simulate the gateway callback and verify it before creating the PG account.
export const ownerCompletePayment = asyncHandler(async (req, res) => {
  const { registrationId, orderId, outcome = 'success' } = req.body;

  const reg = await PendingRegistration.findById(registrationId);
  if (!reg) throw ApiError.notFound('Registration not found');

  const order = { orderId: orderId || reg.orderId || `ord_${Date.now().toString(36)}`, amount: reg.amount, method: 'UPI' };
  const callback = simulateGatewayCallback(order, outcome);
  const verification = verifyCallback(callback, reg.processedCallbacks);

  if (!verification.verified) {
    reg.status = 'Payment Failed';
    await reg.save();
    throw ApiError.badRequest(verification.reason || 'Payment verification failed');
  }

  // Create the PG account (inactive until username + password are set).
  const pg = await PgAccount.create({
    pgName: reg.pg.pgName,
    description: reg.pg.description,
    address: reg.pg.address,
    city: reg.pg.city,
    state: reg.pg.state,
    pinCode: reg.pg.pinCode,
    pgType: reg.pg.pgType,
    ownerName: reg.owner.fullName,
    ownerEmail: reg.owner.email,
    ownerMobile: reg.owner.mobile,
    subscriptionPlanId: reg.planId,
    isActive: false,
    passwordHash: null,
  });

  await ensureWorkspace(pg._id, { pgName: pg.pgName, ownerName: pg.ownerName });

  reg.status = 'Payment Verified';
  reg.pgId = pg._id;
  reg.orderId = callback.orderId;
  reg.processedCallbacks.push(callback.paymentId);
  reg.suggestedUsernames = await generateUsernameSuggestions(reg.pg.pgName, reg.suggestedUsernames);
  await reg.save();

  res.json({
    success: true,
    registrationId: reg.id,
    status: reg.status,
    pgId: String(pg._id),
    suggestedUsernames: reg.suggestedUsernames,
  });
});

// Step 3: confirm a username and set the owner password â†’ activate the account.
export const ownerActivate = asyncHandler(async (req, res) => {
  const { registrationId, pgUsername, password } = req.body;

  const reg = await PendingRegistration.findById(registrationId);
  if (!reg || !reg.pgId) throw ApiError.notFound('Complete the payment first');

  const err = usernameError(pgUsername);
  if (err) throw ApiError.badRequest(err);

  const pg = await PgAccount.findById(reg.pgId);
  if (!pg) throw ApiError.notFound('PG account not found');

  const existing = await PgAccount.findOne({ pgUsername: normalizeUsername(pgUsername), _id: { $ne: pg._id } });
  if (existing) throw ApiError.conflict('This username is already taken');

  pg.pgUsername = normalizeUsername(pgUsername);
  pg.passwordHash = await hash(password);
  pg.isActive = true;
  await pg.save();

  reg.status = 'Active';
  reg.pgUsername = pg.pgUsername;
  await reg.save();

  res.json({
    success: true,
    token: signToken({ sub: String(pg._id), role: 'owner', pgId: String(pg._id) }),
    user: {
      id: pg.id,
      pgName: pg.pgName,
      pgUsername: pg.pgUsername,
      ownerName: pg.ownerName,
      role: 'owner',
      pgId: String(pg._id),
    },
  });
});

// ================= Owner login =================

export const ownerLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const q = identifier.includes('@') ? { ownerEmail: identifier.toLowerCase() } : { pgUsername: normalizeUsername(identifier) };

  const pg = await PgAccount.findOne(q);
  if (!pg || !pg.passwordHash) throw ApiError.unauthorized('No PG account found with this identifier');

  const ok = await bcrypt.compare(password, pg.passwordHash);
  if (!ok) throw ApiError.unauthorized('Incorrect password');
  if (!pg.isActive) throw ApiError.forbidden('Account setup incomplete. Complete your PG setup first.');

  res.json({
    success: true,
    token: signToken({ sub: String(pg._id), role: 'owner', pgId: String(pg._id) }),
    user: {
      id: pg.id,
      pgName: pg.pgName,
      pgUsername: pg.pgUsername,
      ownerName: pg.ownerName,
      role: 'owner',
      pgId: String(pg._id),
    },
  });
});

// Demo password reset (in production: emailed/SMS OTP via the notification service).
export const ownerResetPassword = asyncHandler(async (req, res) => {
  const { identifier, code, newPassword } = req.body;

  const q = identifier.includes('@') ? { ownerEmail: identifier.toLowerCase() } : { pgUsername: normalizeUsername(identifier) };
  const pg = await PgAccount.findOne(q);
  if (!pg) throw ApiError.notFound('No PG account found with this identifier');

  if (code !== (env.demoOtp || '123456')) throw ApiError.badRequest(`Invalid reset code. Use the demo code ${env.demoOtp || '123456'}.`);

  pg.passwordHash = await hash(newPassword);
  await pg.save();

  res.json({ success: true, message: 'Password reset successfully' });
});

// ================= Tenant auth =================

export const tenantRegister = asyncHandler(async (req, res) => {
  const { fullName, mobile, email, gender, password } = req.body;

  if (await TenantUser.exists({ mobile })) {
    throw ApiError.conflict('An account with this mobile number already exists. Please log in.');
  }

  const user = await TenantUser.create({
    fullName,
    mobile,
    email: email || '',
    gender,
    passwordHash: password ? await hash(password) : null,
  });

  res.status(201).json(await tenantAuthResponse(user));
});

export const tenantSendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const user = await TenantUser.findOne({ mobile });
  if (!user) throw ApiError.notFound('No tenant account found with this mobile number. Create an account first.');

  // Simulated OTP: returned directly in development only.
  res.json({
    success: true,
    message: 'OTP sent (simulated)',
    ...(env.nodeEnv !== 'production' ? { demoOtp: env.demoOtp } : {}),
  });
});

export const tenantLogin = asyncHandler(async (req, res) => {
  const { mobile, password, otp } = req.body;
  const user = await TenantUser.findOne({ mobile });
  if (!user) throw ApiError.unauthorized('No tenant account found with this mobile number');

  let ok = false;
  if (otp) {
    ok = otp === env.demoOtp;
  } else if (password && user.passwordHash) {
    ok = await bcrypt.compare(password, user.passwordHash);
  }
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  res.json(await tenantAuthResponse(user));
});

// ================= Manager auth =================

export const managerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const manager = await Manager.findOne({ email: email.toLowerCase() });
  if (!manager) throw ApiError.unauthorized('No manager account found with this email');

  const ok = await bcrypt.compare(password, manager.passwordHash);
  if (!ok) throw ApiError.unauthorized('Incorrect password');

  res.json({
    success: true,
    token: signToken({ sub: String(manager._id), role: 'manager', pgId: String(manager.pg) }),
    user: { id: manager.id, fullName: manager.fullName, email: manager.email, role: 'manager', pgId: String(manager.pg) },  });
});

// Resume an in-progress owner registration (survives a page refresh).
export const getPendingRegistration = asyncHandler(async (req, res) => {
  const reg = await PendingRegistration.findById(req.params.id);
  if (!reg) throw ApiError.notFound('Registration not found');
  res.json({
    success: true,
    registration: {
      id: reg.id,
      status: reg.status,
      amount: reg.amount,
      planId: reg.planId,
      cycle: reg.cycle,
      owner: reg.owner,
      pg: reg.pg,
      pgId: reg.pgId,
      pgUsername: reg.pgUsername,
      suggestedUsernames: reg.suggestedUsernames,
      orderId: reg.orderId,
    },
  });
});

// Live availability check for the "choose your PG username" step.
export const usernameAvailable = asyncHandler(async (req, res) => {
  const raw = String(req.query.username ?? '');
  const err = usernameError(raw);
  if (err) return res.json({ success: true, available: false, error: err, suggestions: [] });

  const taken = await PgAccount.exists({ pgUsername: normalizeUsername(raw) });
  res.json({
    success: true,
    available: !taken,
    error: taken ? 'This username is already taken' : null,
    suggestions: taken ? await generateUsernameSuggestions(raw) : [],
  });
});

// ================= Me =================
export const me = asyncHandler(async (req, res) => {
  const { role, doc, pgId } = req.user;
  const base = { id: String(doc._id), role, pgId };

  if (role === 'owner') {
    base.pgName = doc.pgName;
    base.pgUsername = doc.pgUsername;
    base.ownerName = doc.ownerName;
    base.email = doc.ownerEmail;
  } else if (role === 'manager') {
    base.fullName = doc.fullName;
    base.email = doc.email;
  } else if (role === 'tenant') {
    base.fullName = doc.fullName;
    base.mobile = doc.mobile;
    base.email = doc.email;
    base.gender = doc.gender;
  }

  res.json({ success: true, user: base });
});

export { nextRequestId };

