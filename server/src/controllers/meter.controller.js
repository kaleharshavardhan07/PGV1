import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as ops from '../repositories/operations.js';
import * as rooms from '../repositories/rooms.js';
import * as tenants from '../repositories/tenants.js';
import { getSettings } from '../repositories/accounts.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';

export const listReadings = asyncHandler(async (req, res) => {
  const { month, room } = req.query;
  if (req.user.role === 'tenant') {
    // Tenants see only published readings for the room they live in.
    const me = await tenants.getTenant(req.pgId, req.tenantId);
    if (!me?.roomId) return res.json({ success: true, readings: [] });
    return res.json({ success: true, readings: await ops.listReadings({ pgId: req.pgId, month, roomId: me.roomId, publishedOnly: true }) });
  }
  res.json({ success: true, readings: await ops.listReadings({ pgId: req.pgId, month, roomId: room }) });
});

export const saveReading = asyncHandler(async (req, res) => {
  const { room: roomId, month, previousReading, currentReading, ratePerUnit, occupants } = req.body;
  if (currentReading < previousReading) throw ApiError.badRequest('Current reading cannot be lower than the previous reading');

  const room = await rooms.getRoom(req.pgId, roomId);
  if (!room) throw ApiError.badRequest('Room not found');

  const { settings } = await getSettings(req.pgId);
  const rate = ratePerUnit ?? settings.electricityRate;
  const people = occupants ?? Math.max(1, room.occupiedBeds);
  const units = currentReading - previousReading;
  const totalAmount = Math.round(units * rate);

  const reading = await ops.saveReading(req.pgId, {
    roomId, month, previousReading, currentReading, units, ratePerUnit: rate, totalAmount,
    occupants: people, perTenantAmount: Math.round(totalAmount / people),
  });
  recordAudit(req.pgId, req.user.id, 'meter.saved', 'MeterReading', reading.id, `Room ${room.roomNumber} (${month}): ${units} units`);
  res.json({ success: true, reading });
});

// Publishing makes a month's readings visible to tenants and notifies them.
export const publishBills = asyncHandler(async (req, res) => {
  const published = await ops.publishReadings(req.pgId, req.body.month);
  if (!published.length) throw ApiError.badRequest('No unpublished readings for this month');
  recordAudit(req.pgId, req.user.id, 'meter.published', 'MeterReading', req.body.month, `Published ${published.length} reading(s) for ${req.body.month}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, publishedReadings: published.length });
});
