// Feature toggles and manager permissions: pure helpers shared by middleware,
// controllers and repositories.
import { FEATURES, PERMISSIONS, DEFAULT_MANAGER_PERMISSIONS } from '../constants/index.js';

/**
 * A feature is usable only when the platform admin has allowed it AND the owner has
 * enabled it. Missing keys default to true, so new modules are on until switched off.
 */
export const resolveFeatures = (allowed = {}, enabled = {}) =>
  Object.fromEntries(FEATURES.map((f) => [f, allowed?.[f] !== false && enabled?.[f] !== false]));

/** Normalise a { key: boolean } map to known keys only. */
const pickBooleans = (keys, input = {}, fallback = {}) =>
  Object.fromEntries(keys.map((k) => [k, typeof input?.[k] === 'boolean' ? input[k] : fallback[k] ?? true]));

export const normaliseFeatureMap = (input, fallback = {}) => pickBooleans(FEATURES, input, fallback);

export const resolvePermissions = (role, stored = {}) => {
  if (role === 'owner') return Object.fromEntries(PERMISSIONS.map((p) => [p, true]));
  if (role === 'manager') return pickBooleans(PERMISSIONS, stored, DEFAULT_MANAGER_PERMISSIONS);
  return Object.fromEntries(PERMISSIONS.map((p) => [p, false]));
};

export const normalisePermissions = (input, fallback = DEFAULT_MANAGER_PERMISSIONS) => pickBooleans(PERMISSIONS, input, fallback);
