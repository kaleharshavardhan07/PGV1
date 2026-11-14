import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as publicCtl from '../controllers/public.controller.js';
import * as room from '../controllers/room.controller.js';
import * as tenant from '../controllers/tenant.controller.js';
import * as admission from '../controllers/admission.controller.js';
import * as payment from '../controllers/payment.controller.js';
import * as meter from '../controllers/meter.controller.js';
import * as complaint from '../controllers/complaint.controller.js';
import * as food from '../controllers/food.controller.js';
import * as notif from '../controllers/notification.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as subscription from '../controllers/subscription.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import * as context from '../controllers/context.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { requirePg, resolveTenantRecord } from '../middlewares/context.js';
import { validate } from '../middlewares/validate.js';
import * as v from '../validators/index.js';

const router = Router();
const { objectId } = v;

// Owner + manager guard (PG staff)
const staff = [requireAuth, requireRole('owner', 'manager'), requirePg];
// Owner-only guard
const owner = [requireAuth, requireRole('owner'), requirePg];
// Any authenticated user with a PG (tenant included)
const anyRole = [requireAuth, requirePg];
// Tenant guard (resolves their per-PG tenant record)
const tenantGuard = [requireAuth, requireRole('tenant'), requirePg, resolveTenantRecord];

// ---------- Auth ----------
router.post('/auth/owner/register', validate({ body: v.ownerRegisterSchema }), auth.ownerRegister);
router.post('/auth/owner/complete-payment', auth.ownerCompletePayment);
router.post('/auth/owner/activate', validate({ body: v.ownerSetPasswordSchema }), auth.ownerActivate);
router.post('/auth/owner/login', validate({ body: v.ownerLoginSchema }), auth.ownerLogin);
router.post('/auth/owner/reset-password', validate({ body: v.ownerResetSchema }), auth.ownerResetPassword);
router.get('/auth/owner/registration/:id', auth.getPendingRegistration);
router.get('/auth/owner/username-available', auth.usernameAvailable);

router.post('/auth/tenant/register', validate({ body: v.tenantRegisterSchema }), auth.tenantRegister);
router.post('/auth/tenant/otp', validate({ body: v.tenantOtpSchema }), auth.tenantSendOtp);
router.post('/auth/tenant/login', validate({ body: v.tenantLoginSchema }), auth.tenantLogin);

router.post('/auth/manager/login', validate({ body: v.managerLoginSchema }), auth.managerLogin);

router.get('/auth/me', requireAuth, auth.me);
router.get('/me/context', requireAuth, context.context);

// ---------- Public discovery ----------
router.get('/public/pgs', publicCtl.discoverablePgs);
router.get('/public/pg/:username', publicCtl.discover);
router.get('/public/pg/:username/vacancy', publicCtl.vacancyDetail);

// ---------- Dashboard ----------
router.get('/dashboard/summary', ...staff, resolveTenantRecord, dashboard.summary);

// ---------- Rooms & beds ----------
router.get('/rooms', ...anyRole, room.listRooms);
router.post('/rooms', ...owner, validate({ body: v.roomCreateSchema }), room.createRoom);
router.patch('/rooms/:id', ...owner, validate({ params: { id: objectId }, body: v.roomUpdateSchema }), room.updateRoom);
router.delete('/rooms/:id', ...owner, validate({ params: { id: objectId } }), room.deleteRoom);

router.get('/beds', ...anyRole, room.listBeds);
router.patch('/beds/:id', ...staff, validate({ params: { id: objectId }, body: v.bedUpdateSchema }), room.updateBed);
router.get('/vacancy', ...staff, room.vacancySummary);

// ---------- Tenants ----------
router.get('/tenants', ...staff, tenant.listTenants);
router.post('/tenants', ...staff, validate({ body: v.tenantCreateSchema }), tenant.createTenant);
router.get('/tenants/:id', ...staff, validate({ params: { id: objectId } }), tenant.getTenant);
router.patch('/tenants/:id', ...staff, validate({ params: { id: objectId }, body: v.tenantUpdateSchema }), tenant.updateTenant);
router.delete('/tenants/:id', ...owner, validate({ params: { id: objectId } }), tenant.deleteTenant);
router.post('/tenants/:id/notice', ...staff, validate({ params: { id: objectId } }), tenant.markNotice);
router.post('/tenants/:id/move-out', ...staff, validate({ params: { id: objectId } }), tenant.moveOut);
router.post('/tenants/:id/reallocate', ...staff, validate({ params: { id: objectId }, body: v.reallocateSchema }), tenant.reallocateBed);

