import { query, one, transaction } from '../db/index.js';

const OWNER_COLUMNS = `id, pg_name, pg_username, description, address, city, state, pin_code, pg_type,
  owner_name, owner_email, owner_mobile, is_active, is_discoverable, show_available_beds, created_at, updated_at`;

export const getOwner = (id) => one(`SELECT ${OWNER_COLUMNS} FROM pg_accounts WHERE id = $1`, [id]);

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
export const createOwner = ({ owner, pg, pgUsername, passwordHash }) =>
  transaction(async (tx) => {
    const account = await one(
      `INSERT INTO pg_accounts
         (pg_name, pg_username, description, address, city, state, pin_code, pg_type,
          owner_name, owner_email, owner_mobile, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING ${OWNER_COLUMNS}`,
      [
        pg.pgName, pgUsername, pg.description ?? '', pg.address, pg.city, pg.state ?? '', pg.pinCode ?? '',
        pg.pgType ?? 'Other', owner.fullName, owner.email.toLowerCase(), owner.mobile, passwordHash,
      ],
      tx
    );
    await query(
      `INSERT INTO workspace_settings (pg_id, name, address, city, contact_email, contact_phone, owner_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [account.id, pg.pgName, pg.address, pg.city, owner.email.toLowerCase(), owner.mobile, owner.fullName],
      tx
    );
    return account;
  });

export const findManagerForLogin = (email) =>
  one('SELECT id, pg_id, full_name, email, mobile, password_hash FROM managers WHERE email = $1', [email.toLowerCase()]);

export const getManager = (id) => one('SELECT id, pg_id, full_name, email, mobile FROM managers WHERE id = $1', [id]);

export const setPassword = async (role, id, passwordHash) => {
  const table = { owner: 'pg_accounts', manager: 'managers', tenant: 'tenants' }[role];
  await query(`UPDATE ${table} SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);
  if (role === 'tenant') await query('UPDATE tenants SET password_changed_at = now() WHERE id = $1', [id]);
};

export const getPasswordHash = async (role, id) => {
  const table = { owner: 'pg_accounts', manager: 'managers', tenant: 'tenants' }[role];
  return (await one(`SELECT password_hash FROM ${table} WHERE id = $1`, [id]))?.passwordHash ?? null;
};

// ---------- Settings ----------
const SETTINGS_SELECT = `name, address, city, contact_email, contact_phone, owner_name, electricity_rate,
  timezone, channel_whatsapp, channel_sms, channel_email, complaint_unresolved_hours, retry_attempts`;

const shapeSettings = (r) => ({
  settings: {
    name: r.name,
    address: r.address,
    city: r.city,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    ownerName: r.ownerName,
    electricityRate: r.electricityRate,
       timezone: r.timezone,
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
  ownerName: 'owner_name', electricityRate: 'electricity_rate', timezone: 'timezone',
  complaintUnresolvedHours: 'complaint_unresolved_hours', retryAttempts: 'retry_attempts',
};

export const updateSettings = async (pgId, patch) => {
  const sets = [];
  const params = [pgId];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  for (const [key, col] of Object.entries(SETTINGS_COLUMNS)) if (patch[key] !== undefined) add(col, patch[key]);
  for (const ch of ['whatsapp', 'sms', 'email']) if (patch.channels?.[ch] !== undefined) add(`channel_${ch}`, patch.channels[ch]);
  if (sets.length) {
    await getSettings(pgId); // ensure row exists
    await query(`UPDATE workspace_settings SET ${sets.join(', ')} WHERE pg_id = $1`, params);
  }
  return getSettings(pgId);
};

export const updateVisibility = (pgId, { isDiscoverable, showAvailableBeds }) =>
  query(
    `UPDATE pg_accounts SET is_discoverable = COALESCE($2, is_discoverable),
       show_available_beds = COALESCE($3, show_available_beds), updated_at = now() WHERE id = $1`,
    [pgId, isDiscoverable ?? null, showAvailableBeds ?? null]
  );
