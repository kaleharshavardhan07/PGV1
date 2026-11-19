import { query, one } from '../db/index.js';

// Metadata only: the `data` bytea column is fetched separately for downloads.
const DOC_SELECT = `
  SELECT d.id, d.pg_id, d.tenant_id, t.full_name AS tenant_name, d.type, d.title, d.file_name, d.mime_type,
         d.size, d.uploaded_by_id, d.uploaded_by_role, d.uploaded_by_name, d.created_at
    FROM documents d JOIN tenants t ON t.id = d.tenant_id`;

export const listDocuments = ({ pgId, tenantId }) => {
  const params = [pgId];
  let where = 'WHERE d.pg_id = $1';
  if (tenantId) { params.push(tenantId); where += ` AND d.tenant_id = $${params.length}`; }
  return query(`${DOC_SELECT} ${where} ORDER BY d.created_at DESC`, params);
};

export const getDocument = (pgId, id) => one(`${DOC_SELECT} WHERE d.id = $1 AND d.pg_id = $2`, [id, pgId]);

export const getDocumentData = (pgId, id) =>
  one('SELECT file_name, mime_type, size, data FROM documents WHERE id = $1 AND pg_id = $2', [id, pgId]);

export const createDocument = async ({ pgId, tenantId, type, title, file, uploader }) => {
  const row = await one(
    `INSERT INTO documents (pg_id, tenant_id, type, title, file_name, mime_type, size, uploaded_by_id, uploaded_by_role, uploaded_by_name, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [pgId, tenantId, type, title, file.originalname, file.mimetype, file.size, uploader.id, uploader.role, uploader.name, file.buffer]
  );
  return getDocument(pgId, row.id);
};

export const deleteDocument = (pgId, id) => query('DELETE FROM documents WHERE id = $1 AND pg_id = $2', [id, pgId]);
