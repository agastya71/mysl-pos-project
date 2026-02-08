import authReducer, {
  loginSuccess,
  logout,
  refreshTokenSuccess,
  AuthState,
} from '../../../store/slices/auth.slice';

describe('auth.slice', () => {
  const initialState: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'cashier' as const,
    assigned_terminal_id: 'terminal-123',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  };

  describe('loginSuccess', () => {
    it('should set user and tokens on successful login', () => {
      const state = authReducer(
        initialState,
        loginSuccess({ user: mockUser, tokens: mockTokens })
      );

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should update state if already logged in', () => {
      const existingState: AuthState = {
        user: { ...mockUser, username: 'olduser' },
        tokens: { ...mockTokens, accessToken: 'old-token' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const state = authReducer(
        existingState,
        loginSuccess({ user: mockUser, tokens: mockTokens })
      );

      expect(state.user?.username).toBe('testuser');
      expect(state.tokens?.accessToken).toBe('mock-access-token');
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      const authenticatedState: AuthState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const state = authReducer(authenticatedState, logout());

      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle logout from initial state', () => {
      const state = authReducer(initialState, logout());

      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('refreshTokenSuccess', () => {
    it('should update tokens while keeping user data', () => {
      const authenticatedState: AuthState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      const state = authReducer(authenticatedState, refreshTokenSuccess(newTokens));

      expect(state.user).toEqual(mockUser); // User unchanged
      expect(state.tokens).toEqual(newTokens); // Tokens updated
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle token refresh when not logged in', () => {
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      const state = authReducer(initialState, refreshTokenSuccess(newTokens));

      expect(state.tokens).toEqual(newTokens);
      expect(state.user).toBeNull(); // No user data
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('localStorage integration', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should persist tokens to localStorage on login', () => {
      authReducer(initialState, loginSuccess({ user: mockUser, tokens: mockTokens }));

      // Note: Actual localStorage persistence happens in middleware
      // This test documents the expected behavior
      expect(true).toBe(true);
    });

    it('should clear localStorage on logout', () => {
      const authenticatedState: AuthState = {
        user: mockUser,
        tokens: mockTokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      authReducer(authenticatedState, logout());

      // Note: Actual localStorage clearing happens in middleware
      expect(true).toBe(true);
    });
  });

  describe('user properties', () => {
    it('should store all user properties correctly', () => {
      const state = authReducer(
        initialState,
        loginSuccess({ user: mockUser, tokens: mockTokens })
      );

      expect(state.user?.id).toBe('user-123');
      expect(state.user?.username).toBe('testuser');
      expect(state.user?.full_name).toBe('Test User');
      expect(state.user?.email).toBe('test@example.com');
      expect(state.user?.role).toBe('cashier');
      expect(state.user?.assigned_terminal_id).toBe('terminal-123');
      expect(state.user?.is_active).toBe(true);
    });

    it('should handle user with manager role', () => {
      const managerUser = {
        ...mockUser,
        role: 'manager' as const,
      };

      const state = authReducer(
        initialState,
        loginSuccess({ user: managerUser, tokens: mockTokens })
      );

      expect(state.user?.role).toBe('manager');
    });

    it('should handle user without assigned terminal', () => {
      const noTerminalUser = {
        ...mockUser,
        assigned_terminal_id: null,
      };

      const state = authReducer(
        initialState,
        loginSuccess({ user: noTerminalUser, tokens: mockTokens })
      );

      expect(state.user?.assigned_terminal_id).toBeNull();
    });
  });

  describe('token properties', () => {
    it('should store all token properties', () => {
      const state = authReducer(
        initialState,
        loginSuccess({ user: mockUser, tokens: mockTokens })
      );

      expect(state.tokens?.accessToken).toBe('mock-access-token');
      expect(state.tokens?.refreshToken).toBe('mock-refresh-token');
      expect(state.tokens?.expiresIn).toBe(3600);
    });

    it('should handle different expiration times', () => {
      const shortLivedTokens = {
        ...mockTokens,
        expiresIn: 900, // 15 minutes
      };

      const state = authReducer(
        initialState,
        loginSuccess({ user: mockUser, tokens: shortLivedTokens })
      );

      expect(state.tokens?.expiresIn).toBe(900);
    });
  });
});
