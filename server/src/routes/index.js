import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as publicCtl from '../controllers/public.controller.js';
import * as room from '../controllers/room.controller.js';
import * as tenant from '../controllers/tenant.controller.js';
import * as manager from '../controllers/manager.controller.js';
import * as documents from '../controllers/document.controller.js';
import * as expense from '../controllers/expense.controller.js';
import * as invoice from '../controllers/invoice.controller.js';
import * as enquiry from '../controllers/enquiry.controller.js';
import * as exportCtl from '../controllers/export.controller.js';
import * as complaint from '../controllers/complaint.controller.js';
import * as food from '../controllers/food.controller.js';
import * as notif from '../controllers/notification.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middlewares/auth.js';
import { requirePg } from '../middlewares/context.js';
import { requireFeature, staffGuard, ownerGuard, memberGuard, adminGuard } from '../middlewares/access.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';
import { uploadSingle, uploadRegistrationPhotos, parseOwnerRegistration } from '../middlewares/upload.js';
import * as v from '../validators/index.js';

const router = Router();
const { uuid } = v;
const id = { id: uuid };

// ---------------------------------------------------------------------------
// Guards (all checked server-side; the UI hiding a button is never the control):
//   staffGuard(permission, feature)  owner, or a manager holding `permission`, with `feature` on
//   ownerGuard(feature)              owner only
//   memberGuard(permission, feature) owner / manager / tenant; staff need the permission
//   adminGuard                       platform admin
// Tenant-scoped data is always filtered by req.tenantId inside the controllers.
// ---------------------------------------------------------------------------
const anyMember = memberGuard();
const tenantOnly = (feature) => [requireAuth, requireRole('tenant'), requirePg, ...(feature ? [requireFeature(feature)] : [])];

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many login attempts. Try again in a few minutes.' });
const enquiryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, message: 'Too many enquiries from this network. Please try again later.' });

// ---------- Auth ----------
router.post('/auth/owner/register', loginLimiter, uploadRegistrationPhotos, parseOwnerRegistration, validate({ body: v.ownerRegisterSchema }), auth.ownerRegister);
router.post('/auth/owner/login', loginLimiter, validate({ body: v.ownerLoginSchema }), auth.ownerLogin);
router.get('/auth/owner/username-available', auth.usernameAvailable);
router.post('/auth/manager/login', loginLimiter, validate({ body: v.managerLoginSchema }), auth.managerLogin);
router.post('/auth/tenant/login', loginLimiter, validate({ body: v.tenantLoginSchema }), auth.tenantLogin);
router.post('/auth/admin/login', loginLimiter, validate({ body: v.adminLoginSchema }), admin.adminLogin);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/change-password', requireAuth, validate({ body: v.changePasswordSchema }), auth.changePassword);
router.get('/me/context', requireAuth, dashboard.context);

// ---------- Platform admin ----------
router.get('/admin/overview', ...adminGuard, admin.overview);
router.get('/admin/pgs', ...adminGuard, admin.listPgs);
router.patch('/admin/pgs/:id', ...adminGuard, validate({ params: id, body: v.adminPgUpdateSchema }), admin.updatePg);

// ---------- Find PG (public) ----------
router.get('/public/pgs', validate({ query: v.pgSearchSchema }), publicCtl.searchPgs);
router.get('/public/locations', publicCtl.locations);
router.get('/public/pg/:username', publicCtl.pgDetail);
router.get('/public/pg/:username/photos/:id', publicCtl.photo);
router.post('/public/pg/:username/enquiries', enquiryLimiter, validate({ body: v.enquirySchema }), publicCtl.createEnquiry);

// ---------- Dashboard ----------
router.get('/dashboard/summary', ...anyMember, dashboard.summary);

