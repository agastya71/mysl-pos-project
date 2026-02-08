import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database';
import redisClient from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { AuthTokens, JwtPayload, User, LoginResponse } from '../types/api.types';
import logger from '../utils/logger';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export class AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    const result = await pool.query(
      'SELECT id, username, password_hash, first_name, last_name, role, is_active, assigned_terminal_id FROM users WHERE username = $1',
      [username]
    );

    if (result.rowCount === 0) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
      terminalId: user.assigned_terminal_id,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    logger.info('User logged in', { userId: user.id, username: user.username });

    return {
      user: {
        id: user.id,
        username: user.username,
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        assigned_terminal_id: user.assigned_terminal_id,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;

      const isValid = await this.validateRefreshToken(payload.userId, refreshToken);
      if (!isValid) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      const result = await pool.query(
        'SELECT id, username, role, assigned_terminal_id FROM users WHERE id = $1 AND is_active = $2',
        [payload.userId, true]
      );

      if (result.rowCount === 0) {
        throw new AppError(401, 'USER_NOT_FOUND', 'User not found or inactive');
      }

      const user = result.rows[0];

      const newTokens = await this.generateTokens({
        userId: user.id,
        username: user.username,
        role: user.role,
        terminalId: user.assigned_terminal_id,
      });

      await this.revokeRefreshToken(payload.userId, refreshToken);
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      logger.info('Token refreshed', { userId: user.id });

      return newTokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token expired');
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(userId, refreshToken);
    logger.info('User logged out', { userId });
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRY,
    } as any);

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRY,
    } as any);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}:${token}`;
    await redisClient.set(key, 'valid', { EX: 7 * 24 * 60 * 60 }); // 7 days
  }

  private async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${token}`;
    const value = await redisClient.get(key);
    return value === 'valid';
  }

  private async revokeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}:${token}`;
    await redisClient.del(key);
  }
}
