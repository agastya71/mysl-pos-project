import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { testConnection } from './config/database';
import { connectRedis } from './config/redis';
import { runMigrations } from './database/migrate';
import { seedDatabase } from './database/seed';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    logger.info('Starting POS Backend Server...');

    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    await connectRedis();

    logger.info('Running database migrations...');
    await runMigrations();

    logger.info('Seeding database...');
    await seedDatabase();

    const app = createApp();

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API endpoint: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
