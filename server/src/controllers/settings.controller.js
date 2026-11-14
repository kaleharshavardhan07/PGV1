import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Workspace, NotificationPref, Tenant } from '../models/index.js';
import { ensureWorkspace } from '../services/workspaceService.js';
import { recordAudit } from '../services/auditService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const ws = await ensureWorkspace(req.pgId);
  let notificationPrefs = [];
  if (req.user.role !== 'tenant') {
    const [prefs, tenants] = await Promise.all([
      NotificationPref.find({ pg: req.pgId }),
      Tenant.find({ pg: req.pgId }),
    ]);
    const nameById = new Map(tenants.map((t) => [String(t._id), t.fullName]));
    notificationPrefs = prefs.map((p) => ({
      id: String(p._id),
      tenantId: String(p.tenant),
      tenantName: nameById.get(String(p.tenant)),
      whatsapp: p.whatsapp,
      sms: p.sms,
      email: p.email,
    }));
  }
  res.json({
    success: true,
    settings: ws.settings,
    reminderSchedule: ws.reminderSchedule,
    subscription: ws.subscription,
    notificationPrefs,
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const ws = await ensureWorkspace(req.pgId);
  const update = {};
  for (const [k, v] of Object.entries(req.body)) {
    if (k === 'channels' && v && typeof v === 'object') {
      update['settings.channels'] = { ...ws.settings.channels, ...v };
    } else {
      update[`settings.${k}`] = v;
    }
  }
  const updated = await Workspace.findByIdAndUpdate(ws._id, { $set: update }, { new: true, runValidators: true });
  recordAudit(req.user.id, 'settings.updated', 'Settings', String(updated.pg), 'Updated PG settings');
  res.json({ success: true, settings: updated.settings });
});

export const getReminderSchedule = asyncHandler(async (req, res) => {
  const ws = await ensureWorkspace(req.pgId);
  res.json({ success: true, reminderSchedule: ws.reminderSchedule });
});

export const updateReminderSchedule = asyncHandler(async (req, res) => {
  const ws = await ensureWorkspace(req.pgId);
  const update = {};
  for (const [k, v] of Object.entries(req.body)) update[`reminderSchedule.${k}`] = v;
  const updated = await Workspace.findByIdAndUpdate(ws._id, { $set: update }, { new: true, runValidators: true });
  recordAudit(req.user.id, 'settings.reminderSchedule', 'ReminderSchedule', String(updated.pg), 'Updated reminder schedule');
  res.json({ success: true, reminderSchedule: updated.reminderSchedule });
});

// Staff-side edit of a single tenant's channel preferences.
export const updateTenantNotificationPref = asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const tenant = await Tenant.findOne({ _id: tenantId, pg: req.pgId });
  if (!tenant) throw ApiError.notFound('Tenant not found');

  const prefs = await NotificationPref.findOneAndUpdate(
    { pg: req.pgId, tenant: tenantId },
    { $set: req.body },
    { new: true, upsert: true, runValidators: true }
  );
  recordAudit(req.user.id, 'notif.prefs', 'NotificationPref', String(tenantId), 'Updated tenant notification preferences');
  res.json({
    success: true,
    prefs: { tenantId: String(prefs.tenant), whatsapp: prefs.whatsapp, sms: prefs.sms, email: prefs.email },
  });
});
