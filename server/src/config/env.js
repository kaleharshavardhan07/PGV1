import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  // Neon connection string, e.g. postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aapka_pg',
  dbPoolSize: Number(process.env.DB_POOL_SIZE) || 10,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

if (nodeEnv === 'production' && env.jwtSecret === 'dev-only-insecure-secret') {
  throw new Error('JWT_SECRET must be set in production');
}

export default env;
