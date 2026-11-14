import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  AdmissionRequest,
  PgAccount,
  TenantUser,
  Tenant,
  Bed,
  Room,
  Membership,
  Payment,
  Workspace,
} from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { nowISO, nextRequestId, currentMonth } from '../utils/ids.js';

const buildRequestId = async () => {
  const year = new Date().getFullYear();
  const count = await AdmissionRequest.countDocuments({ requestId: new RegExp(`^AR-${year}-`) });
  return nextRequestId(year, count + 1);
};

export const submitAdmission = asyncHandler(async (req, res) => {
  const { pg: pgId, ...fields } = req.body;

  const pg = await PgAccount.findById(pgId);
  if (!pg || !pg.isActive) throw ApiError.badRequest('This PG is not accepting admission requests');

  const user = await TenantUser.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('Please log in to submit an admission request');

  const existing = await AdmissionRequest.findOne({
    tenantUser: user._id,
    pg: pgId,
    status: 'Pending',
  });
  if (existing) throw ApiError.conflict('You already have a pending request with this PG');

  const request = await AdmissionRequest.create({
    pg: pgId,
    requestId: await buildRequestId(),
    tenantUser: user._id,
    fullName: fields.fullName || user.fullName,
    mobile: fields.mobile || user.mobile,
    email: fields.email || user.email || '',
    gender: fields.gender || user.gender,
    emergencyContact: fields.emergencyContact || '',
    preferredJoiningDate: fields.preferredJoiningDate,
    preferredRoomType: fields.preferredRoomType || '',
    preferredBed: fields.preferredBed || null,
    occupants: fields.occupants || 1,
    additionalMessage: fields.additionalMessage || '',
    status: 'Pending',
  });

  recordAudit(user.id, 'admission.submitted', 'AdmissionRequest', request.id, `Request ${request.requestId}`);
  res.status(201).json({ success: true, request });
});

export const myAdmissions = asyncHandler(async (req, res) => {
  const requests = await AdmissionRequest.find({ tenantUser: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, requests });
});

export const listAdmissions = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.status) filter.status = req.query.status;
  const requests = await AdmissionRequest.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, requests });
});

export const approveAdmission = asyncHandler(async (req, res) => {
  const { room: roomId, bed: bedId, monthlyRent, securityDeposit } = req.body;

  const request = await AdmissionRequest.findOne({ _id: req.params.id, pg: req.pgId });
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'Pending') throw ApiError.badRequest('This request has already been reviewed');

  const room = await Room.findOne({ _id: roomId, pg: req.pgId });
  if (!room) throw ApiError.badRequest('Room not found');

  const bed = await Bed.findOne({ _id: bedId, pg: req.pgId, room: roomId });
  if (!bed) throw ApiError.badRequest('Selected bed does not exist');
  if (bed.status === 'occupied') throw ApiError.badRequest('Selected bed is already occupied');

  const tenant = await Tenant.create({
    pg: req.pgId,
    user: request.tenantUser,
    fullName: request.fullName,
    mobile: request.mobile,
    email: request.email,
    emergencyContact: request.emergencyContact,
    room: roomId,
    bedNumber: bed.bedNumber,
    monthlyRent,
    securityDeposit,
    joiningDate: request.preferredJoiningDate,
    status: 'Active',
  });

  await Bed.updateOne(
    { _id: bed._id },
    { $set: { status: 'occupied', tenant: tenant._id, vacantSince: undefined } }
  );

  await Membership.create({
    pg: req.pgId,
    tenantUser: request.tenantUser,
    tenant: tenant._id,
    room: roomId,
    bed: bed._id,
    status: 'Active',
    joiningDate: request.preferredJoiningDate,
    monthlyRent,
    securityDeposit,
    approvedBy: req.user.id,
    approvedAt: nowISO(),
  });

  const workspace = await Workspace.findOne({ pg: req.pgId }).lean();
  const foodCharge = workspace?.settings?.foodCharge ?? 0;
  const month = request.preferredJoiningDate.slice(0, 7);
  await Payment.insertMany([
    {
      pg: req.pgId,
      tenant: tenant._id,
      type: 'Deposit',
      month,
      amount: securityDeposit,
      method: 'UPI',
      status: securityDeposit > 0 ? 'Paid' : 'Pending',
      paidAt: securityDeposit > 0 ? nowISO() : undefined,
      dueDate: request.preferredJoiningDate,
    },
    {
      pg: req.pgId,
      tenant: tenant._id,
      type: 'Rent',
      month: currentMonth(),
      amount: monthlyRent + foodCharge,
      method: 'UPI',
      status: 'Pending',
      dueDate: `${currentMonth()}-05`,
    },
  ]);

  request.status = 'Approved';
  request.reviewedBy = req.user.id;
  request.reviewedAt = nowISO();
  await request.save();

  recordAudit(req.user.id, 'admission.approved', 'AdmissionRequest', request.id, `Approved ${request.requestId} for ${tenant.fullName}`);
  await runNotificationEngine(req.pgId);

  res.json({ success: true, request, tenant, membership: { tenantId: tenant.id } });
});

export const rejectAdmission = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const request = await AdmissionRequest.findOne({ _id: req.params.id, pg: req.pgId });
  if (!request) throw ApiError.notFound('Request not found');
  if (request.status !== 'Pending') throw ApiError.badRequest('This request has already been reviewed');

  request.status = 'Rejected';
  request.rejectionReason = reason;
  request.reviewedBy = req.user.id;
  request.reviewedAt = nowISO();
  await request.save();

  recordAudit(req.user.id, 'admission.rejected', 'AdmissionRequest', request.id, `Rejected ${request.requestId}: ${reason}`);
  res.json({ success: true, request });
});
