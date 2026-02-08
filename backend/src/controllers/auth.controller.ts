/**
 * @fileoverview Auth Controller - HTTP request handlers for authentication
 *
 * This controller handles all authentication-related API endpoints:
 * - POST /api/v1/auth/login - Login with username/password
 * - POST /api/v1/auth/refresh - Refresh access token using refresh token
 * - POST /api/v1/auth/logout - Logout and revoke refresh token
 *
 * Authentication Flow:
 * 1. Login: User provides username/password
 * 2. Server validates credentials (bcrypt password hash comparison)
 * 3. Server generates access token (short-lived, 15min) and refresh token (long-lived, 7 days)
 * 4. Refresh token stored in Redis with TTL for revocation capability
 * 5. Client stores both tokens (localStorage or memory)
 * 6. Client includes access token in Authorization header for API requests
 * 7. When access token expires, client uses refresh token to get new access token
 * 8. On logout, refresh token revoked in Redis
 *
 * JWT Token Structure:
 * - Access Token: { userId, username, role, terminalId, type: 'access' }
 * - Refresh Token: { userId, username, role, terminalId, type: 'refresh' }
 * - Signed with JWT_SECRET from environment
 * - Access token expires in 15 minutes (configurable)
 * - Refresh token expires in 7 days (configurable)
 *
 * Security Features:
 * - Passwords hashed with bcrypt (salt rounds: 10)
 * - Constant-time password comparison (timing attack protection)
 * - Refresh tokens stored in Redis with automatic expiration
 * - Token revocation on logout (removes from Redis)
 * - JWT signature verification on every request
 *
 * Authentication:
 * - /login and /refresh are public (no auth required)
 * - /logout requires valid access token in Authorization header
 *
 * @module controllers/auth
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/auth.service - Authentication business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse, LoginRequest, LoginResponse, RefreshTokenRequest, AuthTokens } from '../types/api.types';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

/**
 * Zod validation schema for login request
 *
 * Validates request body for POST /api/v1/auth/login.
 * Both username and password are required.
 *
 * Required fields:
 * - username: User's login username (string, min 1 character)
 * - password: User's password (string, min 1 character)
 *
 * Password is transmitted in plain text over HTTPS (TLS encryption).
 * Backend hashes password with bcrypt before storing.
 * Password never stored in plain text.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Valid login request
 * {
 *   username: "admin",
 *   password: "admin123"
 * }
 */
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Zod validation schema for refresh token request
 *
 * Validates request body for POST /api/v1/auth/refresh and POST /api/v1/auth/logout.
 * Refresh token must be provided to generate new access token or logout.
 *
 * Required fields:
 * - refreshToken: JWT refresh token (string, min 1 character)
 *
 * Refresh token validation:
 * - Must be valid JWT signed with JWT_SECRET
 * - Must not be expired (TTL: 7 days)
 * - Must exist in Redis (not revoked)
 * - Must match user_id in JWT payload
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Valid refresh request
 * {
 *   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Auth Controller Class
 *
 * Handles HTTP requests for authentication with 3 endpoints:
 * - login: Authenticate user and generate tokens
 * - refresh: Generate new access token using refresh token
 * - logout: Revoke refresh token and invalidate session
 *
 * All methods are async and throw AppError on validation/authentication failures.
 * Errors are caught by global error middleware.
 *
 * @class AuthController
 */
export class AuthController {
  private authService: AuthService;

  /**
   * Initialize AuthController with AuthService instance
   *
   * @constructor
   */
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Login with username and password
   *
   * HTTP: POST /api/v1/auth/login
   *
   * Authenticates user with username/password and generates JWT tokens.
   * Returns access token (short-lived) and refresh token (long-lived).
   *
   * Login flow:
   * 1. Validate request body (username, password required)
   * 2. Look up user by username in database
   * 3. Compare password with bcrypt hash (constant-time comparison)
   * 4. Generate access token (15min TTL) and refresh token (7 day TTL)
   * 5. Store refresh token in Redis with TTL
   * 6. Return tokens and user info
   *
   * Access token payload:
   * - userId: User UUID
   * - username: User's username
   * - role: User's role (admin, manager, cashier)
   * - terminalId: Assigned terminal UUID (from users.assigned_terminal_id)
   * - type: 'access'
   *
   * Security notes:
   * - Password transmitted over HTTPS (TLS encryption)
   * - Bcrypt comparison protects against timing attacks
   * - Failed login does not reveal whether username or password was wrong
   * - Rate limiting should be implemented at API gateway level
   *
   * @async
   * @param {Request<{}, {}, LoginRequest>} req - Express request with username and password in body
   * @param {Response<ApiResponse<LoginResponse>>} res - Express response with tokens and user info
   * @returns {Promise<void>} Sends 200 OK with access token, refresh token, and user details
   * @throws {AppError} 400 if validation fails (missing username or password)
   * @throws {AppError} 401 if authentication fails (invalid credentials)
   * @throws {AppError} 403 if user account is inactive
   *
   * @example
   * // Request
   * POST /api/v1/auth/login
   * {
   *   username: "admin",
   *   password: "admin123"
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXV1aWQiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVybWluYWxJZCI6InRlcm1pbmFsLXV1aWQiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzA5NTYwMDAwLCJleHAiOjE3MDk1NjA5MDB9...",
   *     refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXV1aWQiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidGVybWluYWxJZCI6InRlcm1pbmFsLXV1aWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwOTU2MDAwMCwiZXhwIjoxNzEwMTY0ODAwfQ...",
   *     user: {
   *       id: "user-uuid",
   *       username: "admin",
   *       email: "admin@pos.com",
   *       role: "admin",
   *       full_name: "Administrator",
   *       assigned_terminal_id: "terminal-uuid",
   *       is_active: true
   *     }
   *   }
   * }
   *
   * @example
   * // Error response (401 Unauthorized) - invalid credentials
   * {
   *   success: false,
   *   error: {
   *     code: "INVALID_CREDENTIALS",
   *     message: "Invalid username or password"
   *   }
   * }
   *
   * @see AuthService.login for implementation with bcrypt comparison
   */
  async login(req: Request<{}, {}, LoginRequest>, res: Response<ApiResponse<LoginResponse>>) {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { username, password } = validation.data;
    const result = await this.authService.login(username, password);

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Refresh access token using refresh token
   *
   * HTTP: POST /api/v1/auth/refresh
   *
   * Generates new access token and refresh token using existing valid refresh token.
   * Implements token rotation security pattern (old refresh token invalidated).
   *
   * Refresh flow:
   * 1. Validate request body (refreshToken required)
   * 2. Verify refresh token JWT signature
   * 3. Validate refresh token exists in Redis (not revoked)
   * 4. Generate new access token (15min TTL)
   * 5. Generate new refresh token (7 day TTL)
   * 6. Store new refresh token in Redis
   * 7. Remove old refresh token from Redis (token rotation)
   * 8. Return new tokens
   *
   * Token rotation benefits:
   * - Limits window for refresh token compromise
   * - Old refresh token immediately invalidated
   * - If old token used again, indicates potential theft
   *
   * Use cases:
   * - Access token expired (after 15 minutes)
   * - Proactive refresh before expiration
   * - Token rotation for security best practices
   *
   * @async
   * @param {Request<{}, {}, RefreshTokenRequest>} req - Express request with refresh token in body
   * @param {Response<ApiResponse<AuthTokens>>} res - Express response with new tokens
   * @returns {Promise<void>} Sends 200 OK with new access token and refresh token
   * @throws {AppError} 400 if validation fails (missing refresh token)
   * @throws {AppError} 401 if refresh token invalid (invalid signature, expired, or revoked)
   *
   * @example
   * // Request
   * POST /api/v1/auth/refresh
   * {
   *   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newAccessToken...",
   *     refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newRefreshToken..."
   *   }
   * }
   *
   * @example
   * // Error response (401 Unauthorized) - invalid/expired refresh token
   * {
   *   success: false,
   *   error: {
   *     code: "INVALID_REFRESH_TOKEN",
   *     message: "Refresh token is invalid or expired"
   *   }
   * }
   *
   * @see AuthService.refreshToken for implementation with token rotation
   */
  async refresh(req: Request<{}, {}, RefreshTokenRequest>, res: Response<ApiResponse<AuthTokens>>) {
    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { refreshToken } = validation.data;
    const tokens = await this.authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  }

  /**
   * Logout and revoke refresh token
   *
   * HTTP: POST /api/v1/auth/logout
   *
   * Logs out user by revoking refresh token in Redis.
   * Access token remains valid until expiration (cannot be revoked without database blacklist).
   *
   * Logout flow:
   * 1. Verify user is authenticated (access token in Authorization header)
   * 2. Validate request body (refreshToken required)
   * 3. Remove refresh token from Redis
   * 4. Return success message
   *
   * Security notes:
   * - Access token cannot be revoked (stateless JWT)
   * - Access token expires in 15 minutes (short TTL limits exposure)
   * - Refresh token immediately invalidated in Redis
   * - User cannot generate new access tokens after logout
   * - For immediate session termination, implement token blacklist in database
   *
   * Client responsibilities:
   * - Clear access token from storage (localStorage, memory)
   * - Clear refresh token from storage
   * - Remove Authorization header from future requests
   * - Redirect to login page
   *
   * @async
   * @param {Request<{}, {}, RefreshTokenRequest>} req - Express request with refresh token in body
   * @param {Response<ApiResponse>} res - Express response with success message
   * @returns {Promise<void>} Sends 200 OK with logout success message
   * @throws {AppError} 401 if user not authenticated (missing or invalid access token)
   * @throws {AppError} 400 if validation fails (missing refresh token)
   *
   * @example
   * // Request
   * POST /api/v1/auth/logout
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.accessToken...
   * {
   *   refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refreshToken..."
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     message: "Logged out successfully"
   *   }
   * }
   *
   * @example
   * // Error response (401 Unauthorized) - not authenticated
   * {
   *   success: false,
   *   error: {
   *     code: "UNAUTHORIZED",
   *     message: "Authentication required"
   *   }
   * }
   *
   * @see AuthService.logout for implementation with Redis token removal
   */
  async logout(req: Request<{}, {}, RefreshTokenRequest>, res: Response<ApiResponse>) {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { refreshToken } = validation.data;
    await this.authService.logout(req.user.userId, refreshToken);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
}
