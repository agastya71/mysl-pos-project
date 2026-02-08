import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { JwtPayload } from '../types/api.types';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';

export const authenticateToken = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Access token required');
  }

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
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
