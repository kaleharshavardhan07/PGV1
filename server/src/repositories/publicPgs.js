import { query, one } from '../db/index.js';

// Distance in km (haversine) from $lat/$lng to a PG's saved coordinates.
const DISTANCE = (latP, lngP) => `(6371 * acos(least(1, greatest(-1,
  cos(radians(${latP}::float8)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(${lngP}::float8))
  + sin(radians(${latP}::float8)) * sin(radians(p.latitude))))))`;

/**
 * Search public PGs. Availability, sharing type and price are evaluated against the
 * same bed (an EXISTS over vacant, available beds), so "2-sharing under ₹8000" only
 * matches a PG that really has such a bed free.
 */
export const searchPgs = async (f) => {
  const params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };
  const where = ["p.is_active", "p.is_discoverable", "p.approval_status = 'Approved'"];

  if (f.q) {
    const like = p(`%${f.q}%`);
    where.push(`(p.pg_name ILIKE ${like} OR p.area ILIKE ${like} OR p.city ILIKE ${like} OR p.address ILIKE ${like} OR p.pin_code ILIKE ${like})`);
  }
  if (f.city) where.push(`lower(p.city) = lower(${p(f.city)})`);
  if (f.area) where.push(`lower(p.area) = lower(${p(f.area)})`);
  if (f.pgType) where.push(`p.pg_type = ${p(f.pgType)}`);

  const bedFilters = [];
  if (f.sharing != null) bedFilters.push(`r.sharing_type = ${p(f.sharing)}`);
  if (f.minPrice != null) bedFilters.push(`b.rent >= ${p(f.minPrice)}`);
  if (f.maxPrice != null) bedFilters.push(`b.rent <= ${p(f.maxPrice)}`);
  if (f.available === 'true' || bedFilters.length) {
    where.push(`p.show_available_beds AND EXISTS (
      SELECT 1 FROM beds b JOIN rooms r ON r.id = b.room_id LEFT JOIN tenants t ON t.bed_id = b.id
       WHERE b.pg_id = p.id AND t.id IS NULL AND NOT b.unavailable ${bedFilters.map((c) => `AND ${c}`).join(' ')})`);
  }

  const hasGeo = f.lat != null && f.lng != null;
  let distanceSql = 'NULL::float8';
  if (hasGeo) {
    const la = p(f.lat);
    const lo = p(f.lng);
    distanceSql = `CASE WHEN p.latitude IS NULL THEN NULL ELSE ${DISTANCE(la, lo)} END`;
    if (f.radiusKm != null) where.push(`p.latitude IS NOT NULL AND ${DISTANCE(la, lo)} <= ${p(f.radiusKm)}`);
  }

  const order = {
    nearest: hasGeo ? 'distance_km ASC NULLS LAST, p.created_at DESC' : 'p.created_at DESC',
    price: 'min_rent ASC NULLS LAST, p.created_at DESC',
    availability: 'vacant_beds DESC NULLS LAST, p.created_at DESC',
    newest: 'p.created_at DESC',
  }[f.sort ?? 'newest'];

  const limit = p(f.limit ?? 20);
  const offset = p(f.offset ?? 0);

  const rows = await query(
    `WITH stats AS (
       SELECT b.pg_id,
              count(*) AS total_beds,
              count(*) FILTER (WHERE t.id IS NULL AND NOT b.unavailable) AS vacant_beds,
              min(b.rent) FILTER (WHERE t.id IS NULL AND NOT b.unavailable) AS min_rent,
              max(b.rent) FILTER (WHERE t.id IS NULL AND NOT b.unavailable) AS max_rent,
              array_agg(DISTINCT r.sharing_type ORDER BY r.sharing_type) FILTER (WHERE t.id IS NULL AND NOT b.unavailable) AS sharing_types
         FROM beds b JOIN rooms r ON r.id = b.room_id LEFT JOIN tenants t ON t.bed_id = b.id
        GROUP BY b.pg_id)
     SELECT p.id, p.pg_name, p.pg_username, p.description, p.address, p.area, p.city, p.state, p.pin_code, p.pg_type,
            p.latitude, p.longitude, p.show_available_beds, p.contact_public, p.owner_name, p.owner_mobile,
            CASE WHEN p.show_available_beds THEN COALESCE(s.total_beds, 0) END AS total_beds,
            CASE WHEN p.show_available_beds THEN COALESCE(s.vacant_beds, 0) END AS vacant_beds,
            CASE WHEN p.show_available_beds THEN s.min_rent END AS min_rent,
            CASE WHEN p.show_available_beds THEN s.max_rent END AS max_rent,
            CASE WHEN p.show_available_beds THEN COALESCE(s.sharing_types, '{}') END AS sharing_types,
            ${distanceSql} AS distance_km,
            COALESCE((SELECT array_agg(ph.id ORDER BY ph.sort_order, ph.created_at) FROM pg_photos ph WHERE ph.pg_id = p.id), '{}') AS photo_ids,
            count(*) OVER () AS total_count
       FROM pg_accounts p LEFT JOIN stats s ON s.pg_id = p.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${order}
      LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return { total: rows[0]?.totalCount ?? 0, rows };
};

/** Cities and areas that have discoverable PGs, for the location picker. */
export const listLocations = () =>
  query(
    `SELECT city, area, count(*)::int AS pgs FROM pg_accounts
      WHERE is_active AND is_discoverable AND city <> ''
      GROUP BY city, area ORDER BY pgs DESC, city, area LIMIT 300`
  );

export const getPublicPg = (username) =>
  one(
    `SELECT id, pg_name, pg_username, description, address, area, city, state, pin_code, pg_type, latitude, longitude,
            show_available_beds, contact_public, owner_name, owner_mobile, owner_email,
            COALESCE((SELECT array_agg(ph.id ORDER BY ph.sort_order, ph.created_at) FROM pg_photos ph WHERE ph.pg_id = pg_accounts.id), '{}') AS photo_ids
       FROM pg_accounts WHERE pg_username = $1 AND is_active AND is_discoverable AND approval_status = 'Approved'`,
    [username]
  );

export const createEnquiry = (pgId, e) =>
  one(
    'INSERT INTO enquiries (pg_id, name, mobile, email, message) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [pgId, e.name, e.mobile, e.email ?? '', e.message ?? '']
  );
