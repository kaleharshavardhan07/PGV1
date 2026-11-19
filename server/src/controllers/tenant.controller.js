import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as tenants from '../repositories/tenants.js';
import * as accounts from '../repositories/accounts.js';
import { hashPassword, generatePassword } from '../utils/password.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { mail } from '../services/mailService.js';
import { getOwner } from '../repositories/accounts.js';

const mustGet = async (pgId, id) => {
  const tenant = await tenants.getTenant(pgId, id);
  if (!tenant) throw ApiError.notFound('Tenant not found');
  return tenant;
};

export const listTenants = asyncHandler(async (req, res) => {
  const { status, room, search } = req.query;
  res.json({ success: true, tenants: await tenants.listTenants({ pgId: req.pgId, status, roomId: room, search }) });
});

export const getTenant = asyncHandler(async (req, res) => {
  res.json({ success: true, tenant: await mustGet(req.pgId, req.params.id) });
});

// Owner/manager creates the tenant account. The temporary password is returned once
// so it can be handed to the tenant; only its hash is stored.
export const createTenant = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const temporaryPassword = password ?? generatePassword();
  const id = await tenants.createTenant(req.pgId, data, {
    passwordHash: await hashPassword(temporaryPassword),
    createdBy: req.user.id,
  });
  const tenant = await tenants.getTenant(req.pgId, id);
  recordAudit(req.pgId, req.user.id, 'tenant.created', 'Tenant', id, `Created account for ${tenant.fullName} in Room ${tenant.roomNumber}`);
  await runNotificationEngine(req.pgId);
  getOwner(req.pgId).then((o) => mail.accountCreated(o.ownerEmail, 'Tenant', tenant.fullName, o.pgName)).catch(() => {});
  res.status(201).json({ success: true, tenant, credentials: { mobile: tenant.mobile, password: temporaryPassword } });
});

export const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await tenants.updateTenant(req.pgId, req.params.id, req.body);
  if (!tenant) throw ApiError.notFound('Tenant not found');
  recordAudit(req.pgId, req.user.id, 'tenant.updated', 'Tenant', tenant.id, `Updated ${tenant.fullName}`);
  res.json({ success: true, tenant });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const tenant = await mustGet(req.pgId, req.params.id);
  if (tenant.status === 'Left') throw ApiError.badRequest('This tenant has moved out and cannot sign in');
  const password = req.body.password ?? generatePassword();
  await accounts.setPassword('tenant', tenant.id, await hashPassword(password));
  recordAudit(req.pgId, req.user.id, 'tenant.password_reset', 'Tenant', tenant.id, `Reset password for ${tenant.fullName}`);
  res.json({ success: true, credentials: { mobile: tenant.mobile, password } });
});

export const deleteTenant = asyncHandler(async (req, res) => {
  const tenant = await tenants.deleteTenant(req.pgId, req.params.id);
  if (!tenant) throw ApiError.notFound('Tenant not found');
  recordAudit(req.pgId, req.user.id, 'tenant.deleted', 'Tenant', tenant.id, `Deleted ${tenant.fullName}`);
  res.json({ success: true, message: 'Tenant deleted' });
});

export const markNotice = asyncHandler(async (req, res) => {
  const tenant = await tenants.markNotice(req.pgId, req.params.id);
  if (!tenant) throw ApiError.badRequest('Only active tenants can be put on notice');
  recordAudit(req.pgId, req.user.id, 'tenant.notice', 'Tenant', tenant.id, `Marked ${tenant.fullName} on notice period`);
  res.json({ success: true, tenant });
});

export const moveOut = asyncHandler(async (req, res) => {
  if (!(await tenants.moveOut(req.pgId, req.params.id))) throw ApiError.notFound('Tenant not found');
  const tenant = await mustGet(req.pgId, req.params.id);
  recordAudit(req.pgId, req.user.id, 'tenant.moveout', 'Tenant', tenant.id, `Moved out ${tenant.fullName}`);
  res.json({ success: true, tenant });
});

export const reallocateBed = asyncHandler(async (req, res) => {
  await tenants.reallocate(req.pgId, req.params.id, req.body.bedId);
  const tenant = await mustGet(req.pgId, req.params.id);
  recordAudit(req.pgId, req.user.id, 'tenant.reallocate', 'Tenant', tenant.id, `Moved ${tenant.fullName} to Room ${tenant.roomNumber} bed ${tenant.bedNumber}`);
  res.json({ success: true, tenant });
});