// ---------- Rooms & beds ----------
// Reads stay available to every member (tenant allocation needs them); changes need the rooms module.
router.get('/rooms', ...anyMember, room.listRooms);
router.get('/rooms/:id', ...anyMember, validate({ params: id }), room.getRoom);
router.post('/rooms', ...staffGuard('rooms'), validate({ body: v.roomCreateSchema }), room.createRoom);
router.post('/rooms/bulk', ...staffGuard('rooms'), validate({ body: v.roomBulkSchema }), room.createRoomsBulk);
router.patch('/rooms/:id', ...staffGuard('rooms'), validate({ params: id, body: v.roomUpdateSchema }), room.updateRoom);
router.delete('/rooms/:id', ...staffGuard('rooms'), validate({ params: id }), room.deleteRoom);
router.post('/rooms/:roomId/beds', ...staffGuard('rooms'), validate({ params: { roomId: uuid }, body: v.bedCreateSchema }), room.addBed);
router.get('/beds', ...anyMember, room.listBeds);
router.patch('/beds/:id', ...staffGuard('rooms'), validate({ params: id, body: v.bedUpdateSchema }), room.updateBed);
router.delete('/beds/:id', ...staffGuard('rooms'), validate({ params: id }), room.deleteBed);
router.get('/vacancy', ...staffGuard(), room.vacancySummary);

// ---------- Managers (owner only) ----------
router.get('/managers', ...ownerGuard(), manager.listManagers);
router.post('/managers', ...ownerGuard(), validate({ body: v.managerCreateSchema }), manager.createManager);
router.patch('/managers/:id', ...ownerGuard(), validate({ params: id, body: v.managerUpdateSchema }), manager.updateManager);
router.post('/managers/:id/reset-password', ...ownerGuard(), validate({ params: id, body: v.tenantPasswordSchema }), manager.resetManagerPassword);
router.delete('/managers/:id', ...ownerGuard(), validate({ params: id }), manager.deleteManager);

// ---------- Tenants (accounts are created by staff) ----------
router.get('/tenants', ...staffGuard('tenants'), tenant.listTenants);
router.post('/tenants', ...staffGuard('tenants'), validate({ body: v.tenantCreateSchema }), tenant.createTenant);
router.get('/tenants/:id', ...staffGuard('tenants'), validate({ params: id }), tenant.getTenant);
router.patch('/tenants/:id', ...staffGuard('tenants'), validate({ params: id, body: v.tenantUpdateSchema }), tenant.updateTenant);
router.delete('/tenants/:id', ...ownerGuard(), validate({ params: id }), tenant.deleteTenant);
router.post('/tenants/:id/reset-password', ...staffGuard('tenants'), validate({ params: id, body: v.tenantPasswordSchema }), tenant.resetPassword);
router.post('/tenants/:id/notice', ...staffGuard('tenants'), validate({ params: id }), tenant.markNotice);
router.post('/tenants/:id/move-out', ...staffGuard('tenants'), validate({ params: id }), tenant.moveOut);
router.post('/tenants/:id/reallocate', ...staffGuard('tenants'), validate({ params: id, body: v.reallocateSchema }), tenant.reallocateBed);

// ---------- Documents (per-target permission + feature checks live in the controller) ----------
router.get('/documents', ...anyMember, documents.listDocuments);
router.post('/documents', ...anyMember, uploadSingle, validate({ body: v.documentUploadSchema }), documents.uploadDocument);
router.post('/documents/:id/link', ...anyMember, validate({ params: id }), documents.createLink);
// Authenticated by bearer token OR a short-lived link token (so <img>/<a> can load it).
router.get('/documents/:id/file', optionalAuth, validate({ params: id }), documents.streamFile);
router.delete('/documents/:id', ...anyMember, validate({ params: id }), documents.deleteDocument);

// ---------- Expenses ----------
router.get('/expenses', ...memberGuard('expenses'), expense.listExpenses);
router.get('/expenses/:id', ...memberGuard('expenses'), validate({ params: id }), expense.getExpense);
router.post('/expenses', ...staffGuard('expenses'), validate({ body: v.expenseCreateSchema }), expense.createExpense);
router.patch('/expenses/:id', ...staffGuard('expenses'), validate({ params: id, body: v.expenseUpdateSchema }), expense.updateExpense);
router.delete('/expenses/:id', ...staffGuard('expenses'), validate({ params: id }), expense.deleteExpense);

