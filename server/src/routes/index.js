import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as publicCtl from '../controllers/public.controller.js';
import * as room from '../controllers/room.controller.js';
import * as tenant from '../controllers/tenant.controller.js';
import * as documents from '../controllers/document.controller.js';
import * as meter from '../controllers/meter.controller.js';
import * as complaint from '../controllers/complaint.controller.js';
import * as food from '../controllers/food.controller.js';
import * as notif from '../controllers/notification.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middlewares/auth.js';
import { requirePg } from '../middlewares/context.js';
import { validate } from '../middlewares/validate.js';
import { uploadSingle } from '../middlewares/upload.js';
import * as v from '../validators/index.js';

const router = Router();
const { uuid } = v;
const id = { id: uuid };

// Guards. `requireAuth` also resolves req.tenantId for tenant principals.
const staff = [requireAuth, requireRole('owner', 'manager'), requirePg];
const owner = [requireAuth, requireRole('owner'), requirePg];
const anyRole = [requireAuth, requirePg];
const tenantOnly = [requireAuth, requireRole('tenant'), requirePg];

// ---------- Auth ----------
router.post('/auth/owner/register', validate({ body: v.ownerRegisterSchema }), auth.ownerRegister);
router.post('/auth/owner/login', validate({ body: v.ownerLoginSchema }), auth.ownerLogin);
router.get('/auth/owner/username-available', auth.usernameAvailable);
router.post('/auth/manager/login', validate({ body: v.managerLoginSchema }), auth.managerLogin);
router.post('/auth/tenant/login', validate({ body: v.tenantLoginSchema }), auth.tenantLogin);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/change-password', requireAuth, validate({ body: v.changePasswordSchema }), auth.changePassword);
router.get('/me/context', ...anyRole, dashboard.context);

// ---------- Public discovery ----------
router.get('/public/pgs', publicCtl.discoverablePgs);
router.get('/public/pg/:username', publicCtl.discover);
router.get('/public/pg/:username/vacancy', publicCtl.vacancyDetail);

// ---------- Dashboard ----------
router.get('/dashboard/summary', ...staff, dashboard.summary);

// ---------- Rooms & beds (owner manages; manager has read access) ----------
router.get('/rooms', ...anyRole, room.listRooms);
router.post('/rooms', ...owner, validate({ body: v.roomCreateSchema }), room.createRoom);
router.get('/rooms/:id', ...anyRole, validate({ params: id }), room.getRoom);
router.patch('/rooms/:id', ...owner, validate({ params: id, body: v.roomUpdateSchema }), room.updateRoom);
router.delete('/rooms/:id', ...owner, validate({ params: id }), room.deleteRoom);
router.post('/rooms/:roomId/beds', ...owner, validate({ params: { roomId: uuid }, body: v.bedCreateSchema }), room.addBed);

router.get('/beds', ...anyRole, room.listBeds);
router.patch('/beds/:id', ...owner, validate({ params: id, body: v.bedUpdateSchema }), room.updateBed);
router.delete('/beds/:id', ...owner, validate({ params: id }), room.deleteBed);
router.get('/vacancy', ...staff, room.vacancySummary);

// ---------- Tenants (accounts are created by staff) ----------
router.get('/tenants', ...staff, tenant.listTenants);
router.post('/tenants', ...staff, validate({ body: v.tenantCreateSchema }), tenant.createTenant);
router.get('/tenants/:id', ...staff, validate({ params: id }), tenant.getTenant);
router.patch('/tenants/:id', ...staff, validate({ params: id, body: v.tenantUpdateSchema }), tenant.updateTenant);
router.delete('/tenants/:id', ...owner, validate({ params: id }), tenant.deleteTenant);
router.post('/tenants/:id/reset-password', ...staff, validate({ params: id, body: v.tenantPasswordSchema }), tenant.resetPassword);
router.post('/tenants/:id/notice', ...staff, validate({ params: id }), tenant.markNotice);
router.post('/tenants/:id/move-out', ...staff, validate({ params: id }), tenant.moveOut);
router.post('/tenants/:id/reallocate', ...staff, validate({ params: id, body: v.reallocateSchema }), tenant.reallocateBed);

// ---------- Documents ----------
router.get('/documents', ...anyRole, documents.listDocuments);
router.post('/documents', ...anyRole, uploadSingle, validate({ body: v.documentUploadSchema }), documents.uploadDocument);
router.post('/documents/:id/link', ...anyRole, validate({ params: id }), documents.createLink);
// Authenticated by bearer token OR a short-lived link token (so <img>/<a> can load it).
router.get('/documents/:id/file', optionalAuth, validate({ params: id }), documents.streamFile);
router.delete('/documents/:id', ...anyRole, validate({ params: id }), documents.deleteDocument);

// ---------- Meter readings ----------
router.get('/meter', ...anyRole, meter.listReadings);
router.post('/meter', ...staff, validate({ body: v.meterReadingSchema }), meter.saveReading);
router.post('/meter/publish', ...staff, validate({ body: v.meterPublishSchema }), meter.publishBills);

// ---------- Complaints ----------
router.get('/complaints', ...anyRole, complaint.listComplaints);
router.post('/complaints', ...tenantOnly, validate({ body: v.complaintCreateSchema }), complaint.createComplaint);
router.patch('/complaints/:id/status', ...staff, validate({ params: id, body: v.complaintUpdateSchema }), complaint.updateComplaintStatus);

// ---------- Food ----------
router.get('/food/menu', ...anyRole, food.listMenu);
router.post('/food/menu', ...staff, validate({ body: v.foodMenuItemSchema }), food.upsertMenu);
router.get('/food/ratings', ...anyRole, food.listRatings);
router.get('/food/optouts', ...tenantOnly, food.myOptOuts);
router.post('/food/optout', ...tenantOnly, validate({ body: v.mealOptOutSchema }), food.addMealOptOut);
router.delete('/food/optout/:id', ...tenantOnly, validate({ params: id }), food.removeMealOptOut);
router.post('/food/rate', ...tenantOnly, validate({ body: v.foodRatingSchema }), food.rateMeal);

// ---------- Notifications ----------
router.get('/notifications', ...anyRole, notif.listNotifications);
router.patch('/notifications/read-all', ...anyRole, notif.markAllRead);
router.patch('/notifications/:id/read', ...anyRole, validate({ params: id }), notif.markRead);
router.get('/notifications/prefs', ...tenantOnly, notif.getPrefs);
router.put('/notifications/prefs', ...tenantOnly, validate({ body: v.notificationPrefSchema }), notif.updatePrefs);
router.post('/notifications/run', ...staff, notif.runEngine);
router.get('/notifications/log', ...staff, notif.listDeliveryLog);

// ---------- Settings ----------
router.get('/settings', ...anyRole, settings.getSettings);
router.patch('/settings', ...owner, validate({ body: v.settingsUpdateSchema }), settings.updateSettings);
router.get('/reminder-schedule', ...staff, settings.getReminderSchedule);
router.put('/reminder-schedule', ...owner, validate({ body: v.reminderScheduleSchema }), settings.updateReminderSchedule);
router.put('/settings/notification-prefs/:tenantId', ...staff, validate({ params: { tenantId: uuid }, body: v.notificationPrefSchema }), settings.updateTenantNotificationPref);

export default router;
