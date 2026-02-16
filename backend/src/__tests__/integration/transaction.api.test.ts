import request from 'supertest';
import express from 'express';
import transactionRoutes from '../../routes/transaction.routes';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
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
    (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: '550e8400-e29b-41d4-a716-446655440020',
        username: 'testuser',
        role: 'cashier',
        terminalId: '550e8400-e29b-41d4-a716-446655440001',
      };
      next();
    });

    (requirePermission as jest.Mock).mockImplementation(() => (_req: any, _res: any, next: any) => {
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
          details: err.details || undefined,
        },
      });
    });
  });

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a transaction successfully', async () => {
      const requestBody = {
        terminal_id: '550e8400-e29b-41d4-a716-446655440001',
        customer_id: '550e8400-e29b-41d4-a716-446655440002',
        items: [
          {
            product_id: '550e8400-e29b-41d4-a716-446655440003',
            quantity: 2,
          },
        ],
        payments: [
          {
            payment_method: 'cash',
            amount: 22.00,
            payment_details: {
              cash_received: 30.00,
            },
          },
        ],
      };

      // Mock pool.query for createProductSnapshot category lookup
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ name: 'Test Category' }],
        rowCount: 1,
      });

      // Mock pool.query for getTransactionById (called after COMMIT)
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: '550e8400-e29b-41d4-a716-446655440010',
          transaction_number: 'T001-000001',
          status: 'completed',
          subtotal: 21.98,
          tax_amount: 0.02,
          total_amount: 22.00,
          items: [{
            id: '550e8400-e29b-41d4-a716-446655440012',
            product_id: '550e8400-e29b-41d4-a716-446655440003',
            quantity: 2,
            unit_price: 10.99,
            line_total: 21.98,
          }],
          payments: [{
            id: '550e8400-e29b-41d4-a716-446655440013',
            payment_method: 'cash',
            amount: 22.00,
            details: {
              cash_received: 30.00,
              cash_change: 8.00,
            },
          }],
        }],
        rowCount: 1,
      });

      // Mock successful transaction creation (client.query calls)
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // SELECT terminal_number
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }], rowCount: 1 }) // generate_transaction_number
        .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440010', transaction_number: 'T001-000001', status: 'draft' }], rowCount: 1 }) // INSERT transaction
        .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440003', name: 'Test Product', base_price: 10.99, quantity_in_stock: 10, tax_rate: 0.08, category_id: 'cat-123' }], rowCount: 1 }) // SELECT product
        .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440012' }], rowCount: 1 }) // INSERT transaction_item
        .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440013' }], rowCount: 1 }) // INSERT payment
        .mockResolvedValueOnce({ rows: [{ id: 'detail-123' }], rowCount: 1 }) // INSERT payment_details
        .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440010', status: 'completed' }], rowCount: 1 }) // UPDATE transaction
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
      const txnId = '550e8400-e29b-41d4-a716-446655440110';
      const mockTransaction = {
        id: txnId,
        transaction_number: 'T001-000001',
        subtotal: 21.98,
        total_amount: 23.74,
        status: 'completed',
        items: [{ id: 'item-1', product_id: 'prod-1', quantity: 2 }],
        payments: [{ id: 'payment-1', payment_method: 'cash', amount: 25.00 }],
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 });

      const response = await request(app)
        .get(`/api/v1/transactions/${txnId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(txnId);
      expect(response.body.data.transaction_number).toBe('T001-000001');
    });

    it('should return 404 if transaction not found', async () => {
      const validButNonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get(`/api/v1/transactions/${validButNonExistentId}`)
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

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })
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
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'txn-1', status: 'voided' }] });

      const response = await request(app)
        .get('/api/v1/transactions')
        .query({ status: 'voided' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions[0].status).toBe('voided');
    });

    it('should filter transactions by date range', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
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
      const txnId = '550e8400-e29b-41d4-a716-446655440100';
      const mockTransaction = {
        id: txnId,
        transaction_number: 'T001-000001',
        status: 'completed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // SELECT transaction
        .mockResolvedValueOnce({ rows: [{ id: 'item-1', product_id: '550e8400-e29b-41d4-a716-446655440101', quantity: 2 }], rowCount: 1 }) // SELECT items
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE product inventory
        .mockResolvedValueOnce({ rows: [{ ...mockTransaction, status: 'voided' }], rowCount: 1 }) // UPDATE transaction
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const response = await request(app)
        .put(`/api/v1/transactions/${txnId}/void`)
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
