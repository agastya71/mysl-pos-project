/**
 * Manual mock for auth.middleware
 * Used by integration tests
 */

export const authenticateToken = jest.fn((req, _res, next) => {
  req.user = { userId: 'user-123', username: 'testuser', role: 'admin' };
  next();
});

export const requirePermission = jest.fn(() => (_req: any, _res: any, next: any) => {
  next();
});
