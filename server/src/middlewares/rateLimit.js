import ApiError from '../utils/apiError.js';

/**
 * Small in-memory fixed-window limiter keyed by client IP. Enough to blunt password
 * guessing and spam on public forms for a single instance; use a shared store
 * (Redis) if the API is ever scaled horizontally.
 */
export const rateLimit = ({ windowMs, max, message = 'Too many requests. Please try again later.' }) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, _res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return next(new ApiError(429, message));
    next();
  };
};
