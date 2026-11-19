import app from './app.js';
import env from './config/env.js';
import { connectDB } from './db/index.js';
import logger from './utils/logger.js';
import { createAdmin } from './repositories/accounts.js';
import { hashPassword } from './utils/password.js';

const start = async () => {
  try {
    await connectDB();
    // Optional bootstrap of the first platform admin from the environment (never overwrites an existing one).
    if (env.adminEmail && env.adminPassword) {
      const created = await createAdmin({ name: 'Platform Admin', email: env.adminEmail, passwordHash: await hashPassword(env.adminPassword) });
      if (created) logger.info(`Created platform admin ${env.adminEmail}`);
    }
    app.listen(env.port, () => {
      logger.info(`Aapka PG API running on http://localhost:${env.port}`);
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

start();
