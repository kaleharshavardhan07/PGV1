// Notification automation engine.
// Scans PG data and raises notifications for events that need attention. It is
// idempotent: every draft carries a dedupe key backed by a unique DB constraint,
// so re-running it never duplicates a notification.
import { query } from '../db/index.js';
import { getSettings } from '../repositories/accounts.js';
import { insertNotification, insertLog, listAllPrefs } from '../repositories/notifications.js';
import { buildLogs } from './deliveryService.js';
import logger from '../utils/logger.js';

const inr = (n) => Number(n).toLocaleString('en-IN');

export async function runNotificationEngine(pgId) {
  try {
    return await run(pgId);
  } catch (err) {
    // The engine is a side effect of other actions; it must never fail them.
    logger.error(`notification engine failed: ${err.message}`);
    return { emitted: 0 };
  }
}

async function run(pgId) {
  const { settings, reminderSchedule } = await getSettings(pgId);
  const prefs = await listAllPrefs(pgId);
  const drafts = [];
  const now = Date.now();

  // ---------- A. Complaints open longer than the configured threshold ----------
  const stale = await query(
    `SELECT c.id, c.category, c.room_number, t.full_name
       FROM complaints c JOIN tenants t ON t.id = c.tenant_id
      WHERE c.pg_id = $1 AND c.status <> 'Resolved'
        AND c.submitted_at <= now() - make_interval(hours => $2)`,
    [pgId, reminderSchedule.complaintUnresolvedHours]
  );
  for (const c of stale) {
    drafts.push({
      dedupeKey: `complaint-stale-${c.id}-${reminderSchedule.complaintUnresolvedHours}h`,
      category: 'Complaint', userRole: 'manager', userId: 'all', audience: 'staff',
      title: 'Complaint Not Resolved In Time',
      message: `${c.fullName}'s ${c.category} complaint (Room ${c.roomNumber}) has been open for over ${reminderSchedule.complaintUnresolvedHours} hours. Please update its status.`,
      type: 'warning', link: '/app/manager/complaints',
    });
  }

  // ---------- B. New tenants (joined in the last day) ----------
  const joined = await query(
    `SELECT t.id, t.full_name, r.room_number, b.bed_number
       FROM tenants t LEFT JOIN beds b ON b.id = t.bed_id LEFT JOIN rooms r ON r.id = b.room_id
      WHERE t.pg_id = $1 AND t.created_at >= now() - interval '1 day'`,
    [pgId]
  );
  for (const t of joined) {
    drafts.push({
      dedupeKey: `tenant-added-${t.id}`,
      category: 'Tenant', userRole: 'manager', userId: 'all', audience: 'staff',
      title: 'New Tenant Added',
      message: `${t.fullName} was added to Room ${t.roomNumber ?? '-'} (Bed ${t.bedNumber ?? '-'}). Upload their documents and complete verification.`,
      type: 'info', link: '/app/manager/tenants',
    });
  }

  // ---------- Materialise ----------
  let emitted = 0;
  for (const draft of drafts) {
    const inserted = await insertNotification(pgId, { ...draft, createdAt: new Date(now).toISOString() });
    if (!inserted) continue;
    emitted++;
    const tenantPrefs = draft.tenantId ? prefs.find((p) => p.tenantId === draft.tenantId) : undefined;
    const logs = buildLogs(draft, { channels: settings.channels, prefs: tenantPrefs, retryAttempts: reminderSchedule.retryAttempts });
    for (const log of logs) await insertLog(pgId, log);
  }
  return { emitted };
}

