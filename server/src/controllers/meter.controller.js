import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { MeterReading, Room, Tenant, Payment, Workspace } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { nowISO } from '../utils/ids.js';

export const listReadings = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.month) filter.month = req.query.month;
  if (req.query.room) filter.room = req.query.room;

  // Tenants may only see their own room's readings.
  if (req.user.role === 'tenant') {
    const tenant = req.tenantId ? await Tenant.findById(req.tenantId) : null;
    filter.room = tenant?.room ?? null;
  }

  const readings = await MeterReading.find(filter).sort({ month: -1, createdAt: -1 });
  const rooms = await Room.find({ pg: req.pgId });
  const roomById = new Map(rooms.map((r) => [String(r._id), r.roomNumber]));
  res.json({
    success: true,
    readings: readings.map((m) => ({ ...m.toJSON(), roomNumber: roomById.get(String(m.room)) })),
  });
});

export const saveReading = asyncHandler(async (req, res) => {
  const { room: roomId, month, previousReading, currentReading, ratePerUnit, occupants, photoUrl } = req.body;

  const room = await Room.findOne({ _id: roomId, pg: req.pgId });
  if (!room) throw ApiError.badRequest('Room not found');

  const workspace = await Workspace.findOne({ pg: req.pgId }).lean();
  const rate = ratePerUnit ?? workspace?.settings?.electricityRate ?? 8.5;
  const occ = occupants ?? 1;
  const units = Math.max(0, currentReading - previousReading);
  const totalAmount = Math.round(units * rate);
  const perTenantAmount = Math.round(totalAmount / Math.max(1, occ));

  const reading = await MeterReading.findOneAndUpdate(
    { pg: req.pgId, room: roomId, month },
    {
      $set: {
        previousReading,
        currentReading,
        units,
        ratePerUnit: rate,
        totalAmount,
        occupants: occ,
        perTenantAmount,
        photoUrl,
        recordedAt: nowISO(),
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  recordAudit(req.user.id, 'meter.saved', 'MeterReading', reading.id, `Reading for ${room.roomNumber} (${month}): ${units} units`);
  res.json({ success: true, reading });
});

export const publishBills = asyncHandler(async (req, res) => {
  const { month } = req.body;
  const readings = await MeterReading.find({ pg: req.pgId, month, published: false });

  if (!readings.length) throw ApiError.badRequest('No unpublished readings for this month');

  const workspace = await Workspace.findOne({ pg: req.pgId }).lean();
  const dueInDays = workspace?.reminderSchedule?.electricityDueInDays ?? 5;
  const due = new Date(`${month}-01T00:00:00`);
  due.setMonth(due.getMonth() + 1);
  due.setDate(dueInDays);
  const dueDate = due.toISOString().split('T')[0];

  let created = 0;
  for (const reading of readings) {
    const tenants = await Tenant.find({ pg: req.pgId, room: reading.room, status: { $ne: 'Left' } });
    for (const tenant of tenants) {
      await Payment.create({
        pg: req.pgId,
        tenant: tenant._id,
        type: 'Electricity',
        month,
        amount: reading.perTenantAmount,
        method: 'UPI',
        status: 'Pending',
        dueDate,
      });
      created++;
    }
    reading.published = true;
    await reading.save();
  }

  recordAudit(req.user.id, 'meter.published', 'MeterReading', 'bulk', `Published electricity bills for ${month} (${created} tenant bills)`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, publishedReadings: readings.length, tenantBillsCreated: created });
});
