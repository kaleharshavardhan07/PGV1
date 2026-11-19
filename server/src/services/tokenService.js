import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// Signs a JWT carrying the authenticated principal.
// payload: { sub, role }; the PG is always resolved from the database, never trusted from the token.
export const signToken = (payload, expiresIn = env.jwtExpiresIn) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
