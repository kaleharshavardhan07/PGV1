import { z } from 'zod';
import ApiError from '../utils/apiError.js';

// Coerce a provided schema into a Zod schema. Route files may pass either a
// Zod schema (e.g. validators) or a plain object of field schemas (e.g. params).
const toSchema = (s) => {
  if (!s) return null;
  return typeof s.parse === 'function' ? s : z.object(s);
};

/**
 * Zod validation middleware factory.
 * @param {object} schemas { body?, query?, params? }
 */
export const validate =
  (schemas) =>
  (req, _res, next) => {
    try {
      const bodySchema = toSchema(schemas.body);
      const querySchema = toSchema(schemas.query);
      const paramsSchema = toSchema(schemas.params);
      if (bodySchema) req.body = bodySchema.parse(req.body ?? {});
      if (querySchema) req.query = querySchema.parse(req.query ?? {});
      if (paramsSchema) req.params = paramsSchema.parse(req.params ?? {});
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(ApiError.badRequest('Validation failed', err.errors));
      } else {
        next(err);
      }
    }
  };

export default validate;
