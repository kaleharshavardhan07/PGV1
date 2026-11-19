import { query, one, transaction } from '../db/index.js';
import ApiError from '../utils/apiError.js';

// ============================ Expenses ============================
const EXPENSE_SELECT = `
  SELECT e.id, e.pg_id, e.title, e.description, e.amount, e.expense_date, e.category, e.status,
         e.visible_to_tenants, e.proof_required, e.created_by_role, e.created_at,
         (SELECT count(*) FROM documents d WHERE d.expense_id = e.id) AS document_count
    FROM expenses e`;

export const listExpenses = ({ pgId, tenantView, status, category, from, to }) => {
  const params = [pgId];
  let where = 'WHERE e.pg_id = $1';
  if (tenantView) where += ' AND e.visible_to_tenants';
  if (status) { params.push(status); where += ` AND e.status = $${params.length}`; }
  if (category) { params.push(category); where += ` AND e.category = $${params.length}`; }
  if (from) { params.push(from); where += ` AND e.expense_date >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND e.expense_date <= $${params.length}`; }
  return query(`${EXPENSE_SELECT} ${where} ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 1000`, params);
};

export const getExpense = (pgId, id) => one(`${EXPENSE_SELECT} WHERE e.id = $1 AND e.pg_id = $2`, [id, pgId]);

export const createExpense = async (pgId, data, creator) => {
  const row = await one(
    `INSERT INTO expenses (pg_id, title, description, amount, expense_date, category, status, visible_to_tenants, proof_required, created_by_id, created_by_role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [pgId, data.title, data.description ?? '', data.amount, data.expenseDate, data.category, data.status ?? 'Pending',
      data.visibleToTenants ?? true, data.proofRequired ?? false, creator.id, creator.role]
  );
  return getExpense(pgId, row.id);
};

const EXPENSE_COLUMNS = {
  title: 'title', description: 'description', amount: 'amount', expenseDate: 'expense_date', category: 'category',
  status: 'status', visibleToTenants: 'visible_to_tenants', proofRequired: 'proof_required',
};

export const updateExpense = async (pgId, id, patch) => {
  const sets = ['updated_at = now()'];
  const params = [id, pgId];
  for (const [k, col] of Object.entries(EXPENSE_COLUMNS)) if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col} = $${params.length}`); }
  const row = await one(`UPDATE expenses SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 RETURNING id`, params);
  return row ? getExpense(pgId, id) : null;
};

export const deleteExpense = (pgId, id) => one('DELETE FROM expenses WHERE id = $1 AND pg_id = $2 RETURNING id, title', [id, pgId]);

export const expenseTotals = (pgId) =>
  one(
    `SELECT count(*) FILTER (WHERE status = 'Pending') AS pending_count,
            COALESCE(sum(amount) FILTER (WHERE status = 'Pending'), 0) AS pending_amount,
            COALESCE(sum(amount) FILTER (WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)), 0) AS month_amount
       FROM expenses WHERE pg_id = $1`,
    [pgId]
  );

// ============================ Invoices ============================
// "Overdue" is derived (Issued and past due) so it can never go stale.
const INVOICE_SELECT = `
  SELECT i.id, i.pg_id, i.tenant_id, t.full_name AS tenant_name, r.room_number, i.number, i.billing_period, i.description,
         i.amount, i.due_date, i.status, i.paid_on, i.payment_note, i.created_at,
         (i.status = 'Issued' AND i.due_date < CURRENT_DATE) AS overdue,
         (SELECT count(*) FROM documents d WHERE d.invoice_id = i.id) AS document_count
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
    LEFT JOIN beds b ON b.id = t.bed_id
    LEFT JOIN rooms r ON r.id = b.room_id`;

