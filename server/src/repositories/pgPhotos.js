import { one, query } from '../db/index.js';

export const listPhotoIds = (pgId) =>
  query('SELECT id FROM pg_photos WHERE pg_id = $1 ORDER BY sort_order, created_at', [pgId]);

export const getPhoto = (pgId, id) =>
  one('SELECT file_name, mime_type, size, data FROM pg_photos WHERE pg_id = $1 AND id = $2', [pgId, id]);
