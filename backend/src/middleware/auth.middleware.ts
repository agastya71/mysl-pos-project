import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { JwtPayload } from '../types/api.types';
import { env } from '../config/env';
import { checkPermission } from '../services/role.service';

export const authenticateToken = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Access token required');
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware to check if authenticated user has specific permission
 * Uses RBAC system to verify user has required resource:action permission
 *
 * @param resource - Resource being accessed (e.g., 'product', 'transaction')
 * @param action - Action being performed (e.g., 'create', 'read', 'update', 'delete')
 * @returns Express middleware function
 *
 * @example
 * router.post('/', authenticateToken, requirePermission('product', 'create'), createProduct);
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    try {
      const hasPermission = await checkPermission(req.user.userId, resource, action);

      if (!hasPermission) {
        throw new AppError(
          403,
          'FORBIDDEN',
          `You do not have permission to ${action} ${resource}`
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'PERMISSION_CHECK_FAILED', 'Failed to verify permissions');
    }
  };
};
