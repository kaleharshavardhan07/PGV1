import ApiError from '../utils/apiError.js';
import { requireAuth, requireRole } from './auth.js';
import { requirePg } from './context.js';

/** Block a route when the PG's module is switched off (by the admin or the owner). */
export const requireFeature = (feature) => (req, _res, next) => {
  if (req.user?.features?.[feature] === false) {
    return next(new ApiError(403, `The ${feature} feature is not enabled for this PG`));
  }
  next();
};

/**
 * Owners always pass. Managers need the permission the owner granted them.
 * Tenants pass only when `allowTenant` is set (for routes that scope their own data).
 */
export const requirePermission = (permission, { allowTenant = false } = {}) => (req, _res, next) => {
  const { role, permissions } = req.user ?? {};
  if (role === 'owner') return next();
  if (role === 'tenant' && allowTenant) return next();
  if (role === 'manager' && permissions?.[permission]) return next();
  return next(ApiError.forbidden(`You don't have permission to manage ${permission}`));
};

const withFeature = (feature) => (feature ? [requireFeature(feature)] : []);

/** Owner or manager holding `permission`, with `feature` switched on. */
export const staffGuard = (permission, feature) => [
  requireAuth,
  requireRole('owner', 'manager'),
  requirePg,
  ...withFeature(feature ?? permission),
  ...(permission ? [requirePermission(permission)] : []),
];

/** Owner only, optionally behind a feature. */
export const ownerGuard = (feature) => [requireAuth, requireRole('owner'), requirePg, ...withFeature(feature)];

/** Any signed-in PG member (owner, manager, tenant) with the feature on. Staff still need the permission. */
export const memberGuard = (permission, feature) => [
  requireAuth,
  requireRole('owner', 'manager', 'tenant'),
  requirePg,
  ...withFeature(feature ?? permission),
  ...(permission ? [requirePermission(permission, { allowTenant: true })] : []),
];

export const adminGuard = [requireAuth, requireRole('admin')];
