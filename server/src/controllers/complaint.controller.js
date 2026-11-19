import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as ops from '../repositories/operations.js';
import * as tenants from '../repositories/tenants.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { insertNotification } from '../repositories/notifications.js';
import { recordAudit } from '../services/auditService.js';

export const listComplaints = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const tenantId = req.user.role === 'tenant' ? req.tenantId : undefined; // tenants see only their own
  res.json({ success: true, complaints: await ops.listComplaints({ pgId: req.pgId, tenantId, status, category }) });
});

export const createComplaint = asyncHandler(async (req, res) => {
  const me = await tenants.getTenant(req.pgId, req.tenantId);
  const complaint = await ops.createComplaint({
    pgId: req.pgId,
    tenantId: req.tenantId,
    category: req.body.category,
    description: req.body.description,
    roomNumber: me?.roomNumber ?? '-',
  });
  await insertNotification(req.pgId, {
    dedupeKey: `complaint-new-${complaint.id}`, userId: 'all', userRole: 'manager', category: 'Complaint', type: 'info',
    title: 'New Complaint', message: `${me.fullName} raised a ${complaint.category} complaint in Room ${complaint.roomNumber}.`,
    link: '/app/manager/complaints',
  });
  recordAudit(req.pgId, req.user.id, 'complaint.created', 'Complaint', complaint.id, `${complaint.category} complaint from Room ${complaint.roomNumber}`);
  res.status(201).json({ success: true, complaint });
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaint = await ops.updateComplaint(req.pgId, req.params.id, req.body);
  if (!complaint) throw ApiError.notFound('Complaint not found');
  await insertNotification(req.pgId, {
    dedupeKey: `complaint-${complaint.id}-${complaint.status}-${Date.now()}`, userId: complaint.tenantId, userRole: 'tenant',
    category: 'Complaint', type: complaint.status === 'Resolved' ? 'success' : 'info',
    title: `Complaint ${complaint.status}`, message: `Your ${complaint.category} complaint is now "${complaint.status}".${complaint.remarks ? ` Note: ${complaint.remarks}` : ''}`,
    link: '/app/tenant/complaints',
  });
  recordAudit(req.pgId, req.user.id, 'complaint.updated', 'Complaint', complaint.id, `Status -> ${complaint.status}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, complaint });
});
