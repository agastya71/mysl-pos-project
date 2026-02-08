import { Request, Response } from 'express';
import { testConnection } from '../config/database';
import { testRedisConnection } from '../config/redis';
import { ApiResponse, HealthCheckResponse } from '../types/api.types';

export class HealthController {
  async check(_req: Request, res: Response<ApiResponse<HealthCheckResponse>>) {
    const dbHealthy = await testConnection();
    const redisHealthy = await testRedisConnection();

    const healthStatus: HealthCheckResponse = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus,
    });
  }
}
