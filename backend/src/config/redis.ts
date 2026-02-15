import { createClient } from 'redis';
import logger from '../utils/logger';

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect', () => {
  logger.info('Redis connection established');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis client connected');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    logger.info('Redis connection test successful');
    return true;
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    return false;
  }
};

export default redisClient;
