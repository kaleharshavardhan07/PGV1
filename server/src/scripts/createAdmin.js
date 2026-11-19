// Create a platform admin (or reset an existing admin's password).
//
//   ADMIN_EMAIL=you@example.com [ADMIN_PASSWORD=...] [ADMIN_NAME="Name"] npm run create-admin
//   ... npm run create-admin -- --reset-password     (update the password of an existing admin)
//
// If ADMIN_PASSWORD is not set, a strong one is generated and printed once.
// The password is stored only as a bcrypt hash.
import { connectDB, disconnectDB, one, query } from '../db/index.js';
import { hashPassword, verifyPassword, generatePassword } from '../utils/password.js';
import logger from '../utils/logger.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const name = (process.env.ADMIN_NAME || 'Platform Admin').trim();
const reset = process.argv.includes('--reset-password');

const fail = async (msg) => {
  logger.error(msg);
  await disconnectDB().catch(() => {});
  process.exit(1);
};

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) await fail('Set ADMIN_EMAIL to a valid email address.');
const supplied = process.env.ADMIN_PASSWORD || '';
if (supplied && supplied.length < 8) await fail('ADMIN_PASSWORD must be at least 8 characters.');

try {
  await connectDB();
  const password = supplied || generatePassword(16);
  const hash = await hashPassword(password);
  const existing = await one('SELECT id FROM platform_admins WHERE email = $1', [email]);

  if (existing && !reset) await fail(`An admin with ${email} already exists. Use --reset-password to change its password.`);

  if (existing) await query('UPDATE platform_admins SET password_hash = $1, name = $2 WHERE id = $3', [hash, name, existing.id]);
  else await query('INSERT INTO platform_admins (name, email, password_hash) VALUES ($1,$2,$3)', [name, email, hash]);

  // Prove the stored hash really accepts the password before reporting success.
  const row = await one('SELECT password_hash FROM platform_admins WHERE email = $1', [email]);
  if (!(await verifyPassword(password, row.passwordHash))) await fail('Self-check failed: stored password does not verify.');

  logger.info(`${existing ? 'Updated' : 'Created'} platform admin ${email}`);
  if (!supplied) console.log(`\nGenerated password (shown once): ${password}\n`);
  await disconnectDB();
} catch (err) {
  await fail(err.message);
}
