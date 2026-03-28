import request from 'supertest';
import express from 'express';

jest.mock('../../utils/logger');
jest.mock('../../services/terminal.service');

// Control permission via a module-level flag so the registered middleware
// can vary its behaviour per-test without needing to re-register routes.
let _allowPermission = true;

jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'user-123', username: 'cashier', role: 'cashier' };
    next();
  }),
  requirePermission: jest.fn((_resource: string, _action: string) => {
    return (_req: any, _res: any, next: any) => {
      if (!_allowPermission) {
        const err: any = new Error('Insufficient permissions');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        return next(err);
      }
      next();
    };
  }),
}));

import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import terminalService from '../../services/terminal.service';
import paymentRoutes from '../../routes/payments.routes';

describe('Payments API — RBAC', () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/payments', paymentRoutes);
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    });
    return app;
  };

  beforeEach(() => {
    _allowPermission = true;
    // Clear only service mocks — do NOT clear requirePermission because it is called
    // at route registration time (module import), not per-request. Clearing its call
    // history would make the "toHaveBeenCalledWith" assertions always fail.
    (terminalService.createCheckout as jest.Mock).mockReset();
    (terminalService.getCheckoutStatus as jest.Mock).mockReset();
    (terminalService.cancelCheckout as jest.Mock).mockReset();
    (terminalService.createCheckout as jest.Mock).mockResolvedValue({ checkoutId: 'chk-123' });
    (terminalService.getCheckoutStatus as jest.Mock).mockResolvedValue({ status: 'PENDING' });
    (terminalService.cancelCheckout as jest.Mock).mockResolvedValue(undefined);
  });

  describe('POST /api/v1/payments/terminal/checkout', () => {
    it('should call requirePermission("payments", "create")', async () => {
      _allowPermission = true;
      const app = buildApp();

      await request(app)
        .post('/api/v1/payments/terminal/checkout')
        .send({ amount: 10.00, idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(201);

      expect(requirePermission).toHaveBeenCalledWith('payments', 'create');
    });

    it('should return 403 when user lacks payments:create permission', async () => {
      _allowPermission = false;
      const app = buildApp();

      const res = await request(app)
        .post('/api/v1/payments/terminal/checkout')
        .send({ amount: 10.00, idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/payments/terminal/checkout/:id', () => {
    it('should call requirePermission("payments", "read")', async () => {
      _allowPermission = true;
      const app = buildApp();

      await request(app)
        .get('/api/v1/payments/terminal/checkout/chk-123')
        .expect(200);

      expect(requirePermission).toHaveBeenCalledWith('payments', 'read');
    });

    it('should return 403 when user lacks payments:read permission', async () => {
      _allowPermission = false;
      const app = buildApp();

      const res = await request(app)
        .get('/api/v1/payments/terminal/checkout/chk-123')
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/payments/terminal/checkout/:id/cancel', () => {
    it('should call requirePermission("payments", "update")', async () => {
      _allowPermission = true;
      const app = buildApp();

      await request(app)
        .post('/api/v1/payments/terminal/checkout/chk-123/cancel')
        .expect(200);

      expect(requirePermission).toHaveBeenCalledWith('payments', 'update');
    });

    it('should return 403 when user lacks payments:update permission', async () => {
      _allowPermission = false;
      const app = buildApp();

      const res = await request(app)
        .post('/api/v1/payments/terminal/checkout/chk-123/cancel')
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Seed data completeness', () => {
    it('payments permissions exist in seed file', () => {
      const fs = require('fs');
      const path = require('path');
      const seedContent = fs.readFileSync(
        path.join(__dirname, '../../../src/database/seed.ts'),
        'utf-8'
      );
      expect(seedContent).toContain("'payments:create'");
      expect(seedContent).toContain("'payments:read'");
      expect(seedContent).toContain("'payments:update'");
      expect(seedContent).toContain('employees');
    });
  });
});
