import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PgAccount, Room, Bed, Tenant } from '../models/index.js';
import { normalizeUsername } from '../services/pgPlatform.js';

const vacancyFor = async (pg) => {
  const [rooms, beds] = await Promise.all([Room.find({ pg: pg._id }).lean(), Bed.find({ pg: pg._id }).lean()]);
  const total = beds.length;
  const vacant = beds.filter((b) => b.status === 'vacant').length;
  return {
    totalRooms: rooms.length,
    totalBeds: total,
    vacantBeds: vacant,
    sharingTypes: [...new Set(rooms.map((r) => r.sharingType))].sort(),
  };
};

// Public PG discovery by username (used by the landing page).
export const discover = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const pg = await PgAccount.findOne({ pgUsername: username, isActive: true });
  if (!pg) throw ApiError.notFound('PG not found');

  const info = {
    id: String(pg._id),
    pgName: pg.pgName,
    pgUsername: pg.pgUsername,
    description: pg.description,
    address: pg.address,
    city: pg.city,
    state: pg.state,
    pgType: pg.pgType,
    isDiscoverable: pg.isDiscoverable,
  };

  if (pg.isDiscoverable && pg.showAvailableBeds) {
    info.vacancy = await vacancyFor(pg);
  }

  res.json({ success: true, pg: info });
});

// Public vacancy detail for the shareable vacancy page: rooms, beds and the
// rent floor per room. Exposes no tenant PII.
export const vacancyDetail = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const pg = await PgAccount.findOne({ pgUsername: username, isActive: true });
  if (!pg) throw ApiError.notFound('PG not found');
  if (!pg.isDiscoverable || !pg.showAvailableBeds) {
    return res.json({ success: true, pg: { id: String(pg._id), pgName: pg.pgName }, rooms: [], beds: [], rentFrom: {} });
  }

  const [rooms, beds, tenants] = await Promise.all([
    Room.find({ pg: pg._id }).sort({ roomNumber: 1 }),
    Bed.find({ pg: pg._id }),
    Tenant.find({ pg: pg._id, status: { $ne: 'Left' } }),
  ]);

  const rentFrom = {};
  for (const t of tenants) {
    const key = String(t.room);
    if (!rentFrom[key] || t.monthlyRent < rentFrom[key]) rentFrom[key] = t.monthlyRent;
  }

  res.json({
    success: true,
    pg: {
      id: String(pg._id),
      pgName: pg.pgName,
      pgUsername: pg.pgUsername,
      address: pg.address,
      city: pg.city,
      state: pg.state,
      pgType: pg.pgType,
    },
    rooms: rooms.map((r) => ({ ...r.toJSON(), rentFrom: rentFrom[String(r._id)] ?? null })),
    beds: beds.map((b) => ({ id: String(b._id), roomId: String(b.room), bedNumber: b.bedNumber, status: b.status })),
    rentFrom,
  });
});

// List discoverable PGs (directory / vacancy page).
export const discoverablePgs = asyncHandler(async (req, res) => {
  const filter = { isActive: true, isDiscoverable: true };
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.pgType) filter.pgType = req.query.pgType;

  const pgs = await PgAccount.find(filter).sort({ createdAt: -1 }).limit(50);
  const result = [];
  for (const pg of pgs) {
    const entry = {
      id: String(pg._id),
      pgName: pg.pgName,
      pgUsername: pg.pgUsername,
      description: pg.description,
      address: pg.address,
      city: pg.city,
      pgType: pg.pgType,
    };
    if (pg.showAvailableBeds) entry.vacancy = await vacancyFor(pg);
    result.push(entry);
  }

  res.json({ success: true, pgs: result });
});
