import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Return numbers and plain date strings instead of pg's string defaults:
// int8 -> number, numeric -> number, date -> 'YYYY-MM-DD'.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(1082, (v) => v);

const useSsl = !/localhost|127\.0\.0\.1/.test(env.databaseUrl) && !/sslmode=disable/.test(env.databaseUrl);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  max: env.dbPoolSize,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000, // Neon may need a moment to wake a suspended compute
});

pool.on('error', (err) => logger.error(`Postgres pool error: ${err.message}`));

const camel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const camelRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  return out;
};

/** Run a query; rows come back camelCased. `executor` is the pool or a tx client. */
export const query = async (text, params = [], executor = pool) => {
  const res = await executor.query(text, params);
  return res.rows.map(camelRow);
};

export const one = async (text, params = [], executor = pool) => (await query(text, params, executor))[0] ?? null;

/** Run `fn(client)` inside a transaction. Rolls back on any error. */
export const transaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export async function migrate() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

export async function connectDB() {
  await pool.query('SELECT 1');
  await migrate();
  logger.info('PostgreSQL connected and schema is up to date');
}

export const disconnectDB = () => pool.end();
