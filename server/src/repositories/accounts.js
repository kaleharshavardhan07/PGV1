import { query, one, transaction } from '../db/index.js';
import { normaliseFeatureMap, normalisePermissions, resolveFeatures } from '../services/access.js';

const OWNER_COLUMNS = `id, pg_name, pg_username, description, address, area, city, state, pin_code, latitude, longitude, pg_type,
  owner_name, owner_email, owner_mobile, is_active, is_discoverable, approval_status, show_available_beds, contact_public,
  features_allowed, features_enabled, created_at, updated_at`;

export const getOwner = (id) => one(`SELECT ${OWNER_COLUMNS} FROM pg_accounts WHERE id = $1`, [id]);

/** PG-level flags every principal needs: is it active, and which modules are usable. */
export const getPgAccess = async (pgId) => {
  const row = await one('SELECT is_active, approval_status, features_allowed, features_enabled FROM pg_accounts WHERE id = $1', [pgId]);
  if (!row) return null;
  return { isActive: row.isActive, approvalStatus: row.approvalStatus, features: resolveFeatures(row.featuresAllowed, row.featuresEnabled) };
};

export const featureState = (row) => ({
  allowed: normaliseFeatureMap(row.featuresAllowed),
  enabled: normaliseFeatureMap(row.featuresEnabled),
  effective: resolveFeatures(row.featuresAllowed, row.featuresEnabled),
});

/** Owner row including the password hash, looked up by PG username or owner email. */
export const findOwnerForLogin = (identifier) => {
  const byEmail = identifier.includes('@');
  return one(
    `SELECT ${OWNER_COLUMNS}, password_hash FROM pg_accounts WHERE ${byEmail ? 'owner_email' : 'pg_username'} = $1`,
    [identifier.toLowerCase()]
  );
};

export const usernameExists = async (username) =>
  Boolean(await one('SELECT 1 AS x FROM pg_accounts WHERE pg_username = $1', [username]));

export const allUsernames = async () => (await query('SELECT pg_username FROM pg_accounts')).map((r) => r.pgUsername);

