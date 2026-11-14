import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Payment, Tenant, Room } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { getOutstandingTenants, getOverdueSummary } from '../services/billingService.js';
import { nowISO } from '../utils/ids.js';

export const listPayments = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.month) filter.month = req.query.month;

  // Tenants only see their own ledger.
  if (req.user.role === 'tenant') filter.tenant = req.tenantId;

  const payments = await Payment.find(filter).sort({ createdAt: -1 });
  const tenants = await Tenant.find({ pg: req.pgId });
  const nameById = new Map(tenants.map((t) => [String(t._id), t.fullName]));
  res.json({
    success: true,
    payments: payments.map((p) => ({ ...p.toJSON(), tenantName: nameById.get(String(p.tenant)) })),
  });
});

export const payPayment = asyncHandler(async (req, res) => {
  const { method = 'UPI' } = req.body;
  const filter = { _id: req.params.id, pg: req.pgId };
  // Tenants may only settle their own dues.
  if (req.user.role === 'tenant') filter.tenant = req.tenantId;

  const payment = await Payment.findOne(filter);
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'Paid') throw ApiError.badRequest('This payment is already settled');

  payment.status = 'Paid';
  payment.method = method;
  payment.paidAt = nowISO();
  payment.reference = `pay_${Math.random().toString(36).slice(2, 10)}`;
  await payment.save();

  recordAudit(req.user.id, 'payment.paid', 'Payment', payment.id, `Marked ${payment.type} of ₹${payment.amount} as paid`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, payment });
});

export const sendRentReminder = asyncHandler(async (req, res) => {
  const tenants = await Tenant.find({ pg: req.pgId, status: { $ne: 'Left' } }).lean();
  const payments = await Payment.find({ pg: req.pgId }).lean();
  const rooms = await Room.find({ pg: req.pgId }).lean();
  const roomByTenant = new Map();
  for (const t of tenants) {
    roomByTenant.set(String(t._id), rooms.find((r) => String(r._id) === String(t.room)));
  }

  const outstanding = getOutstandingTenants(tenants, payments, roomByTenant);
  recordAudit(req.user.id, 'payment.reminder', 'Payment', 'bulk', `Rent reminder sent to ${outstanding.length} tenants`);
  res.json({ success: true, reminded: outstanding.length, outstanding });
});

export const outstandingSummary = asyncHandler(async (req, res) => {
  const tenants = await Tenant.find({ pg: req.pgId, status: { $ne: 'Left' } }).lean();
  const payments = await Payment.find({ pg: req.pgId }).lean();
  const rooms = await Room.find({ pg: req.pgId }).lean();
  const roomByTenant = new Map();
  for (const t of tenants) {
    roomByTenant.set(String(t._id), rooms.find((r) => String(r._id) === String(t.room)));
  }
  res.json({ success: true, summary: getOverdueSummary(tenants, payments, roomByTenant) });
});