// ---------- Billing & invoices (records only: there is no online payment) ----------
router.get('/invoices', ...memberGuard('billing'), invoice.listInvoices);
router.get('/invoices/:id', ...memberGuard('billing'), validate({ params: id }), invoice.getInvoice);
router.post('/invoices', ...staffGuard('billing'), validate({ body: v.invoiceCreateSchema }), invoice.createInvoices);
router.patch('/invoices/:id', ...staffGuard('billing'), validate({ params: id, body: v.invoiceUpdateSchema }), invoice.updateInvoice);
router.post('/invoices/:id/issue', ...staffGuard('billing'), validate({ params: id }), invoice.transition('issue', 'Only draft invoices can be issued'));
router.post('/invoices/:id/mark-paid', ...staffGuard('billing'), validate({ params: id, body: v.invoicePaidSchema }), invoice.transition('paid', 'Only issued invoices can be marked paid'));
router.post('/invoices/:id/reopen', ...staffGuard('billing'), validate({ params: id }), invoice.transition('reopen', 'Only paid invoices can be reopened'));
router.post('/invoices/:id/cancel', ...staffGuard('billing'), validate({ params: id }), invoice.transition('cancel', 'Only draft or issued invoices can be cancelled'));
router.delete('/invoices/:id', ...staffGuard('billing'), validate({ params: id }), invoice.deleteInvoice);

// ---------- Complaints ----------
router.get('/complaints', ...memberGuard('complaints'), complaint.listComplaints);
router.post('/complaints', ...tenantOnly('complaints'), validate({ body: v.complaintCreateSchema }), complaint.createComplaint);
router.patch('/complaints/:id/status', ...staffGuard('complaints'), validate({ params: id, body: v.complaintUpdateSchema }), complaint.updateComplaintStatus);

// ---------- Food / mess ----------
router.get('/food/menu', ...memberGuard('food'), food.listMenu);
router.post('/food/menu', ...staffGuard('food'), validate({ body: v.foodMenuItemSchema }), food.upsertMenu);
router.delete('/food/menu/:id', ...staffGuard('food'), validate({ params: id }), food.deleteMenu);
router.get('/food/ratings', ...memberGuard('food'), food.listRatings);
router.get('/food/optouts', ...tenantOnly('food'), food.myOptOuts);
router.post('/food/optout', ...tenantOnly('food'), validate({ body: v.mealOptOutSchema }), food.addMealOptOut);
router.delete('/food/optout/:id', ...tenantOnly('food'), validate({ params: id }), food.removeMealOptOut);
router.post('/food/rate', ...tenantOnly('food'), validate({ body: v.foodRatingSchema }), food.rateMeal);

// ---------- Enquiries from Find PG (owner) ----------
router.get('/enquiries', ...ownerGuard(), enquiry.listEnquiries);
router.patch('/enquiries/:id', ...ownerGuard(), validate({ params: id, body: v.enquiryStatusSchema }), enquiry.updateEnquiry);

// ---------- Exports ----------
router.get('/export/:dataset', ...staffGuard('exports'), validate({ query: v.exportQuerySchema }), exportCtl.exportDataset);

// ---------- Notifications ----------
router.get('/notifications', ...anyMember, notif.listNotifications);
router.patch('/notifications/read-all', ...anyMember, notif.markAllRead);
router.patch('/notifications/:id/read', ...anyMember, validate({ params: id }), notif.markRead);
router.get('/notifications/prefs', ...tenantOnly(), notif.getPrefs);
router.put('/notifications/prefs', ...tenantOnly(), validate({ body: v.notificationPrefSchema }), notif.updatePrefs);
router.post('/notifications/run', ...staffGuard(), notif.runEngine);
router.get('/notifications/log', ...staffGuard(), notif.listDeliveryLog);

// ---------- Settings ----------
router.get('/settings', ...anyMember, settings.getSettings);
router.patch('/settings', ...ownerGuard(), validate({ body: v.settingsUpdateSchema }), settings.updateSettings);
router.get('/reminder-schedule', ...staffGuard(), settings.getReminderSchedule);
router.put('/reminder-schedule', ...ownerGuard(), validate({ body: v.reminderScheduleSchema }), settings.updateReminderSchedule);
router.put('/settings/notification-prefs/:tenantId', ...staffGuard('tenants'), validate({ params: { tenantId: uuid }, body: v.notificationPrefSchema }), settings.updateTenantNotificationPref);

export default router;
