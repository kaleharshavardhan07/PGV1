import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as rooms from '../repositories/rooms.js';
import { recordAudit } from '../services/auditService.js';

export const listRooms = asyncHandler(async (req, res) => {
  res.json({ success: true, rooms: await rooms.listRooms(req.pgId) });
});

export const getRoom = asyncHandler(async (req, res) => {
  const room = await rooms.getRoom(req.pgId, req.params.id);
  if (!room) throw ApiError.notFound('Room not found');
  res.json({ success: true, room });
});

export const createRoom = asyncHandler(async (req, res) => {
  const id = await rooms.createRoom(req.pgId, req.body);
  const room = await rooms.getRoom(req.pgId, id);
  recordAudit(req.pgId, req.user.id, 'room.created', 'Room', id, `Created room ${room.roomNumber} with ${room.totalBeds} bed(s)`);
  res.status(201).json({ success: true, room });
});

export const createRoomsBulk = asyncHandler(async (req, res) => {
  const ids = await rooms.createRoomsBulk(req.pgId, req.body.rooms);
  recordAudit(req.pgId, req.user.id, 'room.bulk_created', 'Room', ids[0], `Created ${ids.length} rooms in bulk`);
  res.status(201).json({ success: true, created: ids.length });
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await rooms.updateRoom(req.pgId, req.params.id, req.body);
  if (!room) throw ApiError.notFound('Room not found');
  recordAudit(req.pgId, req.user.id, 'room.updated', 'Room', room.id, `Updated room ${room.roomNumber}`);
  res.json({ success: true, room });
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const room = await rooms.deleteRoom(req.pgId, req.params.id);
  recordAudit(req.pgId, req.user.id, 'room.deleted', 'Room', room.id, `Deleted room ${room.roomNumber}`);
  res.json({ success: true, message: 'Room deleted' });
});

// ---------- Beds ----------

export const listBeds = asyncHandler(async (req, res) => {
  const beds = await rooms.listBeds({ pgId: req.pgId, roomId: req.query.room, status: req.query.status });
  res.json({ success: true, beds });
});

export const addBed = asyncHandler(async (req, res) => {
  const bed = await rooms.addBed(req.pgId, req.params.roomId, req.body);
  recordAudit(req.pgId, req.user.id, 'bed.created', 'Bed', bed.id, `Added bed ${bed.bedNumber}`);
  res.status(201).json({ success: true, bed });
});

export const updateBed = asyncHandler(async (req, res) => {
  const bed = await rooms.updateBed(req.pgId, req.params.id, req.body);
  if (!bed) throw ApiError.notFound('Bed not found');
  recordAudit(req.pgId, req.user.id, 'bed.updated', 'Bed', bed.id, `Updated bed ${bed.bedNumber}`);
  res.json({ success: true, bed });
});

export const deleteBed = asyncHandler(async (req, res) => {
  const bed = await rooms.deleteBed(req.pgId, req.params.id);
  recordAudit(req.pgId, req.user.id, 'bed.deleted', 'Bed', bed.id, `Deleted bed ${bed.bedNumber}`);
  res.json({ success: true, message: 'Bed deleted' });
});

export const vacancySummary = asyncHandler(async (req, res) => {
  res.json({ success: true, vacancy: await rooms.vacancyCounts(req.pgId) });
});
