import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Complaint, Tenant, Room } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { nowISO } from '../utils/ids.js';

export const listComplaints = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;

  // Tenants only see their own complaints.
  if (req.user.role === 'tenant') filter.tenant = req.tenantId;

  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  const tenants = await Tenant.find({ pg: req.pgId });
  const nameById = new Map(tenants.map((t) => [String(t._id), t.fullName]));
  res.json({
    success: true,
    complaints: complaints.map((c) => ({ ...c.toJSON(), tenantName: nameById.get(String(c.tenant)) })),
  });
});

export const createComplaint = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') throw ApiError.forbidden('Only tenants can raise complaints');

  const tenant = await Tenant.findById(req.tenantId);
  const room = await Room.findById(tenant.room);

  const complaint = await Complaint.create({
    pg: req.pgId,
    tenant: req.tenantId,
    category: req.body.category,
    description: req.body.description,
    imageUrl: req.body.imageUrl,
    roomNumber: room?.roomNumber ?? '-',
    status: 'Submitted',
    submittedAt: nowISO(),
  });

  recordAudit(req.user.id, 'complaint.created', 'Complaint', complaint.id, `${complaint.category} complaint from Room ${complaint.roomNumber}`);
  await runNotificationEngine(req.pgId);
  res.status(201).json({ success: true, complaint });
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const complaint = await Complaint.findOne({ _id: req.params.id, pg: req.pgId });
  if (!complaint) throw ApiError.notFound('Complaint not found');

  complaint.status = status;
  if (remarks !== undefined) complaint.remarks = remarks;
  if (status === 'Resolved') complaint.resolvedAt = nowISO();
  await complaint.save();

  recordAudit(req.user.id, 'complaint.updated', 'Complaint', complaint.id, `Status -> ${status}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, complaint });
});