export const listInvoices = ({ pgId, tenantId, status, period, search }) => {
  const params = [pgId];
  let where = 'WHERE i.pg_id = $1';
  if (tenantId) { params.push(tenantId); where += ` AND i.tenant_id = $${params.length} AND i.status <> 'Draft'`; }
  if (status === 'Overdue') where += " AND i.status = 'Issued' AND i.due_date < CURRENT_DATE";
  else if (status) { params.push(status); where += ` AND i.status = $${params.length}`; }
  if (period) { params.push(period); where += ` AND i.billing_period = $${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` AND (t.full_name ILIKE $${params.length} OR i.number ILIKE $${params.length})`; }
  return query(`${INVOICE_SELECT} ${where} ORDER BY i.created_at DESC LIMIT 1000`, params);
};

export const getInvoice = (pgId, id) => one(`${INVOICE_SELECT} WHERE i.id = $1 AND i.pg_id = $2`, [id, pgId]);

/** Create one invoice per tenant, numbering sequentially per PG and year (INV-2026-0007). */
export const createInvoices = (pgId, tenantIds, data, creatorId) =>
  transaction(async (tx) => {
    const valid = await query(
      `SELECT id FROM tenants WHERE pg_id = $1 AND id = ANY($2::uuid[]) AND status <> 'Left'`,
      [pgId, tenantIds],
      tx
    );
    if (valid.length !== new Set(tenantIds).size) throw ApiError.badRequest('One or more tenants were not found or have moved out');

    // Serialise numbering per PG so concurrent requests can't produce duplicates.
    await query('SELECT pg_advisory_xact_lock(hashtext($1))', [pgId], tx);
    const year = new Date().getFullYear();
    let seq = (await one('SELECT count(*)::int AS n FROM invoices WHERE pg_id = $1 AND number LIKE $2', [pgId, `INV-${year}-%`], tx)).n;

    const ids = [];
    for (const { id } of valid) {
      seq += 1;
      const row = await one(
        `INSERT INTO invoices (pg_id, tenant_id, number, billing_period, description, amount, due_date, status, created_by_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [pgId, id, `INV-${year}-${String(seq).padStart(4, '0')}`, data.billingPeriod, data.description ?? '', data.amount, data.dueDate, data.status ?? 'Draft', creatorId],
        tx
      );
      ids.push(row.id);
    }
    return ids;
  });

export const updateInvoice = async (pgId, id, patch) => {
  const map = { billingPeriod: 'billing_period', description: 'description', amount: 'amount', dueDate: 'due_date' };
  const sets = ['updated_at = now()'];
  const params = [id, pgId];
  for (const [k, col] of Object.entries(map)) if (patch[k] !== undefined) { params.push(patch[k]); sets.push(`${col} = $${params.length}`); }
  const row = await one(
    `UPDATE invoices SET ${sets.join(', ')} WHERE id = $1 AND pg_id = $2 AND status IN ('Draft','Issued') RETURNING id`,
    params
  );
  return row ? getInvoice(pgId, id) : null;
};

const TRANSITIONS = {
  issue: { from: ['Draft'], to: 'Issued' },
  paid: { from: ['Issued'], to: 'Paid' },
  cancel: { from: ['Draft', 'Issued'], to: 'Cancelled' },
  reopen: { from: ['Paid'], to: 'Issued' },
};

/** Move an invoice through its lifecycle. Returns null when the transition is not allowed. */
export const transitionInvoice = async (pgId, id, action, { paidOn, paymentNote } = {}) => {
  const t = TRANSITIONS[action];
  const row = await one(
    `UPDATE invoices SET status = $3::text, updated_at = now(),
            paid_on = CASE WHEN $3::text = 'Paid' THEN COALESCE($4::date, CURRENT_DATE) ELSE NULL END,
            payment_note = CASE WHEN $3::text = 'Paid' THEN COALESCE($5::text, '') ELSE '' END
      WHERE id = $1 AND pg_id = $2 AND status = ANY($6::text[]) RETURNING id`,
    [id, pgId, t.to, paidOn ?? null, paymentNote ?? null, t.from]
  );
  return row ? getInvoice(pgId, id) : null;
};

export const deleteDraftInvoice = (pgId, id) =>
  one(`DELETE FROM invoices WHERE id = $1 AND pg_id = $2 AND status = 'Draft' RETURNING id`, [id, pgId]);

export const invoiceTotals = (pgId) =>
  one(
    `SELECT count(*) FILTER (WHERE status = 'Draft') AS drafts,
            count(*) FILTER (WHERE status = 'Issued') AS outstanding_count,
            COALESCE(sum(amount) FILTER (WHERE status = 'Issued'), 0) AS outstanding_amount,
            count(*) FILTER (WHERE status = 'Issued' AND due_date < CURRENT_DATE) AS overdue_count,
            COALESCE(sum(amount) FILTER (WHERE status = 'Issued' AND due_date < CURRENT_DATE), 0) AS overdue_amount,
            COALESCE(sum(amount) FILTER (WHERE status = 'Paid' AND date_trunc('month', paid_on) = date_trunc('month', CURRENT_DATE)), 0) AS paid_this_month
       FROM invoices WHERE pg_id = $1`,
    [pgId]
  );

export const tenantInvoiceTotals = (pgId, tenantId) =>
  one(
    `SELECT count(*) FILTER (WHERE status = 'Issued') AS outstanding_count,
            COALESCE(sum(amount) FILTER (WHERE status = 'Issued'), 0) AS outstanding_amount,
            count(*) FILTER (WHERE status = 'Issued' AND due_date < CURRENT_DATE) AS overdue_count
       FROM invoices WHERE pg_id = $1 AND tenant_id = $2`,
    [pgId, tenantId]
  );
