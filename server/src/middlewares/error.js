import { ZodError } from 'zod';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Friendly messages for the unique/check constraints users can realistically hit.
const UNIQUE_MESSAGES = {
  pg_accounts_pg_username_key: 'This PG username is already taken',
  pg_accounts_owner_email_key: 'An account with this email already exists. Please log in instead.',
  pg_accounts_owner_mobile_key: 'An account with this mobile number already exists. Please log in instead.',
  managers_email_key: 'A manager with this email already exists',
  rooms_pg_id_room_number_key: 'A room with this number already exists',
  beds_room_id_bed_number_key: 'This room already has a bed with that number',
  tenants_bed_uniq: 'This bed is already occupied',
  tenants_live_mobile_uniq: 'This mobile number already belongs to an active tenant account',
};

const describePgError = (err) => {
  if (err.code === '23505') return { status: 409, message: UNIQUE_MESSAGES[err.constraint] ?? 'That value already exists' };
  if (err.code === '23503') return { status: 409, message: 'This record is still referenced by other data' };
  if (err.code === '22P02') return { status: 400, message: 'Invalid identifier or value' };
  return { status: 400, message: 'Invalid data' };
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Zod validation errors -> 400 with field-level details
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }

  // PostgreSQL constraint violations -> readable 4xx responses
  if (typeof err.code === 'string' && /^(23|22)/.test(err.code)) {
    const { status, message } = describePgError(err);
    return res.status(status).json({ success: false, message });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error(err.stack || err.message || String(err));
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
};
