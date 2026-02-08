import request from 'supertest';
import express from 'express';
import customerRoutes from '../../routes/customer.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Customer API Integration Tests', () => {
  let app: express.Application;
  let mockClient: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock) = jest.fn((req, _res, next) => {
      req.user = { userId: 'user-123', username: 'testuser', role: 'cashier' };
      next();
    });

    app.use('/api/v1/customers', customerRoutes);

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

  describe('POST /api/v1/customers', () => {
    it('should create customer with full details', async () => {
      const requestBody = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        address_line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
      };

      const mockCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        ...requestBody,
        loyalty_points: 0,
        total_spent: 0,
        is_active: true,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/customers')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customer_number).toBe('CUST-000001');
      expect(response.body.data.email).toBe('john.doe@example.com');
    });

    it('should create customer with only required fields', async () => {
      const requestBody = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const mockCustomer = {
        id: 'customer-456',
        customer_number: 'CUST-000002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: null,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/customers')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('Jane');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({ first_name: 'John' }) // Missing last_name
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer by ID', async () => {
      const mockCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        first_name: 'John',
        last_name: 'Doe',
        loyalty_points: 100,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/customers/customer-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customer_number).toBe('CUST-000001');
    });

    it('should return 404 if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/customers/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/customers', () => {
    it('should return paginated list of customers', async () => {
      const mockCustomers = [
        { id: 'c1', customer_number: 'CUST-000001', first_name: 'John', last_name: 'Doe' },
        { id: 'c2', customer_number: 'CUST-000002', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockCustomers });

      const response = await request(app)
        .get('/api/v1/customers')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toHaveLength(2);
    });

    it('should filter customers by search query', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'c1', first_name: 'John' }] });

      const response = await request(app)
        .get('/api/v1/customers')
        .query({ search: 'John' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/customers/:id', () => {
    it('should update customer details', async () => {
      const updates = {
        first_name: 'Jane',
        email: 'jane.updated@example.com',
      };

      const mockUpdatedCustomer = {
        id: 'customer-123',
        ...updates,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockUpdatedCustomer], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/customers/customer-123')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('Jane');
    });

    it('should return 404 if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/customers/invalid-id')
        .send({ first_name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/customers/:id', () => {
    it('should soft delete customer', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'customer-123', is_active: false }],
        rowCount: 1,
      });

      const response = await request(app)
        .delete('/api/v1/customers/customer-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/customers/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/customers/search', () => {
    it('should search customers by query', async () => {
      const mockResults = [
        {
          id: 'c1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockResults });

      const response = await request(app)
        .get('/api/v1/customers/search')
        .query({ q: 'John' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 if query parameter missing', async () => {
      const response = await request(app)
        .get('/api/v1/customers/search')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
