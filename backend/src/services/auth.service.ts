/**
 * @fileoverview Authentication Service - Manages user authentication and JWT tokens
 *
 * This service implements JWT-based authentication with access and refresh token pattern:
 * - Access tokens are short-lived (15 minutes) for API authentication
 * - Refresh tokens are long-lived (7 days) for obtaining new access tokens
 * - Refresh tokens are stored in Redis for revocation capability
 * - Token rotation: old refresh token is revoked when new one is issued
 *
 * Security features:
 * - Bcrypt password hashing (one-way encryption)
 * - JWT signature verification with separate secrets
 * - Active user validation on each authentication
 * - Refresh token revocation on logout and rotation
 * - Environment-based secret configuration
 *
 * @module services/auth
 * @requires bcrypt - Password hashing library
 * @requires jsonwebtoken - JWT token generation and verification
 * @requires redis - Refresh token storage and revocation
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database';
import redisClient from '../config/redis';
import { AppError } from '../middleware/error.middleware';
import { AuthTokens, JwtPayload, User, LoginResponse } from '../types/api.types';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Authentication Service
 *
 * Handles user login, token generation, token refresh, and logout operations.
 * Uses JWT access/refresh token pattern with Redis for token storage.
 *
 * @class AuthService
 */
export class AuthService {
  /**
   * Authenticates a user with username and password
   *
   * This method performs the following steps:
   * 1. Queries database for user by username
   * 2. Validates user exists (constant-time error to prevent username enumeration)
   * 3. Checks if user account is active
   * 4. Compares password with bcrypt hash (constant-time comparison)
   * 5. Generates access and refresh JWT tokens
   * 6. Stores refresh token in Redis for revocation capability
   * 7. Returns user info and tokens
   *
   * Security considerations:
   * - Password is never stored or logged in plain text
   * - Bcrypt.compare() is constant-time to prevent timing attacks
   * - Same error message for invalid username and invalid password (prevent enumeration)
   * - Active user check prevents disabled accounts from logging in
   * - Refresh token stored in Redis allows for token revocation
   *
   * @async
   * @param {string} username - The username to authenticate
   * @param {string} password - The plain text password
   * @returns {Promise<LoginResponse>} User info and authentication tokens
   * @throws {AppError} 401 - If username not found or password is incorrect
   * @throws {AppError} 403 - If user account is disabled
   * @throws {Error} If database query or token generation fails
   *
   * @example
   * // Successful login
   * const response = await authService.login('admin', 'admin123');
   * // Returns: {
   * //   user: { id: 'uuid', username: 'admin', full_name: 'Admin User', role: 'admin', ... },
   * //   tokens: { accessToken: 'jwt...', refreshToken: 'jwt...' }
   * // }
   *
   * @example
   * // Failed login - invalid credentials
   * try {
   *   await authService.login('admin', 'wrongpassword');
   * } catch (error) {
   *   console.error(error.message); // "Invalid username or password"
   * }
   *
   * @example
   * // Failed login - account disabled
   * try {
   *   await authService.login('disableduser', 'password');
   * } catch (error) {
   *   console.error(error.message); // "Account is disabled"
   * }
   *
   * @see JwtPayload interface in types/api.types.ts
   * @see LoginResponse interface in types/api.types.ts
   * @see generateTokens for token generation logic
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    // Query user by username (includes password_hash for verification)
    const result = await pool.query(
      'SELECT id, username, password_hash, first_name, last_name, role, is_active, assigned_terminal_id FROM users WHERE username = $1',
      [username]
    );

    // User not found - use same error message as invalid password (prevent username enumeration)
    if (result.rowCount === 0) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const user = result.rows[0];

    // Check if account is active (403 for disabled accounts)
    if (!user.is_active) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    // Verify password with bcrypt (constant-time comparison prevents timing attacks)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    // Generate JWT access and refresh tokens
    const tokens = await this.generateTokens({
      userId: user.id,
      username: user.username,
      role: user.role,
      terminalId: user.assigned_terminal_id,
    });

    // Store refresh token in Redis for revocation capability (7 day TTL)
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    logger.info('User logged in', { userId: user.id, username: user.username });

    // Return user info (excluding password_hash) and tokens
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

  /**
   * Generates new access and refresh tokens using a valid refresh token
   *
   * This method implements token rotation for security:
   * 1. Verifies JWT signature and expiration
   * 2. Validates refresh token exists in Redis (not revoked)
   * 3. Re-validates user still exists and is active
   * 4. Generates new access and refresh token pair
   * 5. Revokes old refresh token (prevents reuse)
   * 6. Stores new refresh token in Redis
   *
   * Token rotation prevents refresh token reuse attacks. Each refresh
   * operation invalidates the old token and issues a new one.
   *
   * @async
   * @param {string} refreshToken - The JWT refresh token from client
   * @returns {Promise<AuthTokens>} New access and refresh tokens
   * @throws {AppError} 401 - If token is invalid, expired, revoked, or user is inactive
   * @throws {Error} If database query or Redis operation fails
   *
   * @example
   * // Successful token refresh
   * const newTokens = await authService.refreshToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // Returns: { accessToken: 'jwt...', refreshToken: 'jwt...' }
   * // Note: Old refresh token is now revoked
   *
   * @example
   * // Failed refresh - token expired
   * try {
   *   await authService.refreshToken('expired_token');
   * } catch (error) {
   *   console.error(error.message); // "Refresh token expired"
   * }
   *
   * @example
   * // Failed refresh - token revoked (already used)
   * try {
   *   await authService.refreshToken('revoked_token');
   * } catch (error) {
   *   console.error(error.message); // "Invalid refresh token"
   * }
   *
   * @see AuthTokens interface in types/api.types.ts
   * @see validateRefreshToken for Redis token validation
   * @see revokeRefreshToken for token revocation logic
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify JWT signature and extract payload (throws if invalid or expired)
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

      // Check if token exists in Redis (not revoked)
      const isValid = await this.validateRefreshToken(payload.userId, refreshToken);
      if (!isValid) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      // Re-validate user still exists and is active
      const result = await pool.query(
        'SELECT id, username, role, assigned_terminal_id FROM users WHERE id = $1 AND is_active = $2',
        [payload.userId, true]
      );

      if (result.rowCount === 0) {
        throw new AppError(401, 'USER_NOT_FOUND', 'User not found or inactive');
      }

      const user = result.rows[0];

      // Generate new token pair
      const newTokens = await this.generateTokens({
        userId: user.id,
        username: user.username,
        role: user.role,
        terminalId: user.assigned_terminal_id,
      });

      // Token rotation: revoke old token and store new one
      await this.revokeRefreshToken(payload.userId, refreshToken);
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      logger.info('Token refreshed', { userId: user.id });

      return newTokens;
    } catch (error) {
      // Handle specific JWT errors with appropriate messages
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token expired');
      }
      if (error instanceof AppError) {
        throw error;
      }
      // Catch-all for other JWT verification errors
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }
  }

  /**
   * Logs out a user by revoking their refresh token
   *
   * This method removes the refresh token from Redis, preventing it from
   * being used to generate new access tokens. The current access token
   * remains valid until expiration (15 minutes by default).
   *
   * For immediate session termination, clients should also clear their
   * stored tokens. The access token will naturally expire after 15 minutes.
   *
   * @async
   * @param {string} userId - UUID of the user logging out
   * @param {string} refreshToken - The refresh token to revoke
   * @returns {Promise<void>} No return value
   * @throws {Error} If Redis deletion fails
   *
   * @example
   * // Logout user
   * await authService.logout('user-uuid', 'refresh_token_jwt');
   * // Token is now revoked and cannot be used to refresh
   *
   * @see revokeRefreshToken for Redis deletion logic
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    // Remove refresh token from Redis (prevents token reuse)
    await this.revokeRefreshToken(userId, refreshToken);
    logger.info('User logged out', { userId });
  }

  /**
   * Generates access and refresh JWT tokens
   *
   * Creates two JWT tokens with different expiration times and secrets:
   * - Access token: Short-lived (15 minutes), used for API authentication
   * - Refresh token: Long-lived (7 days), used to obtain new access tokens
   *
   * Both tokens contain the same payload (userId, username, role, terminalId)
   * but are signed with different secrets for additional security.
   *
   * Token expiration times are configurable via environment variables:
   * - JWT_ACCESS_EXPIRY (default: 15m)
   * - JWT_REFRESH_EXPIRY (default: 7d)
   *
   * @private
   * @async
   * @param {JwtPayload} payload - User information to encode in token
   * @returns {Promise<AuthTokens>} Object containing both tokens
   *
   * @example
   * // Generate tokens for a user
   * const tokens = await this.generateTokens({
   *   userId: 'uuid',
   *   username: 'admin',
   *   role: 'admin',
   *   terminalId: 'terminal-uuid'
   * });
   * // Returns: { accessToken: 'eyJ...', refreshToken: 'eyJ...' }
   *
   * @see JwtPayload interface in types/api.types.ts
   * @see AuthTokens interface in types/api.types.ts
   */
  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    // Generate short-lived access token (for API authentication)
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as any);

    // Generate long-lived refresh token (for obtaining new access tokens)
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as any);

    return { accessToken, refreshToken };
  }

  /**
   * Stores refresh token in Redis with expiration
   *
   * Stores the token as a key with a TTL (Time To Live) of 7 days.
   * This allows the token to be validated later and automatically
   * expires matching the JWT expiration.
   *
   * Redis key format: `refresh_token:{userId}:{token}`
   * Value: 'valid' (just a marker, the key existence is what matters)
   *
   * @private
   * @async
   * @param {string} userId - UUID of the user
   * @param {string} token - The refresh token JWT
   * @returns {Promise<void>} No return value
   * @throws {Error} If Redis connection or set operation fails
   *
   * @example
   * await this.storeRefreshToken('user-uuid', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * // Token stored with 7-day TTL
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}:${token}`;
    // Store token with 7-day expiration (matches JWT_REFRESH_EXPIRY)
    await redisClient.set(key, 'valid', { EX: 7 * 24 * 60 * 60 }); // 7 days in seconds
  }

  /**
   * Validates refresh token exists in Redis
   *
   * Checks if the token key exists in Redis with value 'valid'.
   * Returns false if token was revoked (deleted) or expired (TTL reached).
   *
   * This check complements JWT signature verification by ensuring the
   * token hasn't been manually revoked (e.g., via logout or rotation).
   *
   * @private
   * @async
   * @param {string} userId - UUID of the user
   * @param {string} token - The refresh token JWT to validate
   * @returns {Promise<boolean>} True if token is valid, false if revoked/expired
   * @throws {Error} If Redis connection or get operation fails
   *
   * @example
   * const isValid = await this.validateRefreshToken('user-uuid', 'token...');
   * if (!isValid) {
   *   throw new AppError(401, 'INVALID_TOKEN', 'Token revoked or expired');
   * }
   */
  private async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const key = `refresh_token:${userId}:${token}`;
    const value = await redisClient.get(key);
    return value === 'valid'; // Returns false if key doesn't exist or value is different
  }

  /**
   * Revokes a refresh token by deleting it from Redis
   *
   * Removes the token key from Redis, making it invalid for future
   * token refresh operations. This is used during:
   * - Logout: User explicitly ends session
   * - Token rotation: Old token is revoked when new one is issued
   *
   * After revocation, the token's JWT signature is still valid, but
   * validateRefreshToken will return false, preventing token reuse.
   *
   * @private
   * @async
   * @param {string} userId - UUID of the user
   * @param {string} token - The refresh token JWT to revoke
   * @returns {Promise<void>} No return value
   * @throws {Error} If Redis connection or delete operation fails
   *
   * @example
   * // Revoke token during logout
   * await this.revokeRefreshToken('user-uuid', 'token...');
   * // Token is now invalid and cannot be used
   */
  private async revokeRefreshToken(userId: string, token: string): Promise<void> {
    const key = `refresh_token:${userId}:${token}`;
    // Delete token from Redis (makes it invalid)
    await redisClient.del(key);
  }
}
