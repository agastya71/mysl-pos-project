import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../../routes/auth.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthService } from '../../services/auth.service';
import { loginLimiter, refreshLimiter } from '../../middleware/rateLimit.middleware';

jest.mock('../../services/auth.service');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../middleware/rateLimit.middleware');
jest.mock('../../utils/logger');

const mockLogin = jest.fn();
const mockRefreshToken = jest.fn();
const mockLogout = jest.fn();

(AuthService as jest.Mock).mockImplementation(() => ({
  login: mockLogin,
  refreshToken: mockRefreshToken,
  logout: mockLogout,
}));

describe('Auth API — cookie flow', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(cookieParser());
    app.use(express.json());

    app.use('/api/v1/auth', authRoutes);
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateToken as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { userId: 'user-123', username: 'admin', role: 'admin' };
      next();
    });
    (loginLimiter as unknown as jest.Mock).mockImplementation((_req: any, _res: any, next: any) => next());
    (refreshLimiter as unknown as jest.Mock).mockImplementation((_req: any, _res: any, next: any) => next());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should set httpOnly refreshToken cookie on successful login', async () => {
      mockLogin.mockResolvedValueOnce({
        user: { id: 'user-123', username: 'admin', role: 'admin' },
        tokens: { accessToken: 'access-tok', refreshToken: 'refresh-tok' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should still return refreshToken in body for Electron LAN clients', async () => {
      mockLogin.mockResolvedValueOnce({
        user: { id: 'user-123', username: 'admin', role: 'admin' },
        tokens: { accessToken: 'access-tok', refreshToken: 'refresh-tok' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'password123' })
        .expect(200);

      expect(res.body.data.tokens.refreshToken).toBe('refresh-tok');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should accept refreshToken from cookie', async () => {
      mockRefreshToken.mockResolvedValueOnce({
        accessToken: 'new-access', refreshToken: 'new-refresh',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=old-refresh-tok')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockRefreshToken).toHaveBeenCalledWith('old-refresh-tok');
    });

    it('should accept refreshToken from body (Electron LAN fallback)', async () => {
      mockRefreshToken.mockResolvedValueOnce({
        accessToken: 'new-access', refreshToken: 'new-refresh',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'body-refresh-tok' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockRefreshToken).toHaveBeenCalledWith('body-refresh-tok');
    });

    it('should return 400 when no refreshToken in cookie or body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should set new httpOnly cookie on successful refresh', async () => {
      mockRefreshToken.mockResolvedValueOnce({
        accessToken: 'new-access', refreshToken: 'new-refresh',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=old-tok')
        .expect(200);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke token from cookie and clear cookie', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', 'refreshToken=refresh-tok')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockLogout).toHaveBeenCalledWith('user-123', 'refresh-tok');
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));
      // Cookie is cleared when Max-Age=0 or Expires is in the past
      expect(refreshCookie).toMatch(/Max-Age=0|Expires=.*1970/);
    });

    it('should return 200 even when no refreshToken present (graceful logout)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('should accept refreshToken from body (Electron LAN fallback)', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'body-tok' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockLogout).toHaveBeenCalledWith('user-123', 'body-tok');
    });
  });
});
