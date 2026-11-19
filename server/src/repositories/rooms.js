import { query, one, transaction } from '../db/index.js';
import ApiError from '../utils/apiError.js';

// Bed occupancy is derived from tenants.bed_id, never stored on the bed.
const BED_SELECT = `
  SELECT b.id, b.pg_id, b.room_id, b.bed_number, b.label, b.rent, b.vacant_since,
         CASE WHEN t.id IS NULL THEN 'vacant'
              WHEN t.status = 'Notice Period' THEN 'notice'
              ELSE 'occupied' END AS status,
         t.id AS tenant_id, t.full_name AS tenant_name
    FROM beds b
    LEFT JOIN tenants t ON t.bed_id = b.id`;

export const listBeds = ({ pgId, roomId, status }) => {
  const params = [pgId];
  let where = 'WHERE b.pg_id = $1';
  if (roomId) { params.push(roomId); where += ` AND b.room_id = $${params.length}`; }
  const sql = `SELECT * FROM (${BED_SELECT} ${where}) x ${status ? `WHERE x.status = $${params.push(status)}` : ''} ORDER BY room_id, bed_number`;
  return query(sql, params);
};

export const getBed = (pgId, id) => one(`${BED_SELECT} WHERE b.id = $1 AND b.pg_id = $2`, [id, pgId]);

const ROOM_SELECT = 'SELECT id, pg_id, room_number, floor, sharing_type, attached_bathroom FROM rooms';

const withBeds = (rooms, beds) =>
  rooms.map((r) => {
    const roomBeds = beds.filter((b) => b.roomId === r.id);
    return {
      ...r,
      totalBeds: roomBeds.length,
      occupiedBeds: roomBeds.filter((b) => b.status !== 'vacant').length,
      beds: roomBeds,
    };
  });

export const listRooms = async (pgId) => {
  const [rooms, beds] = await Promise.all([
    query(`${ROOM_SELECT} WHERE pg_id = $1 ORDER BY floor, room_number`, [pgId]),
    listBeds({ pgId }),
  ]);
  return withBeds(rooms, beds);
};

export const getRoom = async (pgId, id) => {
  const room = await one(`${ROOM_SELECT} WHERE id = $1 AND pg_id = $2`, [id, pgId]);
  if (!room) return null;
  return withBeds([room], await listBeds({ pgId, roomId: id }))[0];
};

/** Create a room together with its initial beds (numbered 1..bedCount). */
export const createRoom = (pgId, { roomNumber, floor, sharingType, attachedBathroom, bedCount, bedRent }) =>
  transaction(async (tx) => {
    const room = await one(
      `INSERT INTO rooms (pg_id, room_number, floor, sharing_type, attached_bathroom)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [pgId, roomNumber, floor, sharingType, attachedBathroom],
      tx
    );
    for (let n = 1; n <= bedCount; n++) {
      await query('INSERT INTO beds (pg_id, room_id, bed_number, rent) VALUES ($1,$2,$3,$4)', [pgId, room.id, n, bedRent ?? null], tx);
    }
    return room.id;
  });

export const updateRoom = async (pgId, id, patch) => {
  const map = { roomNumber: 'room_number', floor: 'floor', sharingType: 'sharing_type', attachedBathroom: 'attached_bathroom' };
  const sets = [];
  const params = [id, pgId];
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col} = $${params.length}`); }
  }
  if (sets.length) {
    const updated = await one(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 RETURNING id`, params);
    if (!updated) return null;
  }
  return getRoom(pgId, id);
};

export const deleteRoom = async (pgId, id) => {
  const room = await getRoom(pgId, id);
  if (!room) throw ApiError.notFound('Room not found');
  if (room.occupiedBeds > 0) {
    throw ApiError.conflict(`Room ${room.roomNumber} still has ${room.occupiedBeds} tenant(s). Move them out or reallocate them first.`);
  }
  await query('DELETE FROM rooms WHERE id = $1 AND pg_id = $2', [id, pgId]); // beds + meter readings cascade
  return room;
};

export const addBed = async (pgId, roomId, { bedNumber, label, rent }) => {
  const room = await one('SELECT id FROM rooms WHERE id = $1 AND pg_id = $2', [roomId, pgId]);
  if (!room) throw ApiError.notFound('Room not found');
  const number =
    bedNumber ?? ((await one('SELECT COALESCE(MAX(bed_number), 0) + 1 AS n FROM beds WHERE room_id = $1', [roomId])).n);
  const bed = await one(
    'INSERT INTO beds (pg_id, room_id, bed_number, label, rent) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [pgId, roomId, number, label ?? '', rent ?? null]
  );
  return getBed(pgId, bed.id);
};

export const updateBed = async (pgId, id, patch) => {
  const map = { bedNumber: 'bed_number', label: 'label', rent: 'rent' };
  const sets = [];
  const params = [id, pgId];
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col} = $${params.length}`); }
  }
  if (sets.length) {
    const updated = await one(`UPDATE beds SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 RETURNING id`, params);
    if (!updated) return null;
  }
  return getBed(pgId, id);
};

export const deleteBed = async (pgId, id) => {
  const bed = await getBed(pgId, id);
  if (!bed) throw ApiError.notFound('Bed not found');
  if (bed.status !== 'vacant') throw ApiError.conflict(`Bed ${bed.bedNumber} is occupied by ${bed.tenantName}. Move the tenant out or reallocate them first.`);
  await query('DELETE FROM beds WHERE id = $1 AND pg_id = $2', [id, pgId]);
  return bed;
};

export const vacancyCounts = async (pgId) => {
  const row = await one(
    `SELECT (SELECT count(*) FROM rooms WHERE pg_id = $1) AS rooms,
            (SELECT count(*) FROM beds  WHERE pg_id = $1) AS beds,
            (SELECT count(*) FROM tenants WHERE pg_id = $1 AND bed_id IS NOT NULL) AS occupied`,
    [pgId]
  );
  return { totalRooms: row.rooms, totalBeds: row.beds, occupiedBeds: row.occupied, vacantBeds: row.beds - row.occupied };
};
