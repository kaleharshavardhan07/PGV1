import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as repo from '../repositories/notifications.js';
import { runNotificationEngine } from '../services/notificationEngine.js';

const scope = (req) => ({ pgId: req.pgId, role: req.user.role, tenantId: req.tenantId });

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await repo.listFor(scope(req));
  res.json({ success: true, notifications, unread: notifications.filter((n) => !n.read).length });
});

export const markRead = asyncHandler(async (req, res) => {
  const { pgId, role, tenantId } = scope(req);
  if (!(await repo.markRead(pgId, role, tenantId, req.params.id))) throw ApiError.notFound('Notification not found');
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  res.json({ success: true, updated: await repo.markAllRead(scope(req)) });
});

export const getPrefs = asyncHandler(async (req, res) => {
  res.json({ success: true, prefs: await repo.getPrefs(req.pgId, req.tenantId) });
});

export const updatePrefs = asyncHandler(async (req, res) => {
  res.json({ success: true, prefs: await repo.setPrefs(req.pgId, req.tenantId, req.body) });
});

export const runEngine = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await runNotificationEngine(req.pgId)) });
});

export const listDeliveryLog = asyncHandler(async (req, res) => {
  res.json({ success: true, log: await repo.listLog(req.pgId) });
});
