import { query, one } from '../db/index.js';

// Metadata only: the `data` bytea column is fetched separately for downloads.
const DOC_SELECT = `
  SELECT d.id, d.pg_id, d.tenant_id, t.full_name AS tenant_name, d.expense_id, d.invoice_id, d.type, d.title,
         d.file_name, d.mime_type, d.size, d.uploaded_by_id, d.uploaded_by_role, d.uploaded_by_name, d.created_at
    FROM documents d LEFT JOIN tenants t ON t.id = d.tenant_id`;

/**
 * What a tenant may see: their own documents, documents on their own (non-draft) invoices, and
 * documents on expenses shared with tenants, except receipts other tenants uploaded.
 */
const tenantScope = (idx) => `(
  d.tenant_id = $${idx}
  OR d.invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $${idx} AND status <> 'Draft')
  OR (d.expense_id IN (SELECT id FROM expenses WHERE pg_id = d.pg_id AND visible_to_tenants)
      AND (d.uploaded_by_role <> 'tenant' OR d.uploaded_by_id = $${idx}::text))
)`;

export const listDocuments = ({ pgId, tenantId, expenseId, invoiceId, viewerTenantId }) => {
  const params = [pgId];
  let where = 'WHERE d.pg_id = $1';
  if (viewerTenantId) { params.push(viewerTenantId); where += ` AND ${tenantScope(params.length)}`; }
  if (tenantId) { params.push(tenantId); where += ` AND d.tenant_id = $${params.length}`; }
  if (expenseId) { params.push(expenseId); where += ` AND d.expense_id = $${params.length}`; }
  if (invoiceId) { params.push(invoiceId); where += ` AND d.invoice_id = $${params.length}`; }
  return query(`${DOC_SELECT} ${where} ORDER BY d.created_at DESC`, params);
};

/** One document's metadata, only if the viewer (staff, or a specific tenant) may see it. */
export const getDocument = (pgId, id, viewerTenantId) => {
  const params = [id, pgId];
  let where = 'WHERE d.id = $1 AND d.pg_id = $2';
  if (viewerTenantId) { params.push(viewerTenantId); where += ` AND ${tenantScope(params.length)}`; }
  return one(`${DOC_SELECT} ${where}`, params);
};

export const getDocumentData = (pgId, id) =>
  one('SELECT file_name, mime_type, size, data FROM documents WHERE id = $1 AND pg_id = $2', [id, pgId]);

export const createDocument = async ({ pgId, tenantId, expenseId, invoiceId, type, title, file, uploader }) => {
  const row = await one(
    `INSERT INTO documents (pg_id, tenant_id, expense_id, invoice_id, type, title, file_name, mime_type, size,
                            uploaded_by_id, uploaded_by_role, uploaded_by_name, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [pgId, tenantId ?? null, expenseId ?? null, invoiceId ?? null, type, title, file.originalname, file.mimetype,
      file.size, uploader.id, uploader.role, uploader.name, file.buffer]
  );
  return getDocument(pgId, row.id);
};

export const deleteDocument = (pgId, id) => query('DELETE FROM documents WHERE id = $1 AND pg_id = $2', [id, pgId]);
