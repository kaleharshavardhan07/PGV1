import ApiError from '../utils/apiError.js';
import { verifyToken } from '../services/tokenService.js';
import { PgAccount, TenantUser, Manager } from '../models/index.js';

/**
 * Authenticates the request using the Bearer token and loads the principal.
 * Attaches `req.user` = { id, role, pgId, doc }.
 */
export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    const { sub, role, pgId } = payload;
    if (!sub || !role) throw ApiError.unauthorized('Malformed token');

    let doc = null;
    let resolvedPgId = pgId ?? null;

    if (role === 'owner') {
      doc = await PgAccount.findById(sub).lean();
      resolvedPgId = sub;
    } else if (role === 'manager') {
      doc = await Manager.findById(sub).lean();
      resolvedPgId = doc?.pg?.toString() ?? null;
    } else if (role === 'tenant') {
      doc = await TenantUser.findById(sub).lean();
    } else {
      throw ApiError.unauthorized('Unknown role in token');
    }

    if (!doc) throw ApiError.unauthorized('Account no longer exists');

    req.user = { id: String(sub), role, pgId: resolvedPgId, doc };
    next();
  } catch (err) {
    next(err);
  }
};

/** Restrict a route to the given roles. Must be used after `requireAuth`. */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${roles.join(', ')}`));
    }
    return next();
  };
