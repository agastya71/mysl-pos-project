/**
 * @fileoverview Authentication Redux Slice - Manages user authentication state
 *
 * This slice handles user login, logout, and authentication state persistence.
 * It stores authentication state in both Redux (for runtime) and localStorage
 * (for persistence across sessions).
 *
 * State persistence:
 * - Access token, refresh token, and user info stored in localStorage on login
 * - State rehydrated from localStorage on app initialization
 * - All tokens cleared from localStorage on logout
 *
 * Authentication flow:
 * 1. User submits credentials via login thunk
 * 2. On success: tokens and user info stored in localStorage and Redux
 * 3. On page refresh: loadAuthState rehydrates state from localStorage
 * 4. On logout: tokens cleared from both localStorage and Redux
 *
 * @module store/slices/auth
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, LoginRequest, LoginResponse } from '../../services/api/auth.api';

/**
 * Authentication state interface
 *
 * @interface AuthState
 * @property {LoginResponse['user'] | null} user - Currently authenticated user info, or null if not logged in
 * @property {boolean} isAuthenticated - True if user is currently authenticated
 * @property {boolean} isLoading - True during async authentication operations (login/logout)
 * @property {string | null} error - Error message from failed login, or null if no error
 */
export interface AuthState {
  user: LoginResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Loads authentication state from localStorage
 *
 * Attempts to rehydrate authentication state from browser localStorage
 * on app initialization. This allows users to remain logged in across
 * page refreshes and browser restarts.
 *
 * Checks for both access token and user info. If either is missing,
 * returns unauthenticated state.
 *
 * @returns {Pick<AuthState, 'user' | 'isAuthenticated'>} Partial auth state from localStorage
 * @returns {LoginResponse['user'] | null} returns.user - User info if found
 * @returns {boolean} returns.isAuthenticated - True if valid session found
 *
 * @example
 * // On app initialization
 * const authState = loadAuthState();
 * // Returns: { user: { id: 'uuid', username: 'admin', ... }, isAuthenticated: true }
 * // Or: { user: null, isAuthenticated: false }
 */
const loadAuthState = (): Pick<AuthState, 'user' | 'isAuthenticated'> => {
  try {
    // Read authentication data from localStorage
    const accessToken = localStorage.getItem('accessToken');
    const userJson = localStorage.getItem('user');

    // Both token and user must exist for valid session
    if (accessToken && userJson) {
      const user = JSON.parse(userJson);
      return { user, isAuthenticated: true };
    }
  } catch (error) {
    // Handle JSON parse errors or localStorage access issues
    console.error('Failed to load auth state from localStorage:', error);
  }

  // Default to unauthenticated state if no valid session found
  return { user: null, isAuthenticated: false };
};

// Initial state: rehydrate from localStorage, default loading/error to null
const initialState: AuthState = {
  ...loadAuthState(),
  isLoading: false,
  error: null,
};

/**
 * Async thunk: Authenticate user with username and password
 *
 * Performs login by calling the backend authentication API. On success,
 * stores access token, refresh token, and user info in localStorage for
 * persistence across sessions.
 *
 * Flow:
 * 1. Call authApi.login with credentials
 * 2. On success: store tokens and user in localStorage
 * 3. Return response to reducer (sets isAuthenticated, user in state)
 * 4. On failure: return error message via rejectWithValue
 *
 * @async
 * @function login
 * @param {LoginRequest} credentials - Username and password
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<LoginResponse>} User info and tokens on success
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Dispatch login from component
 * import { useAppDispatch } from '../../store/hooks';
 * import { login } from '../../store/slices/auth.slice';
 *
 * const dispatch = useAppDispatch();
 * const result = await dispatch(login({ username: 'admin', password: 'admin123' }));
 *
 * if (login.fulfilled.match(result)) {
 *   console.log('Login successful:', result.payload.user);
 * } else {
 *   console.error('Login failed:', result.payload);
 * }
 *
 * @see LoginRequest interface in services/api/auth.api.ts
 * @see LoginResponse interface in services/api/auth.api.ts
 * @see authApi.login for backend API call
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      // Call backend login API
      const response = await authApi.login(credentials);

      // Persist authentication data in localStorage for session persistence
      localStorage.setItem('accessToken', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      // Extract error message from API response or use generic message
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
    }
  }
);

/**
 * Async thunk: Log out current user
 *
 * Performs logout by calling the backend logout API (to revoke refresh token)
 * and clearing all authentication data from localStorage.
 *
 * The backend API call is best-effort - if it fails (e.g., network error),
 * we still proceed with clearing local data to ensure user is logged out
 * on the frontend.
 *
 * Flow:
 * 1. Read refresh token from localStorage
 * 2. Call authApi.logout to revoke token on backend (best-effort)
 * 3. Clear tokens and user from localStorage
 * 4. Reducer sets isAuthenticated=false, user=null
 *
 * @async
 * @function logout
 * @returns {Promise<void>} No return value
 *
 * @example
 * // Dispatch logout from component
 * import { useAppDispatch } from '../../store/hooks';
 * import { logout } from '../../store/slices/auth.slice';
 *
 * const dispatch = useAppDispatch();
 * await dispatch(logout());
 * // User is now logged out
 *
 * @see authApi.logout for backend API call
 */
export const logout = createAsyncThunk('auth/logout', async () => {
  // Attempt to revoke refresh token on backend (best-effort)
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch (error) {
      // Continue with logout even if API call fails (network error, etc.)
      // This ensures user can always log out on frontend
    }
  }

  // Clear all authentication data from localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
});

/**
 * Authentication Redux Slice
 *
 * Manages authentication state with synchronous and asynchronous actions:
 * - Synchronous: clearError (resets error state)
 * - Asynchronous: login (pending/fulfilled/rejected), logout (fulfilled)
 *
 * @slice auth
 * @state AuthState
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Clears authentication error message
     *
     * Use this action to reset error state after displaying an error
     * to the user, or before retrying a login attempt.
     *
     * @param {AuthState} state - Current authentication state
     *
     * @example
     * // Clear error after displaying to user
     * import { useAppDispatch } from '../../store/hooks';
     * import { clearError } from '../../store/slices/auth.slice';
     *
     * const dispatch = useAppDispatch();
     * dispatch(clearError());
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login: pending - set loading state
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Login: fulfilled - set authenticated state with user info
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      // Login: rejected - set error state
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Logout: fulfilled - clear authenticated state
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