/** Create the PG account and its settings row atomically. */
export const createOwner = ({ owner, pg, pgUsername, passwordHash, photos = [] }) =>
  transaction(async (tx) => {
    const account = await one(
      `INSERT INTO pg_accounts
         (pg_name, pg_username, description, address, area, city, state, pin_code, latitude, longitude, pg_type,
          owner_name, owner_email, owner_mobile, password_hash, is_active, is_discoverable, approval_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,false,'Pending')
       RETURNING ${OWNER_COLUMNS}`,
      [
        pg.pgName, pgUsername, pg.description ?? '', pg.address, pg.area ?? '', pg.city, pg.state ?? '', pg.pinCode ?? '',
        pg.latitude ?? null, pg.longitude ?? null, pg.pgType ?? 'Other', owner.fullName, owner.email.toLowerCase(),
        owner.mobile, passwordHash,
      ],
      tx
    );
    for (const [index, photo] of photos.entries()) {
      await query(
        `INSERT INTO pg_photos (pg_id, file_name, mime_type, size, sort_order, data)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [account.id, photo.originalname, photo.mimetype, photo.size, index, photo.buffer],
        tx
      );
    }
    await query(
      `INSERT INTO workspace_settings (pg_id, name, address, city, contact_email, contact_phone, owner_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [account.id, pg.pgName, pg.address, pg.city, owner.email.toLowerCase(), owner.mobile, owner.fullName],
      tx
    );
    return account;
  });

// ---------- Managers (created and controlled by the owner) ----------
const MANAGER_COLUMNS = 'id, pg_id, full_name, email, mobile, permissions, is_active, created_at';

export const findManagerForLogin = (email) =>
  one(`SELECT ${MANAGER_COLUMNS}, password_hash FROM managers WHERE email = $1`, [email.toLowerCase()]);

export const getManager = (id) => one(`SELECT ${MANAGER_COLUMNS} FROM managers WHERE id = $1`, [id]);

export const listManagers = (pgId) => query(`SELECT ${MANAGER_COLUMNS} FROM managers WHERE pg_id = $1 ORDER BY created_at`, [pgId]);

export const getManagerInPg = (pgId, id) => one(`SELECT ${MANAGER_COLUMNS} FROM managers WHERE id = $1 AND pg_id = $2`, [id, pgId]);

export const createManager = (pgId, { fullName, email, mobile, passwordHash, permissions }) =>
  one(
    `INSERT INTO managers (pg_id, full_name, email, mobile, password_hash, permissions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${MANAGER_COLUMNS}`,
    [pgId, fullName, email.toLowerCase(), mobile ?? '', passwordHash, JSON.stringify(normalisePermissions(permissions))]
  );

export const updateManager = async (pgId, id, patch) => {
  const sets = [];
  const params = [id, pgId];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (patch.fullName !== undefined) add('full_name', patch.fullName);
  if (patch.mobile !== undefined) add('mobile', patch.mobile);
  if (patch.isActive !== undefined) add('is_active', patch.isActive);
  if (patch.permissions !== undefined) {
    const current = await getManagerInPg(pgId, id);
    if (!current) return null;
    add('permissions', JSON.stringify(normalisePermissions(patch.permissions, current.permissions)));
  }
  if (!sets.length) return getManagerInPg(pgId, id);
  return one(`UPDATE managers SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 RETURNING ${MANAGER_COLUMNS}`, params);
};

export const deleteManager = (pgId, id) => one('DELETE FROM managers WHERE id = $1 AND pg_id = $2 RETURNING id', [id, pgId]);

// ---------- Platform admins ----------
export const findAdminForLogin = (email) =>
  one('SELECT id, name, email, password_hash FROM platform_admins WHERE email = $1', [email.toLowerCase()]);
export const getAdmin = (id) => one('SELECT id, name, email FROM platform_admins WHERE id = $1', [id]);
export const createAdmin = ({ name, email, passwordHash }) =>
  one('INSERT INTO platform_admins (name, email, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id', [
    name, email.toLowerCase(), passwordHash,
  ]);

// ---------- Credentials ----------
const PASSWORD_TABLES = { owner: 'pg_accounts', manager: 'managers', tenant: 'tenants', admin: 'platform_admins' };

export const setPassword = async (role, id, passwordHash) => {
  await query(`UPDATE ${PASSWORD_TABLES[role]} SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
  if (role === 'tenant') await query('UPDATE tenants SET password_changed_at = now() WHERE id = $1', [id]);
};

export const getPasswordHash = async (role, id) =>
  (await one(`SELECT password_hash FROM ${PASSWORD_TABLES[role]} WHERE id = $1`, [id]))?.passwordHash ?? null;

// ---------- Settings & PG profile ----------
const SETTINGS_SELECT = `name, address, city, contact_email, contact_phone, owner_name, timezone,
  channel_whatsapp, channel_sms, channel_email, complaint_unresolved_hours, retry_attempts`;

const shapeSettings = (r) => ({
  settings: {
    name: r.name, address: r.address, city: r.city, contactEmail: r.contactEmail, contactPhone: r.contactPhone,
    ownerName: r.ownerName, timezone: r.timezone,
    channels: { whatsapp: r.channelWhatsapp, sms: r.channelSms, email: r.channelEmail },
  },
  reminderSchedule: { complaintUnresolvedHours: r.complaintUnresolvedHours, retryAttempts: r.retryAttempts },
});

export const getSettings = async (pgId) => {
  let row = await one(`SELECT ${SETTINGS_SELECT} FROM workspace_settings WHERE pg_id = $1`, [pgId]);
  if (!row) {
    await query('INSERT INTO workspace_settings (pg_id) VALUES ($1) ON CONFLICT DO NOTHING', [pgId]);
    row = await one(`SELECT ${SETTINGS_SELECT} FROM workspace_settings WHERE pg_id = $1`, [pgId]);
  }
  return shapeSettings(row);
};

const SETTINGS_COLUMNS = {
  name: 'name', address: 'address', city: 'city', contactEmail: 'contact_email', contactPhone: 'contact_phone',
  ownerName: 'owner_name', timezone: 'timezone', complaintUnresolvedHours: 'complaint_unresolved_hours', retryAttempts: 'retry_attempts',
};

export const updateSettings = async (pgId, patch) => {
  const sets = [];
  const params = [pgId];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  for (const [key, col] of Object.entries(SETTINGS_COLUMNS)) if (patch[key] !== undefined) add(col, patch[key]);
  for (const ch of ['whatsapp', 'sms', 'email']) if (patch.channels?.[ch] !== undefined) add(`channel_${ch}`, patch.channels[ch]);
  if (sets.length) {
    await getSettings(pgId);
    await query(`UPDATE workspace_settings SET ${sets.join(', ')} WHERE pg_id = $1`, params);
  }
  return getSettings(pgId);
};

/** Owner-editable parts of the PG account itself: location, visibility and module switches. */
export const updateOwnerProfile = async (pgId, patch) => {
  const sets = ['updated_at = now()'];
  const params = [pgId];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  const map = { isDiscoverable: 'is_discoverable', showAvailableBeds: 'show_available_beds', contactPublic: 'contact_public', description: 'description', pgType: 'pg_type' };
  for (const [k, col] of Object.entries(map)) if (patch[k] !== undefined) add(col, patch[k]);

  const loc = patch.location;
  if (loc) {
    const locMap = { address: 'address', area: 'area', city: 'city', state: 'state', pinCode: 'pin_code', latitude: 'latitude', longitude: 'longitude' };
    for (const [k, col] of Object.entries(locMap)) if (loc[k] !== undefined) add(col, loc[k]);
  }
  if (patch.featuresEnabled) {
    const current = await getOwner(pgId);
    add('features_enabled', JSON.stringify(normaliseFeatureMap(patch.featuresEnabled, normaliseFeatureMap(current.featuresEnabled))));
  }
  await query(`UPDATE pg_accounts SET ${sets.join(', ')} WHERE id = $1`, params);
  // Keep the settings copy of address/city (shown to tenants) in step with the location.
  if (loc && (loc.address !== undefined || loc.city !== undefined)) {
    await updateSettings(pgId, { address: loc.address, city: loc.city });
  }
  return getOwner(pgId);
};

// ---------- Admin views ----------
export const adminListPgs = ({ search } = {}) => {
  const params = [];
  let where = '';
  if (search) { params.push(`%${search}%`); where = `WHERE p.pg_name ILIKE $1 OR p.owner_name ILIKE $1 OR p.city ILIKE $1 OR p.pg_username ILIKE $1 OR p.owner_email ILIKE $1`; }
  return query(
    `SELECT p.id, p.pg_name, p.pg_username, p.city, p.area, p.pg_type, p.owner_name, p.owner_email, p.owner_mobile,
            p.is_active, p.is_discoverable, p.approval_status, p.features_allowed, p.features_enabled, p.created_at,
            (SELECT count(*) FROM rooms r WHERE r.pg_id = p.id) AS rooms,
            (SELECT count(*) FROM beds b WHERE b.pg_id = p.id) AS beds,
            (SELECT count(*) FROM tenants t WHERE t.pg_id = p.id AND t.status <> 'Left') AS tenants,
            (SELECT count(*) FROM managers m WHERE m.pg_id = p.id) AS managers
       FROM pg_accounts p ${where} ORDER BY p.created_at DESC LIMIT 500`,
    params
  );
};

export const adminOverview = () =>
  one(
    `SELECT (SELECT count(*) FROM pg_accounts) AS pgs,
            (SELECT count(*) FROM pg_accounts WHERE is_active) AS active_pgs,
            (SELECT count(*) FROM tenants WHERE status <> 'Left') AS tenants,
            (SELECT count(*) FROM managers) AS managers,
            (SELECT count(*) FROM beds) AS beds,
            (SELECT count(*) FROM tenants WHERE bed_id IS NOT NULL) AS occupied_beds,
            (SELECT count(*) FROM enquiries WHERE status = 'New') AS new_enquiries`
  );

export const adminUpdatePg = async (id, { featuresAllowed, isActive, isDiscoverable, approvalStatus }) => {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (featuresAllowed) {
    const current = await getOwner(id);
    if (!current) return null;
    add('features_allowed', JSON.stringify(normaliseFeatureMap(featuresAllowed, normaliseFeatureMap(current.featuresAllowed))));
  }
  if (isActive !== undefined) add('is_active', isActive);
  if (isDiscoverable !== undefined) add('is_discoverable', isDiscoverable);
  if (approvalStatus !== undefined) {
    add('approval_status', approvalStatus);
    if (approvalStatus === 'Approved') {
      add('is_active', true);
      add('is_discoverable', true);
    } else if (approvalStatus === 'Rejected') {
      add('is_active', false);
      add('is_discoverable', false);
    }
  }
  const row = await one(`UPDATE pg_accounts SET ${sets.join(', ')} WHERE id = $1 RETURNING id`, params);
  return row ? getOwner(id) : null;
};
