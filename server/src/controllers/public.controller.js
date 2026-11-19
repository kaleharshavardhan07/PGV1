import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { query, one } from '../db/index.js';
import { normalizeUsername } from '../services/pgPlatform.js';
import * as rooms from '../repositories/rooms.js';

// Public, unauthenticated views. They expose counts and room/bed availability only,
// never tenant data.
const PG_PUBLIC = `SELECT id, pg_name, pg_username, description, address, city, state, pg_type,
  is_discoverable, show_available_beds FROM pg_accounts`;

const sharingTypesFor = async (pgId) =>
  (await query('SELECT DISTINCT sharing_type FROM rooms WHERE pg_id = $1 ORDER BY 1', [pgId])).map((r) => r.sharingType);

const vacancyFor = async (pgId) => ({ ...(await rooms.vacancyCounts(pgId)), sharingTypes: await sharingTypesFor(pgId) });

const findActive = async (username) => {
  const pg = await one(`${PG_PUBLIC} WHERE pg_username = $1 AND is_active`, [normalizeUsername(username)]);
  if (!pg) throw ApiError.notFound('PG not found');
  return pg;
};

export const discover = asyncHandler(async (req, res) => {
  const pg = await findActive(req.params.username);
  const info = { ...pg };
  if (pg.isDiscoverable && pg.showAvailableBeds) info.vacancy = await vacancyFor(pg.id);
  res.json({ success: true, pg: info });
});

export const vacancyDetail = asyncHandler(async (req, res) => {
  const pg = await findActive(req.params.username);
  const summary = { id: pg.id, pgName: pg.pgName, pgUsername: pg.pgUsername, address: pg.address, city: pg.city, state: pg.state, pgType: pg.pgType };
  if (!pg.isDiscoverable || !pg.showAvailableBeds) return res.json({ success: true, pg: summary, rooms: [] });

  const allRooms = await rooms.listRooms(pg.id);
  res.json({
    success: true,
    pg: summary,
    rooms: allRooms.map((r) => {
      const rents = r.beds.filter((b) => b.rent != null).map((b) => b.rent);
      return {
        id: r.id, roomNumber: r.roomNumber, floor: r.floor, sharingType: r.sharingType, attachedBathroom: r.attachedBathroom,
        totalBeds: r.totalBeds, vacantBeds: r.totalBeds - r.occupiedBeds, rentFrom: rents.length ? Math.min(...rents) : null,
        beds: r.beds.map((b) => ({ id: b.id, bedNumber: b.bedNumber, label: b.label, status: b.status === 'vacant' ? 'vacant' : 'occupied', rent: b.rent })),
      };
    }),
  });
});

export const discoverablePgs = asyncHandler(async (req, res) => {
  const params = [];
  let where = 'WHERE is_active AND is_discoverable';
  if (req.query.city) { params.push(`%${req.query.city}%`); where += ` AND city ILIKE $${params.length}`; }
  if (req.query.pgType) { params.push(req.query.pgType); where += ` AND pg_type = $${params.length}`; }

  const pgs = await query(`${PG_PUBLIC} ${where} ORDER BY created_at DESC LIMIT 50`, params);
  const result = [];
  for (const pg of pgs) {
    const entry = { id: pg.id, pgName: pg.pgName, pgUsername: pg.pgUsername, description: pg.description, address: pg.address, city: pg.city, pgType: pg.pgType };
    if (pg.showAvailableBeds) entry.vacancy = await vacancyFor(pg.id);
    result.push(entry);
  }
  res.json({ success: true, pgs: result });
});
