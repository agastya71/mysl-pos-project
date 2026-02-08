import request from 'supertest';
import express from 'express';
import transactionRoutes from '../../routes/transaction.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Transaction API Integration Tests', () => {
  let app: express.Application;
  let mockClient: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    (authenticateToken as jest.Mock) = jest.fn((req, _res, next) => {
      req.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'cashier',
        terminalId: 'terminal-123',
      };
      next();
    });

    app.use('/api/v1/transactions', transactionRoutes);

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
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a transaction successfully', async () => {
      const requestBody = {
        terminal_id: 'terminal-123',
        customer_id: 'customer-123',
        items: [
          {
            product_id: 'product-123',
            quantity: 2,
            unit_price: 10.99,
          },
        ],
        payments: [
          {
            method: 'cash',
            amount: 25.00,
            received_amount: 30.00,
          },
        ],
      };

      // Mock successful transaction creation
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'draft' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'product-123', name: 'Test Product', price: 10.99, quantity_in_stock: 10, tax_rate: 0.08 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'item-123' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', subtotal: 21.98, total_amount: 23.74 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-123' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', status: 'completed' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'completed', total_amount: 23.74 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'item-123', product_id: 'product-123', quantity: 2, unit_price: 10.99 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-123', method: 'cash', amount: 25.00, received_amount: 30.00 }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const response = await request(app)
        .post('/api/v1/transactions')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transaction_number).toBe('T001-000001');
      expect(response.body.data.status).toBe('completed');
    });

    it('should return 400 for invalid request body', async () => {
      const invalidBody = {
        terminal_id: 'terminal-123',
        items: [], // Empty items array
        payments: [{ method: 'cash', amount: 10 }],
      };

      const response = await request(app)
        .post('/api/v1/transactions')
        .send(invalidBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      // Override auth middleware to reject
      (authenticateToken as jest.Mock).mockImplementationOnce((_req, res, _next) => {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No token provided' },
        });
      });

      await request(app)
        .post('/api/v1/transactions')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = {
        id: 'txn-123',
        transaction_number: 'T001-000001',
        subtotal: 21.98,
        total_amount: 23.74,
        status: 'completed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'item-1', product_id: 'prod-1', quantity: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payment-1', method: 'cash', amount: 25.00 }] });

      const response = await request(app)
        .get('/api/v1/transactions/txn-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('txn-123');
      expect(response.body.data.transaction_number).toBe('T001-000001');
    });

    it('should return 404 if transaction not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/transactions/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/transactions', () => {
    it('should return paginated list of transactions', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', total_amount: 23.74, status: 'completed' },
        { id: 'txn-2', transaction_number: 'T001-000002', total_amount: 15.50, status: 'completed' },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockTransactions });

      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(10);
    });

    it('should filter transactions by status', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-1', status: 'voided' }] });

      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ status: 'voided' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions[0].status).toBe('voided');
    });

    it('should filter transactions by date range', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ start_date: '2026-02-01', end_date: '2026-02-07' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/transactions/:id/void', () => {
    it('should void a transaction successfully', async () => {
      const mockTransaction = {
        id: 'txn-123',
        transaction_number: 'T001-000001',
        status: 'completed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockTransaction, status: 'voided' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const response = await request(app)
        .put('/api/v1/transactions/txn-123/void')
        .send({ reason: 'Customer requested refund' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('voided');
    });

    it('should return 400 if void reason missing', async () => {
      const response = await request(app)
        .put('/api/v1/transactions/txn-123/void')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 if transaction already voided', async () => {
      const mockTransaction = {
        id: 'txn-123',
        status: 'voided',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/transactions/txn-123/void')
        .send({ reason: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
