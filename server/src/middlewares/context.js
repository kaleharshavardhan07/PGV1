import ApiError from '../utils/apiError.js';
import { Membership } from '../models/index.js';

/** Ensures the authenticated principal has a resolved PG, attached as req.pgId. */
export const requirePg = (req, _res, next) => {
  if (!req.user?.pgId) return next(ApiError.forbidden('No PG workspace bound to this account'));
  req.pgId = req.user.pgId;
  next();
};

/**
 * For tenant principals, resolves the per-PG tenant record id (req.tenantId)
 * from the active membership. For manager/owner, leaves req.tenantId unset.
 */
export const resolveTenantRecord = async (req, _res, next) => {
  try {
    if (req.user?.role !== 'tenant') return next();
    const membership = await Membership.findOne({
      tenantUser: req.user.id,
      pg: req.pgId,
      status: 'Active',
    }).lean();
    if (!membership) return next(ApiError.forbidden('No active membership for this PG'));
    req.tenantId = String(membership.tenant);
    next();
  } catch (err) {
    next(err);
  }
};
