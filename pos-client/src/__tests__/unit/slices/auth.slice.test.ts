import authReducer, {
  login,
  logout,
  clearError,
  AuthState,
} from '../../../store/slices/auth.slice';
import { authApi, LoginResponse } from '../../../services/api/auth.api';

// Mock the auth API
jest.mock('../../../services/api/auth.api');
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('auth.slice', () => {
  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  const mockUser: LoginResponse['user'] = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    role: 'cashier',
    assigned_terminal_id: 'terminal-123',
  };

  const mockLoginResponse: LoginResponse = {
    user: mockUser,
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login async thunk', () => {
    it('should set loading state when login is pending', () => {
      const action = { type: login.pending.type };
      const state = authReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user and authenticated on successful login', () => {
      const action = {
        type: login.fulfilled.type,
        payload: mockLoginResponse,
      };
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should set error on failed login', () => {
      const errorMessage = 'Invalid credentials';
      const action = {
        type: login.rejected.type,
        payload: errorMessage,
      };
      const state = authReducer(initialState, action);

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });

    it('should handle login with API call', async () => {
      mockAuthApi.login.mockResolvedValue(mockLoginResponse);

      const dispatch = jest.fn();
      const getState = jest.fn();
      const extra = {};

      const thunk = login({ username: 'testuser', password: 'password123' });
      const result = await thunk(dispatch, getState, extra);

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(result.payload).toEqual(mockLoginResponse);
    });
  });

  describe('logout async thunk', () => {
    it('should clear all auth state on logout', () => {
      const authenticatedState: AuthState = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const action = { type: logout.fulfilled.type };
      const state = authReducer(authenticatedState, action);

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle logout from initial state', () => {
      const action = { type: logout.fulfilled.type };
      const state = authReducer(initialState, action);

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call logout API when thunk is dispatched', async () => {
      mockAuthApi.logout.mockResolvedValue();
      localStorage.setItem('refreshToken', 'test-refresh-token');

      const dispatch = jest.fn();
      const getState = jest.fn();
      const extra = {};

      const thunk = logout();
      await thunk(dispatch, getState, extra);

      expect(mockAuthApi.logout).toHaveBeenCalledWith('test-refresh-token');
    });
  });

  describe('clearError action', () => {
    it('should clear error message', () => {
      const stateWithError: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Some error occurred',
      };

      const state = authReducer(stateWithError, clearError());

      expect(state.error).toBeNull();
    });

    it('should not affect other state properties', () => {
      const stateWithError: AuthState = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: 'Some error occurred',
      };

      const state = authReducer(stateWithError, clearError());

      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('user properties', () => {
    it('should store all user properties correctly', () => {
      const action = {
        type: login.fulfilled.type,
        payload: mockLoginResponse,
      };
      const state = authReducer(initialState, action);

      expect(state.user?.id).toBe('user-123');
      expect(state.user?.username).toBe('testuser');
      expect(state.user?.full_name).toBe('Test User');
      expect(state.user?.role).toBe('cashier');
      expect(state.user?.assigned_terminal_id).toBe('terminal-123');
    });

    it('should handle user with manager role', () => {
      const managerUser = {
        ...mockUser,
        role: 'manager',
      };

      const action = {
        type: login.fulfilled.type,
        payload: {
          user: managerUser,
          tokens: mockLoginResponse.tokens,
        },
      };
      const state = authReducer(initialState, action);

      expect(state.user?.role).toBe('manager');
    });

    it('should handle user without assigned terminal', () => {
      const noTerminalUser = {
        ...mockUser,
        assigned_terminal_id: undefined,
      };

      const action = {
        type: login.fulfilled.type,
        payload: {
          user: noTerminalUser,
          tokens: mockLoginResponse.tokens,
        },
      };
      const state = authReducer(initialState, action);

      expect(state.user?.assigned_terminal_id).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors during login', () => {
      const errorMessage = 'Network error';
      const action = {
        type: login.rejected.type,
        payload: errorMessage,
      };
      const state = authReducer(initialState, action);

      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear previous errors on new login attempt', () => {
      const stateWithError: AuthState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Previous error',
      };

      const action = { type: login.pending.type };
      const state = authReducer(stateWithError, action);

      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(true);
    });
  });
});
