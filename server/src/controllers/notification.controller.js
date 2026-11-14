import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Notification, NotificationPref, NotificationLog } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';

const tenantUserIds = (req) => [req.user.id, req.tenantId].filter(Boolean);

export const listNotifications = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const filter = { pg: req.pgId, userRole: role };

  if (role === 'tenant') {
    filter.$or = [{ userId: { $in: tenantUserIds(req) } }, { userId: 'all' }];
  } else {
    filter.userId = { $in: [role === 'manager' ? 'manager' : 'owner', 'all'] };
  }

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, notifications, unread: notifications.filter((n) => !n.read).length });
});

export const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, pg: req.pgId },
    { $set: { read: true } },
    { new: true }
  );
  if (!notif) throw ApiError.notFound('Notification not found');
  res.json({ success: true, notification: notif });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const filter = { pg: req.pgId, userRole: role };
  if (role === 'tenant') {
    filter.$or = [{ userId: { $in: tenantUserIds(req) } }, { userId: 'all' }];
  } else {
    filter.userId = { $in: [role === 'manager' ? 'manager' : 'owner', 'all'] };
  }
  const result = await Notification.updateMany(filter, { $set: { read: true } });
  res.json({ success: true, updated: result.modifiedCount });
});

export const getPrefs = asyncHandler(async (req, res) => {
  const prefs =
    (await NotificationPref.findOne({ pg: req.pgId, tenant: req.tenantId })) ??
    { whatsapp: true, sms: true, email: true };
  res.json({ success: true, prefs });
});

export const updatePrefs = asyncHandler(async (req, res) => {
  const prefs = await NotificationPref.findOneAndUpdate(
    { pg: req.pgId, tenant: req.tenantId },
    { $set: req.body },
    { new: true, upsert: true, runValidators: true }
  );
  recordAudit(req.user.id, 'notif.prefs', 'NotificationPref', prefs.id, 'Updated notification preferences');
  res.json({ success: true, prefs });
});

export const runEngine = asyncHandler(async (req, res) => {
  const result = await runNotificationEngine(req.pgId);
  res.json({ success: true, ...result });
});

export const listDeliveryLog = asyncHandler(async (req, res) => {
  const log = await NotificationLog.find({ pg: req.pgId }).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, log });
});
