/**
 * @fileoverview Health Controller - HTTP request handlers for health check endpoint
 *
 * This controller handles the health check API endpoint:
 * - GET /api/v1/health - Check application health status
 *
 * Health Check Purpose:
 * - Monitor application availability (uptime monitoring, load balancers)
 * - Verify critical service dependencies (database, Redis)
 * - Provide diagnostic information for troubleshooting
 * - Support automated alerting and recovery systems
 *
 * Health Check Components:
 * 1. Database Connection (PostgreSQL)
 *    - Tests connection pool availability
 *    - Executes simple query: SELECT 1
 *    - Returns connected/disconnected status
 *
 * 2. Redis Connection (Cache/Session Store)
 *    - Tests Redis client connectivity
 *    - Executes PING command
 *    - Returns connected/disconnected status
 *
 * Response Status Codes:
 * - 200 OK: All services healthy (database AND Redis connected)
 * - 503 Service Unavailable: One or more services unhealthy
 *
 * Use Cases:
 * - Load balancer health checks (route traffic only to healthy instances)
 * - Kubernetes liveness/readiness probes
 * - Monitoring systems (Datadog, New Relic, Prometheus)
 * - Manual diagnostic checks during deployment
 * - Automated recovery triggers (restart unhealthy instances)
 *
 * Authentication:
 * - Public endpoint (no auth required)
 * - Should be accessible without authentication for monitoring
 *
 * @module controllers/health
 * @requires express - Express.js framework for HTTP handling
 * @requires ../config/database - Database connection testing
 * @requires ../config/redis - Redis connection testing
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response } from 'express';
import { testConnection } from '../config/database';
import { testRedisConnection } from '../config/redis';
import { ApiResponse, HealthCheckResponse } from '../types/api.types';

/**
 * Health Controller Class
 *
 * Handles HTTP requests for application health monitoring with 1 endpoint:
 * - check: Verify application health and service dependencies
 *
 * Health check tests:
 * - PostgreSQL database connectivity
 * - Redis cache connectivity
 * - Overall application status
 *
 * @class HealthController
 */
export class HealthController {
  /**
   * Check application health status
   *
   * HTTP: GET /api/v1/health
   *
   * Verifies application health by testing critical service dependencies.
   * Returns overall health status and individual service statuses.
   *
   * Health check flow:
   * 1. Test database connection (SELECT 1 query)
   * 2. Test Redis connection (PING command)
   * 3. Calculate overall status (healthy if ALL services connected)
   * 4. Return health status with timestamp
   *
   * Overall status logic:
   * - healthy: Database connected AND Redis connected
   * - unhealthy: Database disconnected OR Redis disconnected
   *
   * Individual service status:
   * - connected: Service responding to health check
   * - disconnected: Service not responding or error occurred
   *
   * Response status codes:
   * - 200 OK: Overall status is healthy (all services connected)
   * - 503 Service Unavailable: Overall status is unhealthy (one or more services down)
   *
   * Monitoring integration:
   * - Load balancers: Use 200/503 status code to route traffic
   * - Kubernetes: Configure as readiness probe (503 = remove from service)
   * - Monitoring tools: Alert on 503 or repeated failures
   * - CI/CD: Verify deployment health before proceeding
   *
   * @async
   * @param {Request} _req - Express request (no parameters used)
   * @param {Response<ApiResponse<HealthCheckResponse>>} res - Express response with health status
   * @returns {Promise<void>} Sends 200 OK or 503 Service Unavailable with health details
   *
   * @example
   * // Request
   * GET /api/v1/health
   *
   * @example
   * // Response (200 OK) - All services healthy
   * {
   *   success: true,
   *   data: {
   *     status: "healthy",
   *     timestamp: "2026-02-08T10:30:00.000Z",
   *     services: {
   *       database: "connected",
   *       redis: "connected"
   *     }
   *   }
   * }
   *
   * @example
   * // Response (503 Service Unavailable) - Database down
   * {
   *   success: false,
   *   data: {
   *     status: "unhealthy",
   *     timestamp: "2026-02-08T10:30:00.000Z",
   *     services: {
   *       database: "disconnected",
   *       redis: "connected"
   *     }
   *   }
   * }
   *
   * @example
   * // Response (503 Service Unavailable) - All services down
   * {
   *   success: false,
   *   data: {
   *     status: "unhealthy",
   *     timestamp: "2026-02-08T10:30:00.000Z",
   *     services: {
   *       database: "disconnected",
   *       redis: "disconnected"
   *     }
   *   }
   * }
   *
   * @example
   * // Load balancer health check configuration
   * Health Check Path: /api/v1/health
   * Healthy Status Code: 200
   * Unhealthy Status Codes: 503, 500, timeout
   * Check Interval: 5 seconds
   * Unhealthy Threshold: 2 consecutive failures
   * Healthy Threshold: 2 consecutive successes
   *
   * @example
   * // Kubernetes readiness probe configuration
   * readinessProbe:
   *   httpGet:
   *     path: /api/v1/health
   *     port: 3000
   *   initialDelaySeconds: 10
   *   periodSeconds: 5
   *   failureThreshold: 2
   *
   * @see testConnection in ../config/database.ts for database health check implementation
   * @see testRedisConnection in ../config/redis.ts for Redis health check implementation
   */
  async check(_req: Request, res: Response<ApiResponse<HealthCheckResponse>>) {
    // Test database connectivity (SELECT 1 query)
    const dbHealthy = await testConnection();

    // Test Redis connectivity (PING command)
    const redisHealthy = await testRedisConnection();

    // Calculate overall health status (all services must be connected)
    const healthStatus: HealthCheckResponse = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    };

    // Use appropriate HTTP status code (200 OK or 503 Service Unavailable)
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus,
    });
  }
}
