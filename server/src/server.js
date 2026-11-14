import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';

const start = async () => {
  try {
    await connectDB();
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