// ---------- Admissions ----------
router.get('/admissions', ...staff, admission.listAdmissions);
router.get('/admissions/me', requireAuth, requireRole('tenant'), admission.myAdmissions);
router.post('/admissions', requireAuth, requireRole('tenant'), validate({ body: v.admissionCreateSchema }), admission.submitAdmission);
router.patch('/admissions/:id/approve', ...staff, validate({ params: { id: objectId }, body: v.admissionApproveSchema }), admission.approveAdmission);
router.patch('/admissions/:id/reject', ...staff, validate({ params: { id: objectId }, body: v.admissionRejectSchema }), admission.rejectAdmission);

// ---------- Payments ----------
router.get('/payments', ...anyRole, resolveTenantRecord, payment.listPayments);
router.post('/payments/:id/pay', ...anyRole, resolveTenantRecord, validate({ params: { id: objectId }, body: v.paySchema }), payment.payPayment);
router.post('/payments/remind', ...staff, payment.sendRentReminder);
router.get('/payments/outstanding', ...staff, payment.outstandingSummary);

// ---------- Meter readings ----------
router.get('/meter', ...anyRole, resolveTenantRecord, meter.listReadings);
router.post('/meter', ...staff, validate({ body: v.meterReadingSchema }), meter.saveReading);
router.post('/meter/publish', ...staff, meter.publishBills);

// ---------- Complaints ----------
router.get('/complaints', ...anyRole, resolveTenantRecord, complaint.listComplaints);
router.post('/complaints', ...tenantGuard, validate({ body: v.complaintCreateSchema }), complaint.createComplaint);
router.patch('/complaints/:id/status', ...staff, validate({ params: { id: objectId }, body: v.complaintUpdateSchema }), complaint.updateComplaintStatus);

// ---------- Food ----------
router.get('/food/menu', ...anyRole, food.listMenu);
router.post('/food/menu', ...staff, validate({ body: v.foodMenuItemSchema }), food.upsertMenu);
router.get('/food/ratings', ...anyRole, food.listRatings);
router.get('/food/optouts', ...tenantGuard, food.myOptOuts);
router.post('/food/optout', ...tenantGuard, validate({ body: v.mealOptOutSchema }), food.addMealOptOut);
router.delete('/food/optout/:id', ...tenantGuard, validate({ params: { id: objectId } }), food.removeMealOptOut);
router.post('/food/rate', ...tenantGuard, validate({ body: v.foodRatingSchema }), food.rateMeal);

// ---------- Notifications ----------
router.get('/notifications', ...anyRole, resolveTenantRecord, notif.listNotifications);
router.patch('/notifications/:id/read', ...anyRole, resolveTenantRecord, validate({ params: { id: objectId } }), notif.markRead);
router.patch('/notifications/read-all', ...anyRole, resolveTenantRecord, notif.markAllRead);
router.get('/notifications/prefs', ...tenantGuard, notif.getPrefs);
router.put('/notifications/prefs', ...tenantGuard, validate({ body: v.notificationPrefSchema }), notif.updatePrefs);
router.post('/notifications/run', ...staff, notif.runEngine);
router.get('/notifications/log', ...staff, notif.listDeliveryLog);

// ---------- Settings ----------
router.get('/settings', ...anyRole, settings.getSettings);
router.patch('/settings', ...owner, validate({ body: v.settingsUpdateSchema }), settings.updateSettings);
router.get('/reminder-schedule', ...staff, settings.getReminderSchedule);
router.put('/reminder-schedule', ...owner, validate({ body: v.reminderScheduleSchema }), settings.updateReminderSchedule);
router.put('/settings/notification-prefs/:tenantId', ...staff, validate({ params: { tenantId: objectId }, body: v.notificationPrefSchema }), settings.updateTenantNotificationPref);

// ---------- Subscription (owner only) ----------
router.get('/subscription', ...owner, subscription.getSubscription);
router.post('/subscription/checkout', ...owner, validate({ body: v.checkoutSchema }), subscription.checkout);
router.post('/subscription/upgrade', ...owner, validate({ body: { planId: v.planIdSchema } }), subscription.upgradePlan);
router.post('/subscription/cycle', ...owner, validate({ body: v.cycleSchema }), subscription.changeCycle);
router.post('/subscription/renew', ...owner, validate({ body: v.renewSchema }), subscription.renew);
router.post('/subscription/retry', ...owner, validate({ body: v.renewSchema }), subscription.retryPayment);
router.post('/subscription/auto-renew', ...owner, validate({ body: v.autoRenewSchema }), subscription.setAutoRenew);

export default router;
