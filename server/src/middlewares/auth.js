import ApiError from '../utils/apiError.js';
import { verifyToken } from '../services/tokenService.js';
import { getOwner, getManager } from '../repositories/accounts.js';
import { getTenantById } from '../repositories/tenants.js';

/** Extract a Bearer token from the Authorization header. */
const bearer = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

/**
 * Load the principal named by a verified token payload.
 * Returns { id, role, pgId, tenantId?, doc }.
 */
export const loadPrincipal = async (payload) => {
  const { sub, role } = payload;
  if (!sub || !role) throw ApiError.unauthorized('Malformed token');

  if (role === 'owner') {
    const doc = await getOwner(sub);
    if (!doc || !doc.isActive) throw ApiError.unauthorized('Account no longer exists');
    return { id: doc.id, role, pgId: doc.id, doc };
  }
  if (role === 'manager') {
    const doc = await getManager(sub);
    if (!doc) throw ApiError.unauthorized('Account no longer exists');
    return { id: doc.id, role, pgId: doc.pgId, doc };
  }
  if (role === 'tenant') {
    const doc = await getTenantById(sub);
    if (!doc) throw ApiError.unauthorized('Account no longer exists');
    if (doc.status === 'Left') throw ApiError.unauthorized('This account has been deactivated');
    return { id: doc.id, role, pgId: doc.pgId, tenantId: doc.id, doc };
  }
  throw ApiError.unauthorized('Unknown role in token');
};

/**
 * Authenticates the request using the Bearer token and loads the principal.
 * Attaches `req.user` = { id, role, pgId, doc } and, for tenants, `req.tenantId`.
 */
export const requireAuth = async (req, _res, next) => {
  try {
    const token = bearer(req);
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    // Short-lived file-link tokens are not session tokens.
    if (payload.purpose) throw ApiError.unauthorized('Invalid token');

    req.user = await loadPrincipal(payload);
    if (req.user.tenantId) req.tenantId = req.user.tenantId;
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

/** Like requireAuth, but lets anonymous requests through (they must authenticate another way). */
export const optionalAuth = (req, res, next) => (bearer(req) ? requireAuth(req, res, next) : next());
