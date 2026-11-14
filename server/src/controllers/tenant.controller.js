import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Tenant, Room, Bed, Payment, Membership, Workspace } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { nowISO, currentMonth } from '../utils/ids.js';

const roomNumber = (rooms, id) => rooms.find((r) => String(r._id) === String(id))?.roomNumber ?? '-';

export const listTenants = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.room) filter.room = req.query.room;
  if (req.query.search) {
    filter.$or = [
      { fullName: new RegExp(req.query.search, 'i') },
      { mobile: new RegExp(req.query.search, 'i') },
    ];
  }
  const tenants = await Tenant.find(filter).sort({ createdAt: -1 });
  const rooms = await Room.find({ pg: req.pgId });
  const result = tenants.map((t) => ({ ...t.toJSON(), roomNumber: roomNumber(rooms, t.room) }));
  res.json({ success: true, tenants: result });
});

export const getTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id, pg: req.pgId });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  const room = await Room.findById(tenant.room);
  res.json({ success: true, tenant: { ...tenant.toJSON(), roomNumber: room?.roomNumber } });
});

export const createTenant = asyncHandler(async (req, res) => {
  const { room: roomId, bedNumber, monthlyRent, securityDeposit, joiningDate, ...rest } = req.body;

  const room = await Room.findOne({ _id: roomId, pg: req.pgId });
  if (!room) throw ApiError.badRequest('Room not found');

  const bed = await Bed.findOne({ room: roomId, bedNumber, pg: req.pgId });
  if (!bed) throw ApiError.badRequest('Selected bed does not exist');
  if (bed.status === 'occupied') throw ApiError.badRequest('This bed is already occupied');

  const tenant = await Tenant.create({
    pg: req.pgId,
    room: roomId,
    bedNumber,
    monthlyRent,
    securityDeposit,
    joiningDate,
    ...rest,
    status: 'Active',
  });

  await Bed.updateOne(
    { _id: bed._id },
    { $set: { status: 'occupied', tenant: tenant._id, vacantSince: undefined } }
  );

  // Deposit + current-month rent ledger entries.
  const workspace = await Workspace.findOne({ pg: req.pgId }).lean();
  const foodCharge = workspace?.settings?.foodCharge ?? 0;
  const month = joiningDate.slice(0, 7);
  const nowMonth = currentMonth();

  const payments = [
    {
      pg: req.pgId,
      tenant: tenant._id,
      type: 'Deposit',
      month,
      amount: securityDeposit,
      method: 'UPI',
      status: securityDeposit > 0 ? 'Paid' : 'Pending',
      paidAt: securityDeposit > 0 ? nowISO() : undefined,
      dueDate: joiningDate,
    },
    {
      pg: req.pgId,
      tenant: tenant._id,
      type: 'Rent',
      month: nowMonth,
      amount: monthlyRent + foodCharge,
      method: 'UPI',
      status: 'Pending',
      dueDate: `${nowMonth}-05`,
    },
  ];
  await Payment.insertMany(payments);

  recordAudit(req.user.id, 'tenant.created', 'Tenant', tenant.id, `Added ${tenant.fullName} to Room ${room.roomNumber}`);
  await runNotificationEngine(req.pgId);

  res.status(201).json({ success: true, tenant, payments });
});

export const updateTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOneAndUpdate({ _id: req.params.id, pg: req.pgId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  recordAudit(req.user.id, 'tenant.updated', 'Tenant', tenant.id, 'Updated tenant');
  await runNotificationEngine(req.pgId);
  res.json({ success: true, tenant });
});

export const deleteTenant = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOneAndDelete({ _id: req.params.id, pg: req.pgId });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  await Bed.updateOne({ tenant: tenant._id }, { $set: { status: 'vacant', tenant: null, vacantSince: nowISO() } });
  await Membership.updateMany({ tenant: tenant._id }, { $set: { status: 'Ended', leavingDate: nowISO().split('T')[0] } });
  recordAudit(req.user.id, 'tenant.deleted', 'Tenant', tenant.id, `Deleted ${tenant.fullName}`);
  res.json({ success: true, message: 'Tenant deleted' });
});

export const markNotice = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOneAndUpdate(
    { _id: req.params.id, pg: req.pgId },
    { $set: { status: 'Notice Period', noticeDate: nowISO().split('T')[0] } },
    { new: true }
  );
  if (!tenant) throw ApiError.notFound('Tenant not found');
  recordAudit(req.user.id, 'tenant.notice', 'Tenant', tenant.id, `Marked ${tenant.fullName} on notice period`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, tenant });
});

export const moveOut = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id, pg: req.pgId });
  if (!tenant) throw ApiError.notFound('Tenant not found');

  tenant.status = 'Left';
  tenant.noticeDate = nowISO().split('T')[0];
  await tenant.save();

  await Bed.updateOne(
    { tenant: tenant._id },
    { $set: { status: 'vacant', tenant: null, vacantSince: nowISO() } }
  );
  await Membership.updateMany(
    { tenant: tenant._id, status: 'Active' },
    { $set: { status: 'Ended', leavingDate: nowISO().split('T')[0] } }
  );

  recordAudit(req.user.id, 'tenant.moveout', 'Tenant', tenant.id, `Moved out ${tenant.fullName}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, tenant });
});

export const reallocateBed = asyncHandler(async (req, res) => {
  const { room, bedNumber } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id, pg: req.pgId });
  if (!tenant) throw ApiError.notFound('Tenant not found');

  const bed = await Bed.findOne({ room, bedNumber, pg: req.pgId });
  if (!bed) throw ApiError.badRequest('Selected bed does not exist');
  if (bed.status === 'occupied' && String(bed.tenant) !== String(tenant._id)) {
    throw ApiError.badRequest('This bed is already occupied');
  }

  // Free the old bed.
  await Bed.updateOne({ tenant: tenant._id }, { $set: { status: 'vacant', tenant: null, vacantSince: nowISO() } });

  tenant.room = room;
  tenant.bedNumber = bedNumber;
  await tenant.save();

  await Bed.updateOne(
    { _id: bed._id },
    { $set: { status: 'occupied', tenant: tenant._id, vacantSince: undefined } }
  );

  await Membership.updateMany({ tenant: tenant._id, status: 'Active' }, { $set: { room, bed: bed._id } });

  recordAudit(req.user.id, 'tenant.reallocate', 'Tenant', tenant.id, `Reallocated ${tenant.fullName} to bed ${bedNumber}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, tenant });
});

