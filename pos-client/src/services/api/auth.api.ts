/**
 * @fileoverview Auth API Service - Frontend API client for authentication operations
 *
 * This service provides API methods for authentication operations:
 * - login: Authenticate user and receive JWT tokens
 * - logout: Revoke refresh token and end session
 *
 * Authentication Flow:
 * 1. User submits credentials via login form
 * 2. Frontend calls authApi.login(credentials)
 * 3. Backend validates credentials and returns tokens + user info
 * 4. Frontend stores tokens in Redux (auth slice) and localStorage
 * 5. Subsequent API calls include access token in Authorization header
 * 6. On logout, frontend calls authApi.logout(refreshToken)
 * 7. Backend revokes refresh token in Redis
 * 8. Frontend clears tokens from Redux and localStorage
 *
 * Token Management:
 * - Access token: Short-lived (15 min), included in Authorization header
 * - Refresh token: Long-lived (7 days), used to obtain new access tokens
 * - Token rotation: Refresh endpoint returns new tokens and revokes old ones
 * - Storage: Both tokens stored in Redux state and persisted to localStorage
 *
 * API Client:
 * - Uses apiClient from api.client.ts for HTTP requests
 * - apiClient handles base URL, headers, error handling
 * - All requests go through Axios interceptors for auth and errors
 *
 * Error Handling:
 * - 401 Unauthorized: Invalid credentials or expired tokens
 * - Network errors: Connection refused, timeout
 * - Errors thrown by apiClient, caught by Redux thunk
 *
 * @module services/api/auth
 * @requires ./api.client - Configured Axios instance
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';

/**
 * Login request payload interface
 *
 * Credentials required for user authentication.
 * Both username and password must be provided.
 *
 * @interface LoginRequest
 * @property {string} username - User's login username
 * @property {string} password - User's password (transmitted over HTTPS)
 *
 * @example
 * const credentials: LoginRequest = {
 *   username: 'admin',
 *   password: 'admin123'
 * };
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response payload interface
 *
 * Contains authenticated user information and JWT tokens.
 * Returned by backend after successful authentication.
 *
 * User object:
 * - id: User UUID (used for API requests)
 * - username: Username for display
 * - full_name: User's full name for display
 * - role: User role (admin, manager, cashier) - determines permissions
 * - assigned_terminal_id: Terminal assigned to user (optional)
 *
 * Tokens object:
 * - accessToken: Short-lived JWT (15 min) for API authentication
 * - refreshToken: Long-lived JWT (7 days) for obtaining new access tokens
 *
 * @interface LoginResponse
 * @property {object} user - Authenticated user information
 * @property {string} user.id - User UUID
 * @property {string} user.username - Username
 * @property {string} user.full_name - User's full name
 * @property {string} user.role - User role (admin, manager, cashier)
 * @property {string} [user.assigned_terminal_id] - Assigned POS terminal UUID (optional)
 * @property {object} tokens - JWT authentication tokens
 * @property {string} tokens.accessToken - Access token (15 min expiry)
 * @property {string} tokens.refreshToken - Refresh token (7 day expiry)
 *
 * @example
 * const response: LoginResponse = {
 *   user: {
 *     id: 'user-uuid',
 *     username: 'admin',
 *     full_name: 'Administrator',
 *     role: 'admin',
 *     assigned_terminal_id: 'terminal-uuid'
 *   },
 *   tokens: {
 *     accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * };
 */
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    full_name: string;
    role: string;
    assigned_terminal_id?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Auth API Service
 *
 * Provides methods for authentication operations.
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - login: Authenticate user with username/password
 * - logout: Revoke refresh token and end session
 *
 * Usage in Redux:
 * - Called from auth.slice.ts async thunks
 * - Responses stored in Redux auth state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const authApi = {
  /**
   * Login user with credentials
   *
   * HTTP: POST /api/v1/auth/login
   *
   * Authenticates user with username and password.
   * Returns user information and JWT tokens on success.
   *
   * Authentication flow:
   * 1. Send credentials to backend
   * 2. Backend validates username/password (bcrypt comparison)
   * 3. Backend generates access token (15 min) and refresh token (7 days)
   * 4. Backend stores refresh token in Redis with TTL
   * 5. Backend returns user info and tokens
   * 6. Frontend stores tokens in Redux and localStorage
   *
   * Token storage:
   * - Access token: Stored in Redux auth.accessToken and localStorage
   * - Refresh token: Stored in Redux auth.refreshToken and localStorage
   * - User info: Stored in Redux auth.user
   *
   * Subsequent requests:
   * - Access token included in Authorization header (Bearer token)
   * - apiClient automatically adds token via request interceptor
   * - If access token expires, use refresh token to get new tokens
   *
   * @async
   * @function login
   * @param {LoginRequest} credentials - User credentials (username, password)
   * @returns {Promise<LoginResponse>} User info and JWT tokens
   * @throws {Error} If authentication fails (401 Unauthorized)
   * @throws {Error} If network error occurs (connection refused, timeout)
   *
   * @example
   * // Login user
   * try {
   *   const response = await authApi.login({
   *     username: 'admin',
   *     password: 'admin123'
   *   });
   *   console.log('Logged in as:', response.user.username);
   *   console.log('Access token:', response.tokens.accessToken);
   * } catch (error) {
   *   console.error('Login failed:', error.message);
   * }
   *
   * @example
   * // Usage in Redux thunk (auth.slice.ts)
   * export const login = createAsyncThunk(
   *   'auth/login',
   *   async (credentials: LoginRequest) => {
   *     const response = await authApi.login(credentials);
   *     // Store tokens in localStorage
   *     localStorage.setItem('accessToken', response.tokens.accessToken);
   *     localStorage.setItem('refreshToken', response.tokens.refreshToken);
   *     return response;
   *   }
   * );
   *
   * @see LoginRequest interface for credentials structure
   * @see LoginResponse interface for response structure
   * @see auth.slice.ts for Redux integration
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data.data;
  },

  /**
   * Logout user and revoke refresh token
   *
   * HTTP: POST /api/v1/auth/logout
   *
   * Logs out user by revoking refresh token in Redis.
   * Access token remains valid until expiration (15 min) but cannot be refreshed.
   *
   * Logout flow:
   * 1. Send refresh token to backend
   * 2. Backend removes refresh token from Redis
   * 3. Backend returns success response
   * 4. Frontend clears tokens from Redux and localStorage
   * 5. Frontend redirects to login page
   *
   * Token cleanup:
   * - Access token: Cleared from Redux auth.accessToken and localStorage
   * - Refresh token: Cleared from Redux auth.refreshToken and localStorage
   * - User info: Cleared from Redux auth.user
   *
   * Security notes:
   * - Access token cannot be revoked (stateless JWT)
   * - Access token expires in 15 minutes (short TTL limits exposure)
   * - Refresh token immediately revoked in Redis
   * - User cannot obtain new access tokens after logout
   * - For immediate session termination, implement token blacklist
   *
   * @async
   * @function logout
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<void>} Resolves when logout succeeds
   * @throws {Error} If logout fails (401 Unauthorized, network error)
   *
   * @example
   * // Logout user
   * try {
   *   await authApi.logout(refreshToken);
   *   console.log('Logged out successfully');
   * } catch (error) {
   *   console.error('Logout failed:', error.message);
   * }
   *
   * @example
   * // Usage in Redux thunk (auth.slice.ts)
   * export const logout = createAsyncThunk(
   *   'auth/logout',
   *   async (_, { getState }) => {
   *     const state = getState() as RootState;
   *     const refreshToken = state.auth.refreshToken;
   *     await authApi.logout(refreshToken);
   *     // Clear tokens from localStorage
   *     localStorage.removeItem('accessToken');
   *     localStorage.removeItem('refreshToken');
   *   }
   * );
   *
   * @see auth.slice.ts for Redux integration
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },
};
