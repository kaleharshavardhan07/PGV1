import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { Room, Bed, Tenant, PgAccount } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';
import { todayISO } from '../utils/ids.js';

export const listRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ pg: req.pgId }).sort({ roomNumber: 1 });
  const beds = await Bed.find({ pg: req.pgId });
  const result = rooms.map((r) => {
    const roomBeds = beds.filter((b) => String(b.room) === String(r._id));
    return {
      ...r.toJSON(),
      occupiedBeds: roomBeds.filter((b) => b.status === 'occupied').length,
      beds: roomBeds,
    };
  });
  res.json({ success: true, rooms: result });
});

export const createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create({ pg: req.pgId, ...req.body });

  // Auto-provision beds for the room.
  const beds = [];
  for (let i = 1; i <= room.totalBeds; i++) {
    beds.push({ pg: req.pgId, room: room._id, bedNumber: i, status: 'vacant' });
  }
  if (beds.length) await Bed.insertMany(beds);

  recordAudit(req.user.id, 'room.created', 'Room', room.id, `Created room ${room.roomNumber}`);
  await runNotificationEngine(req.pgId);
  res.status(201).json({ success: true, room });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOneAndUpdate({ _id: req.params.id, pg: req.pgId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!room) throw ApiError.notFound('Room not found');
  recordAudit(req.user.id, 'room.updated', 'Room', room.id, 'Updated room');
  res.json({ success: true, room });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findOneAndDelete({ _id: req.params.id, pg: req.pgId });
  if (!room) throw ApiError.notFound('Room not found');
  await Bed.deleteMany({ room: room._id });
  recordAudit(req.user.id, 'room.deleted', 'Room', room.id, `Deleted room ${room.roomNumber}`);
  res.json({ success: true, message: 'Room deleted' });
});

// ---------- Beds ----------

export const listBeds = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.room) filter.room = req.query.room;
  if (req.query.status) filter.status = req.query.status;
  const beds = await Bed.find(filter).sort({ room: 1, bedNumber: 1 });
  res.json({ success: true, beds });
});

export const updateBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findOneAndUpdate({ _id: req.params.id, pg: req.pgId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!bed) throw ApiError.notFound('Bed not found');

  if (req.body.status === 'vacant') {
    await Bed.updateOne({ _id: bed._id }, { $set: { tenant: null, vacantSince: req.body.vacantSince ?? todayISO() } });
  }
  recordAudit(req.user.id, 'bed.updated', 'Bed', bed.id, `Bed status -> ${bed.status}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, bed });
});

// ---------- Vacancy (public-safe view) ----------

export const vacancySummary = asyncHandler(async (req, res) => {
  const pg = await PgAccount.findById(req.pgId);
  const total = await Bed.countDocuments({ pg: req.pgId });
  const vacant = await Bed.countDocuments({ pg: req.pgId, status: 'vacant' });
  const occupied = total - vacant;
  const rooms = await Room.find({ pg: req.pgId });
  const occupants = await Tenant.countDocuments({ pg: req.pgId, status: { $ne: 'Left' } });
  res.json({
    success: true,
    vacancy: {
      pgName: pg?.pgName,
      city: pg?.city,
      pgType: pg?.pgType,
      totalBeds: total,
      vacantBeds: vacant,
      occupiedBeds: occupied,
      totalRooms: rooms.length,
      occupants,
      occupancyPercent: total ? Math.round((occupied / total) * 100) : 0,
    },
  });
});

