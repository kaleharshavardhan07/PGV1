import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// Signs a JWT carrying the authenticated principal.
// payload: { sub, role, pgId? }
export const signToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
