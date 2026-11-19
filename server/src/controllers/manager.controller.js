import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as accounts from '../repositories/accounts.js';
import { hashPassword, generatePassword } from '../utils/password.js';
import { resolvePermissions } from '../services/access.js';
import { mail } from '../services/mailService.js';
import { recordAudit } from '../services/auditService.js';

const shape = (m) => ({ ...m, permissions: resolvePermissions('manager', m.permissions) });

export const listManagers = asyncHandler(async (req, res) => {
  res.json({ success: true, managers: (await accounts.listManagers(req.pgId)).map(shape) });
});

// Only the owner creates managers; the temporary password is returned once.
export const createManager = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const temporaryPassword = password ?? generatePassword();
  const manager = await accounts.createManager(req.pgId, { ...data, passwordHash: await hashPassword(temporaryPassword) });
  recordAudit(req.pgId, req.user.id, 'manager.created', 'Manager', manager.id, `Created manager ${manager.fullName}`);
  mail.accountCreated(req.user.doc.ownerEmail, 'Manager', manager.fullName, req.user.doc.pgName);
  res.status(201).json({ success: true, manager: shape(manager), credentials: { email: manager.email, password: temporaryPassword } });
});

export const updateManager = asyncHandler(async (req, res) => {
  const manager = await accounts.updateManager(req.pgId, req.params.id, req.body);
  if (!manager) throw ApiError.notFound('Manager not found');
  recordAudit(req.pgId, req.user.id, 'manager.updated', 'Manager', manager.id, `Updated manager ${manager.fullName}`);
  res.json({ success: true, manager: shape(manager) });
});

export const resetManagerPassword = asyncHandler(async (req, res) => {
  const manager = await accounts.getManagerInPg(req.pgId, req.params.id);
  if (!manager) throw ApiError.notFound('Manager not found');
  const password = req.body.password ?? generatePassword();
  await accounts.setPassword('manager', manager.id, await hashPassword(password));
  recordAudit(req.pgId, req.user.id, 'manager.password_reset', 'Manager', manager.id, `Reset password for ${manager.fullName}`);
  res.json({ success: true, credentials: { email: manager.email, password } });
});

export const deleteManager = asyncHandler(async (req, res) => {
  const manager = await accounts.deleteManager(req.pgId, req.params.id);
  if (!manager) throw ApiError.notFound('Manager not found');
  recordAudit(req.pgId, req.user.id, 'manager.deleted', 'Manager', manager.id, 'Deleted manager');
  res.json({ success: true, message: 'Manager deleted' });
});
