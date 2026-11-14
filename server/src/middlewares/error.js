import { ZodError } from 'zod';
import ApiError from '../utils/apiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Zod validation errors -> 400 with field-level details
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }

  // Mongoose validation / cast errors -> 400
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
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
