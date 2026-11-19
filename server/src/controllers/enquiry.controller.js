import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { query, one } from '../db/index.js';

export const listEnquiries = asyncHandler(async (req, res) => {
  const rows = await query(
    'SELECT id, name, mobile, email, message, status, created_at FROM enquiries WHERE pg_id = $1 ORDER BY created_at DESC LIMIT 500',
    [req.pgId]
  );
  res.json({ success: true, enquiries: rows });
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const row = await one(
    'UPDATE enquiries SET status = $3 WHERE id = $1 AND pg_id = $2 RETURNING id, name, mobile, email, message, status, created_at',
    [req.params.id, req.pgId, req.body.status]
  );
  if (!row) throw ApiError.notFound('Enquiry not found');
  res.json({ success: true, enquiry: row });
});
