/**
 * Category API Integration Tests
 *
 * Tests API endpoints with mocked database layer
 */

import request from 'supertest';
import express from 'express';
import categoryRoutes from '../../routes/category.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Category API Integration Tests', () => {
  let app: express.Application;
  let mockClient: any;
  let server: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = {
        userId: 'user-123',
        username: 'testuser',
        role: 'admin',
        terminalId: 'terminal-123',
      };
      next();
    });

    app.use('/api/v1/categories', categoryRoutes);

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

    // Start server on random port
    server = app.listen(0);
  });

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/categories', () => {
    it('should create category with full details', async () => {
      const mockCategory = {
        id: 'cat-123',
        category_number: 'CAT-000001',
        name: 'Test Electronics',
        description: 'Test electronic devices',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/categories')
        .send({
          name: 'Test Electronics',
          description: 'Test electronic devices',
          display_order: 1,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Electronics');
      expect(response.body.data.category_number).toBe('CAT-000001');
    });

    it('should create category with only required fields', async () => {
      const mockCategory = {
        id: 'cat-124',
        category_number: 'CAT-000002',
        name: 'Test Category Minimal',
        description: null,
        parent_category_id: null,
        display_order: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/categories')
        .send({
          name: 'Test Category Minimal',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Category Minimal');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/categories')
        .send({
          description: 'Missing name field',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should return list of categories', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          category_number: 'CAT-000001',
          name: 'Electronics',
          description: 'Electronic devices',
          parent_category_id: null,
          display_order: 1,
          is_active: true,
          product_count: 5,
        },
        {
          id: 'cat-2',
          category_number: 'CAT-000002',
          name: 'Books',
          description: 'Books and media',
          parent_category_id: null,
          display_order: 2,
          is_active: true,
          product_count: 3,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockCategories, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          category_number: 'CAT-000001',
          name: 'Electronics',
          is_active: true,
          product_count: 5,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockCategories, rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/categories?active_only=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should return category by ID', async () => {
      const mockCategory = {
        id: 'cat-123',
        category_number: 'CAT-000001',
        name: 'Electronics',
        description: 'Electronic devices',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
        product_count: 5,
      };

      // Mock for getPurchaseOrderById - main query
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // children

      const response = await request(app)
        .get('/api/v1/categories/cat-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics');
    });

    it('should return 404 if category not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/categories/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/categories/:id', () => {
    it('should update category details', async () => {
      const mockCategory = {
        id: 'cat-123',
        category_number: 'CAT-000001',
        name: 'Updated Electronics',
        description: 'Updated description',
        parent_category_id: null,
        display_order: 1,
        is_active: true,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockCategory], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/categories/cat-123')
        .send({
          name: 'Updated Electronics',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Electronics');
    });

    it('should return 404 if category not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/categories/nonexistent')
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should soft delete category', async () => {
      // Mock check for products
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        // Mock check for subcategories
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        // Mock UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 'cat-123' }], rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/categories/cat-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if category not found', async () => {
      // Mock check for products
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        // Mock check for subcategories
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        // Mock UPDATE with no rows
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/categories/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
