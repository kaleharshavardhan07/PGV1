import { query, one, transaction } from '../db/index.js';
import ApiError from '../utils/apiError.js';

// Everything except the credential columns.
const TENANT_SELECT = `
  SELECT t.id, t.pg_id, t.full_name, t.mobile, t.email, t.gender, t.emergency_contact,
         t.monthly_rent, t.security_deposit, t.joining_date, t.police_verification, t.status,
         t.notice_date, t.password_changed_at, t.created_at,
         t.bed_id, b.bed_number, b.room_id, r.room_number
    FROM tenants t
    LEFT JOIN beds b ON b.id = t.bed_id
    LEFT JOIN rooms r ON r.id = b.room_id`;

export const listTenants = ({ pgId, status, roomId, search }) => {
  const params = [pgId];
  let where = 'WHERE t.pg_id = $1';
  if (status) { params.push(status); where += ` AND t.status = $${params.length}`; }
  if (roomId) { params.push(roomId); where += ` AND b.room_id = $${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` AND (t.full_name ILIKE $${params.length} OR t.mobile ILIKE $${params.length})`; }
  return query(`${TENANT_SELECT} ${where} ORDER BY t.created_at DESC`, params);
};

export const getTenant = (pgId, id) => one(`${TENANT_SELECT} WHERE t.id = $1 AND t.pg_id = $2`, [id, pgId]);

/** Unscoped lookup used to authenticate a session token. */
export const getTenantById = (id) => one(`${TENANT_SELECT} WHERE t.id = $1`, [id]);

/** Tenant row incl. password hash, for login. Only live (non-Left) accounts can sign in. */
export const findLiveByMobile = (mobile) =>
  one(`SELECT id, pg_id, full_name, mobile, status, password_hash FROM tenants WHERE mobile = $1 AND status <> 'Left'`, [mobile]);

/** Claim a vacant bed (row-locked) and create the tenant account in one transaction. */
export const createTenant = (pgId, data, { passwordHash, createdBy }) =>
  transaction(async (tx) => {
    const bed = await one('SELECT id, unavailable FROM beds WHERE id = $1 AND pg_id = $2 FOR UPDATE', [data.bedId, pgId], tx);
    if (!bed) throw ApiError.badRequest('Selected bed does not exist');
    if (bed.unavailable) throw ApiError.badRequest('This bed is marked unavailable');
    if (await one('SELECT 1 AS x FROM tenants WHERE bed_id = $1', [bed.id], tx)) {
      throw ApiError.conflict('This bed is already occupied');
    }
    const row = await one(
      `INSERT INTO tenants
         (pg_id, bed_id, full_name, mobile, email, gender, emergency_contact, password_hash, created_by,
          monthly_rent, security_deposit, joining_date, police_verification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        pgId, bed.id, data.fullName, data.mobile, data.email ?? '', data.gender ?? null, data.emergencyContact ?? '',
        passwordHash, createdBy, data.monthlyRent, data.securityDeposit ?? 0, data.joiningDate,
        data.policeVerification ?? 'Pending',
      ],
      tx
    );
    await query('UPDATE beds SET vacant_since = NULL WHERE id = $1', [bed.id], tx);
    await query('INSERT INTO notification_prefs (tenant_id, pg_id) VALUES ($1,$2)', [row.id, pgId], tx);
    return row.id;
  });

const UPDATABLE = {
  fullName: 'full_name', mobile: 'mobile', email: 'email', gender: 'gender', emergencyContact: 'emergency_contact',
  monthlyRent: 'monthly_rent', securityDeposit: 'security_deposit', policeVerification: 'police_verification',
  joiningDate: 'joining_date',
};

export const updateTenant = async (pgId, id, patch) => {
  const sets = ['updated_at = now()'];
  const params = [id, pgId];
  for (const [k, col] of Object.entries(UPDATABLE)) {
    if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col} = $${params.length}`); }
  }
  const updated = await one(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 RETURNING id`, params);
  return updated ? getTenant(pgId, id) : null;
};

export const markNotice = async (pgId, id) => {
  const row = await one(
    `UPDATE tenants SET status = 'Notice Period', notice_date = CURRENT_DATE, updated_at = now()
      WHERE id = $1 AND pg_id = $2 AND status = 'Active' RETURNING id`,
    [id, pgId]
  );
  return row ? getTenant(pgId, id) : null;
};

/** Move a tenant out: frees the bed, deactivates the login, keeps the record and documents. */
export const moveOut = (pgId, id) =>
  transaction(async (tx) => {
    const t = await one('SELECT id, bed_id, status FROM tenants WHERE id = $1 AND pg_id = $2 FOR UPDATE', [id, pgId], tx);
    if (!t) return null;
    if (t.bedId) await query('UPDATE beds SET vacant_since = CURRENT_DATE WHERE id = $1', [t.bedId], tx);
    await query(
      `UPDATE tenants SET status = 'Left', bed_id = NULL, notice_date = COALESCE(notice_date, CURRENT_DATE), updated_at = now() WHERE id = $1`,
      [id],
      tx
    );
    return t;
  });

export const reallocate = (pgId, id, bedId) =>
  transaction(async (tx) => {
    const t = await one('SELECT id, bed_id, status FROM tenants WHERE id = $1 AND pg_id = $2 FOR UPDATE', [id, pgId], tx);
    if (!t) throw ApiError.notFound('Tenant not found');
    if (t.status === 'Left') throw ApiError.badRequest('This tenant has already moved out');
    const bed = await one('SELECT id, unavailable FROM beds WHERE id = $1 AND pg_id = $2 FOR UPDATE', [bedId, pgId], tx);
    if (!bed) throw ApiError.badRequest('Selected bed does not exist');
    if (bed.unavailable) throw ApiError.badRequest('This bed is marked unavailable');
    if (t.bedId === bed.id) return t;
    if (await one('SELECT 1 AS x FROM tenants WHERE bed_id = $1', [bed.id], tx)) throw ApiError.conflict('This bed is already occupied');
    if (t.bedId) await query('UPDATE beds SET vacant_since = CURRENT_DATE WHERE id = $1', [t.bedId], tx);
    await query('UPDATE tenants SET bed_id = $2, updated_at = now() WHERE id = $1', [id, bed.id], tx);
    await query('UPDATE beds SET vacant_since = NULL WHERE id = $1', [bed.id], tx);
    return t;
  });

export const deleteTenant = async (pgId, id) => {
  const t = await getTenant(pgId, id);
  if (!t) return null;
  await query('DELETE FROM tenants WHERE id = $1 AND pg_id = $2', [id, pgId]); // documents, complaints, prefs cascade
  return t;
};

export const activeInRoom = (pgId, roomId) =>
  query(
    `SELECT t.id, t.full_name FROM tenants t JOIN beds b ON b.id = t.bed_id
      WHERE t.pg_id = $1 AND b.room_id = $2 AND t.status <> 'Left'`,
    [pgId, roomId]
  );
