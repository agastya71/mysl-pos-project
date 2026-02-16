/**
 * Gift Card API Integration Tests
 */

import request from 'supertest';
import express from 'express';
import giftCardRoutes from '../../routes/gift-card.routes';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Gift Card API Integration Tests', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: '550e8400-e29b-41d4-a716-446655440200',
        username: 'testuser',
        role: 'admin',
      };
      next();
    });

    (requirePermission as jest.Mock).mockImplementation(() => (_req: any, _res: any, next: any) => {
      next();
    });

    app.use('/api/v1/gift-cards', giftCardRoutes);

    // Error handler
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Internal server error',
        },
      });
    });
  });

  beforeEach(() => {
    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/gift-cards', () => {
    it('should create gift card successfully', async () => {
      const requestBody = {
        initial_balance: 50.00,
        recipient_name: 'Jane Doe',
        recipient_email: 'jane@example.com',
      };

      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        initial_balance: 50.00,
        current_balance: 50.00,
        is_active: true,
        recipient_name: 'Jane Doe',
        recipient_email: 'jane@example.com',
        created_at: '2026-02-16T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/gift-cards')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gift card created successfully');
      expect(response.body.data.gift_card_number).toBe('GC-0000000001');
      expect(response.body.data.initial_balance).toBe(50.00);
    });

    it('should return 400 for invalid initial balance (negative)', async () => {
      const requestBody = {
        initial_balance: -10.00,
      };

      const response = await request(app)
        .post('/api/v1/gift-cards')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid initial balance (zero)', async () => {
      const requestBody = {
        initial_balance: 0,
      };

      const response = await request(app)
        .post('/api/v1/gift-cards')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const requestBody = {
        initial_balance: 50.00,
        recipient_email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/v1/gift-cards')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/gift-cards/:id', () => {
    it('should return gift card by ID', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        initial_balance: 100.00,
        current_balance: 75.50,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.gift_card_number).toBe('GC-0000000001');
      expect(response.body.data.current_balance).toBe(75.50);
    });

    it('should return 404 if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GIFT_CARD_NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/gift-cards/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('GET /api/v1/gift-cards/:number/balance', () => {
    it('should return balance for active gift card', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 42.50,
        is_active: true,
        expires_at: '2027-12-31T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/gift-cards/GC-0000000001/balance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current_balance).toBe(42.50);
      expect(response.body.data.gift_card_number).toBe('GC-0000000001');
    });

    it('should return 404 for non-existent gift card', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards/GC-9999999999/balance')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GIFT_CARD_NOT_FOUND');
    });

    it('should return 400 for inactive gift card', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 10.00,
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/gift-cards/GC-0000000001/balance')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GIFT_CARD_INACTIVE');
    });
  });

  describe('GET /api/v1/gift-cards', () => {
    it('should return paginated list of gift cards', async () => {
      const mockGiftCards = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          gift_card_number: 'GC-0000000001',
          current_balance: 50.00,
          is_active: true,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          gift_card_number: 'GC-0000000002',
          current_balance: 25.00,
          is_active: true,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: mockGiftCards, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/gift-cards')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.gift_cards).toHaveLength(2);
      expect(response.body.data.total).toBe(10);
      expect(response.body.data.page).toBe(1);
    });

    it('should filter by is_active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards')
        .query({ is_active: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by customer ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards')
        .query({ purchased_by_customer_id: '550e8400-e29b-41d4-a716-446655440100' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by balance range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards')
        .query({ min_balance: 10, max_balance: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/gift-cards/:id', () => {
    it('should update gift card successfully', async () => {
      const updateData = {
        recipient_name: 'Jane Smith',
        recipient_email: 'jane.smith@example.com',
      };

      const mockUpdatedGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        recipient_name: 'Jane Smith',
        recipient_email: 'jane.smith@example.com',
        updated_at: '2026-02-16T12:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedGiftCard], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gift card updated successfully');
      expect(response.body.data.recipient_name).toBe('Jane Smith');
    });

    it('should return 404 if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440999')
        .send({ recipient_name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001')
        .send({ recipient_email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/gift-cards/:id/adjust', () => {
    it('should adjust balance up successfully', async () => {
      const adjustData = {
        amount: 10.00,
        reason: 'Customer compensation',
      };

      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 25.00,
      };

      const mockUpdatedGiftCard = {
        ...mockGiftCard,
        current_balance: 35.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/adjust')
        .send(adjustData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Balance adjusted successfully');
      expect(response.body.data.current_balance).toBe(35.00);
    });

    it('should adjust balance down successfully', async () => {
      const adjustData = {
        amount: -5.00,
        reason: 'Correction',
      };

      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 50.00,
      };

      const mockUpdatedGiftCard = {
        ...mockGiftCard,
        current_balance: 45.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/adjust')
        .send(adjustData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current_balance).toBe(45.00);
    });

    it('should return 400 for missing reason', async () => {
      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/adjust')
        .send({ amount: 10.00 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if adjustment causes negative balance', async () => {
      const adjustData = {
        amount: -60.00,
        reason: 'Test',
      };

      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 50.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/adjust')
        .send(adjustData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ADJUSTMENT');
    });
  });

  describe('DELETE /api/v1/gift-cards/:id', () => {
    it('should deactivate gift card successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440001' }], rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Gift card deactivated successfully');
    });

    it('should return 404 if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/gift-cards/:id/history', () => {
    it('should return transaction history', async () => {
      const mockHistory = [
        {
          id: '550e8400-e29b-41d4-a716-446655440301',
          transaction_type: 'purchase',
          amount: 50.00,
          balance_before: 0,
          balance_after: 50.00,
          created_at: '2026-02-16T10:00:00Z',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440302',
          transaction_type: 'redemption',
          amount: -10.00,
          balance_before: 50.00,
          balance_after: 40.00,
          created_at: '2026-02-16T11:00:00Z',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockHistory, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].transaction_type).toBe('purchase');
      expect(response.body.data[1].transaction_type).toBe('redemption');
    });

    it('should return empty array if no history', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/gift-cards/550e8400-e29b-41d4-a716-446655440001/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });
});
