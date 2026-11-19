import { query, one } from '../db/index.js';

const N_SELECT = 'SELECT id, user_id, user_role, title, message, type, read, link, category, dedupe_key, created_at FROM notifications';

// A principal sees notifications addressed to them or broadcast to their role ('all').
const audienceClause = (role, tenantId, params) => {
  if (role === 'tenant') {
    params.push(tenantId);
    return `(user_id = $${params.length} OR user_id = 'all')`;
  }
  return `(user_id IN ('${role}', 'all'))`;
};

export const listFor = ({ pgId, role, tenantId }) => {
  const params = [pgId, role];
  const aud = audienceClause(role, tenantId, params);
  return query(`${N_SELECT} WHERE pg_id = $1 AND user_role = $2 AND ${aud} ORDER BY created_at DESC LIMIT 100`, params);
};

export const markRead = (pgId, role, tenantId, id) => {
  const params = [id, pgId, role];
  const aud = audienceClause(role, tenantId, params);
  return one(`UPDATE notifications SET read = true WHERE id = $1 AND pg_id = $2 AND user_role = $3 AND ${aud} RETURNING id`, params);
};

export const markAllRead = async ({ pgId, role, tenantId }) => {
  const params = [pgId, role];
  const aud = audienceClause(role, tenantId, params);
  return (await query(`UPDATE notifications SET read = true WHERE pg_id = $1 AND user_role = $2 AND ${aud} AND NOT read RETURNING id`, params)).length;
};

export const getPrefs = async (pgId, tenantId) =>
  (await one('SELECT whatsapp, sms, email FROM notification_prefs WHERE tenant_id = $1 AND pg_id = $2', [tenantId, pgId])) ?? {
    whatsapp: true, sms: true, email: true,
  };

export const listAllPrefs = (pgId) =>
  query(
    `SELECT p.tenant_id, t.full_name AS tenant_name, p.whatsapp, p.sms, p.email
       FROM notification_prefs p JOIN tenants t ON t.id = p.tenant_id WHERE p.pg_id = $1`,
    [pgId]
  );

export const setPrefs = (pgId, tenantId, { whatsapp, sms, email }) =>
  one(
    `INSERT INTO notification_prefs (tenant_id, pg_id, whatsapp, sms, email) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (tenant_id) DO UPDATE SET whatsapp = EXCLUDED.whatsapp, sms = EXCLUDED.sms, email = EXCLUDED.email
     RETURNING tenant_id, whatsapp, sms, email`,
    [tenantId, pgId, whatsapp, sms, email]
  );

export const listLog = (pgId) =>
  query(
    `SELECT id, dedupe_key, category, title, recipient, recipient_role, channel, status, attempts, note, created_at
       FROM notification_logs WHERE pg_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [pgId]
  );

/** Insert a notification unless its dedupe key already exists. Returns true if inserted. */
export const insertNotification = async (pgId, n) => {
  const row = await one(
    `INSERT INTO notifications (pg_id, user_id, user_role, title, message, type, link, category, dedupe_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (pg_id, dedupe_key) DO NOTHING RETURNING id`,
    [pgId, n.userId, n.userRole, n.title, n.message, n.type, n.link ?? null, n.category ?? null, n.dedupeKey]
  );
  return Boolean(row);
};

export const insertLog = (pgId, l) =>
  query(
    `INSERT INTO notification_logs (pg_id, dedupe_key, category, title, recipient, recipient_role, channel, status, attempts, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [pgId, l.dedupeKey, l.category, l.title, l.recipient, l.recipientRole, l.channel, l.status, l.attempts, l.note ?? null]
  );

export const recordAudit = (pgId, actor, action, entity, entityId, details = '') =>
  query('INSERT INTO audit_logs (pg_id, actor, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)', [
    pgId, actor, action, entity, String(entityId), details,
  ]);
