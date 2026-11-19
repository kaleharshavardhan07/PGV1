import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as accounts from '../repositories/accounts.js';
import * as tenants from '../repositories/tenants.js';
import * as notifications from '../repositories/notifications.js';
import { resolvePermissions } from '../services/access.js';
import { recordAudit } from '../services/auditService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const [config, owner, notificationPrefs] = await Promise.all([
    accounts.getSettings(req.pgId),
    accounts.getOwner(req.pgId),
    req.user.role === 'tenant' ? [] : notifications.listAllPrefs(req.pgId),
  ]);
  const state = accounts.featureState(owner);
  res.json({
    success: true,
    ...config,
    visibility: {
      isDiscoverable: owner.isDiscoverable, showAvailableBeds: owner.showAvailableBeds, contactPublic: owner.contactPublic, pgUsername: owner.pgUsername,
    },
    location: {
      address: owner.address, area: owner.area, city: owner.city, state: owner.state, pinCode: owner.pinCode,
      latitude: owner.latitude, longitude: owner.longitude,
    },
    // `allowed` is controlled by the platform admin, `enabled` by the owner.
    features: state,
    notificationPrefs,
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { isDiscoverable, showAvailableBeds, contactPublic, description, pgType, location, featuresEnabled, ...patch } = req.body;
  await accounts.updateOwnerProfile(req.pgId, { isDiscoverable, showAvailableBeds, contactPublic, description, pgType, location, featuresEnabled });
  const config = await accounts.updateSettings(req.pgId, patch);
  recordAudit(req.pgId, req.user.id, 'settings.updated', 'Settings', req.pgId, 'Updated PG settings');
  res.json({ success: true, settings: config.settings });
});

export const getReminderSchedule = asyncHandler(async (req, res) => {
  res.json({ success: true, reminderSchedule: (await accounts.getSettings(req.pgId)).reminderSchedule });
});

export const updateReminderSchedule = asyncHandler(async (req, res) => {
  const config = await accounts.updateSettings(req.pgId, req.body);
  recordAudit(req.pgId, req.user.id, 'settings.reminders', 'Settings', req.pgId, 'Updated reminder schedule');
  res.json({ success: true, reminderSchedule: config.reminderSchedule });
});

// Staff edit of a single tenant's channel preferences.
export const updateTenantNotificationPref = asyncHandler(async (req, res) => {
  if (!(await tenants.getTenant(req.pgId, req.params.tenantId))) throw ApiError.notFound('Tenant not found');
  res.json({ success: true, prefs: await notifications.setPrefs(req.pgId, req.params.tenantId, req.body) });
});
