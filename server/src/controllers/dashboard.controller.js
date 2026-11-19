import asyncHandler from '../utils/asyncHandler.js';
import { query, one } from '../db/index.js';
import * as ops from '../repositories/operations.js';
import * as tenants from '../repositories/tenants.js';
import * as rooms from '../repositories/rooms.js';
import * as finance from '../repositories/finance.js';
import { getSettings } from '../repositories/accounts.js';

const may = (req, key) => req.user.features[key] !== false && req.user.permissions[key] === true;

/** Role-specific dashboard payload. Sections the caller can't use are omitted (null). */
export const summary = asyncHandler(async (req, res) => {
  const { pgId } = req;
  const { settings } = await getSettings(pgId);

  if (req.user.role === 'tenant') {
    const me = await tenants.getTenant(pgId, req.tenantId);
    const out = { role: 'tenant', pgName: settings.name, tenant: me };
    if (req.user.features.billing) {
      const t = await finance.tenantInvoiceTotals(pgId, req.tenantId);
      out.invoices = { outstandingCount: t.outstandingCount, outstandingAmount: t.outstandingAmount, overdueCount: t.overdueCount };
    }
    if (req.user.features.expenses) {
      out.expenses = { recent: (await finance.listExpenses({ pgId, tenantView: true })).slice(0, 5) };
    }
    if (req.user.features.food) {
      const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      out.todayMenu = await ops.listMenu({ pgId, day });
    }
    if (req.user.features.documents) {
      out.documents = (await one('SELECT count(*)::int AS n FROM documents WHERE pg_id = $1 AND tenant_id = $2', [pgId, req.tenantId])).n;
    }
    return res.json({ success: true, summary: out });
  }

  const counts = await rooms.vacancyCounts(pgId);
  const t = await one(
    `SELECT count(*) FILTER (WHERE status = 'Active')::int AS active,
            count(*) FILTER (WHERE status = 'Notice Period')::int AS notice,
            count(*) FILTER (WHERE status <> 'Left' AND police_verification = 'Pending')::int AS pending_verification
       FROM tenants WHERE pg_id = $1`,
    [pgId]
  );
  const out = {
    role: req.user.role,
    pgName: settings.name,
    ...counts,
    occupancyPercent: counts.totalBeds ? Math.round((counts.occupiedBeds / counts.totalBeds) * 100) : 0,
    totalTenants: t.active + t.notice,
    activeTenants: t.active,
    noticeTenants: t.notice,
    pendingVerification: t.pendingVerification,
    expenses: null, invoices: null, openComplaints: null, newEnquiries: null, documents: null,
  };
  if (may(req, 'expenses')) {
    const e = await finance.expenseTotals(pgId);
    out.expenses = { pendingCount: e.pendingCount, pendingAmount: e.pendingAmount, monthAmount: e.monthAmount };
  }
  if (may(req, 'billing')) out.invoices = await finance.invoiceTotals(pgId);
  if (may(req, 'complaints')) {
    out.openComplaints = (await one(`SELECT count(*)::int AS n FROM complaints WHERE pg_id = $1 AND status <> 'Resolved'`, [pgId])).n;
  }
  if (may(req, 'documents')) out.documents = (await one('SELECT count(*)::int AS n FROM documents WHERE pg_id = $1', [pgId])).n;
  if (req.user.role === 'owner') {
    out.newEnquiries = (await one(`SELECT count(*)::int AS n FROM enquiries WHERE pg_id = $1 AND status = 'New'`, [pgId])).n;
  }
  res.json({ success: true, summary: out });
});

// Identity, PG and what this user may use: drives the frontend's navigation.
export const context = asyncHandler(async (req, res) => {
  const { role, pgId, id } = req.user;
  if (role === 'admin') return res.json({ success: true, role, pgId: null, pgName: '', features: {}, permissions: {}, tenant: null });
  const { settings } = await getSettings(pgId);
  res.json({
    success: true, role, pgId, pgName: settings.name,
    features: req.user.features, permissions: req.user.permissions,
    tenant: role === 'tenant' ? await tenants.getTenant(pgId, id) : null,
  });
});
