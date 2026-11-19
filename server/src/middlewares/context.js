import ApiError from '../utils/apiError.js';

/** Ensures the authenticated principal has a resolved PG, attached as req.pgId. */
export const requirePg = (req, _res, next) => {
  if (!req.user?.pgId) return next(ApiError.forbidden('No PG workspace bound to this account'));
  req.pgId = req.user.pgId;
  next();
};
