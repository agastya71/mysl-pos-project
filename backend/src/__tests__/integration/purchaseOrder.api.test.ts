/**
 * Purchase Order API Integration Tests
 *
 * Comprehensive tests for all 11 PO endpoints:
 * - POST /api/v1/purchase-orders (createPO)
 * - GET /api/v1/purchase-orders (getPOs with filters)
 * - GET /api/v1/purchase-orders/:id (getPOById)
 * - PUT /api/v1/purchase-orders/:id (updatePO)
 * - DELETE /api/v1/purchase-orders/:id (deletePO)
 * - POST /api/v1/purchase-orders/:id/submit (submitPO)
 * - POST /api/v1/purchase-orders/:id/approve (approvePO)
 * - POST /api/v1/purchase-orders/:id/receive (receiveItems)
 * - POST /api/v1/purchase-orders/:id/cancel (cancelPO)
 * - POST /api/v1/purchase-orders/:id/close (closePO)
 * - GET /api/v1/purchase-orders/reorder-suggestions (getReorderSuggestions)
 */

import request from 'supertest';
import express from 'express';
import purchaseOrderRoutes from '../../routes/purchaseOrder.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Purchase Order API Integration Tests', () => {
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
        role: 'admin',
        terminalId: 'terminal-123',
      };
      next();
    });

    app.use('/api/v1/purchase-orders', purchaseOrderRoutes);

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
    (pool.query as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/purchase-orders', () => {
    it('should create PO with valid data', async () => {
      const requestBody = {
        vendor_id: 'vendor-123',
        order_type: 'purchase',
        expected_delivery_date: '2026-02-15',
        items: [
          {
            product_id: 'product-123',
            quantity_ordered: 100,
            unit_cost: 10.0,
            tax_amount: 10.0,
          },
        ],
        notes: 'Test PO',
      };

      const mockPO = {
        id: 'po-123',
        po_number: 'PO-20260208-0001',
        vendor_id: 'vendor-123',
        vendor_name: 'Test Vendor',
        status: 'draft',
        items: [{ id: 'item-123', product_id: 'product-123' }],
      };

      // Mock for createPO service
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'vendor-123' }], rowCount: 1 }) // Vendor check
        .mockResolvedValueOnce({ rows: [{ id: 'product-123' }], rowCount: 1 }) // Products check
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // Insert PO
        .mockResolvedValueOnce({ rows: [{ id: 'item-123' }], rowCount: 1 }) // Insert item
        .mockResolvedValueOnce({ rowCount: 0 }) // COMMIT
        // Mock for getPOById call
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockPO.items, rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.po_number).toBe('PO-20260208-0001');
      expect(response.body.data.status).toBe('draft');
    });

    it('should return 400 for missing vendor_id', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .send({
          order_type: 'purchase',
          items: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for empty items array', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .send({
          vendor_id: 'vendor-123',
          order_type: 'purchase',
          items: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid order_type', async () => {
      const response = await request(app)
        .post('/api/v1/purchase-orders')
        .send({
          vendor_id: 'vendor-123',
          order_type: 'invalid-type',
          items: [{ product_id: 'p1', quantity_ordered: 10, unit_cost: 5 }],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/purchase-orders', () => {
    it('should return paginated list of POs', async () => {
      const mockPOs = [
        {
          id: 'po-1',
          po_number: 'PO-20260208-0001',
          vendor_name: 'Vendor A',
          status: 'draft',
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 }) // Count
        .mockResolvedValueOnce({ rows: mockPOs, rowCount: 1 }) // List
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Items for po-1

      const response = await request(app)
        .get('/api/v1/purchase-orders')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should filter by vendor_id', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/purchase-orders?vendor_id=vendor-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('po.vendor_id = $'),
        expect.arrayContaining(['vendor-123'])
      );
    });

    it('should filter by status', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/purchase-orders?status=approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search by PO number', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/purchase-orders?search=PO-2026')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/purchase-orders/:id', () => {
    it('should return PO by ID', async () => {
      const mockPO = {
        id: 'po-123',
        po_number: 'PO-20260208-0001',
        vendor_name: 'Test Vendor',
        status: 'draft',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // PO query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Items query

      const response = await request(app)
        .get('/api/v1/purchase-orders/po-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.po_number).toBe('PO-20260208-0001');
    });

    it('should return 404 for non-existent PO', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/purchase-orders/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/purchase-orders/:id', () => {
    it('should update draft PO', async () => {
      const requestBody = {
        expected_delivery_date: '2026-03-01',
        notes: 'Updated notes',
      };

      const mockPO = {
        id: 'po-123',
        status: 'draft',
        notes: 'Updated notes',
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 }) // Check PO
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 }) // Update PO
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get items
        .mockResolvedValueOnce({ rowCount: 0 }) // COMMIT
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/purchase-orders/po-123')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should return 400 when updating non-draft PO', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/purchase-orders/po-123')
        .send({ notes: 'Cannot update' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/purchase-orders/:id', () => {
    it('should delete draft PO', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/purchase-orders/po-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when deleting non-draft PO', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/purchase-orders/po-123')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent PO', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/purchase-orders/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/submit', () => {
    it('should submit draft PO', async () => {
      const mockPO = {
        id: 'po-123',
        status: 'submitted',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 }) // Check status
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 }) // Count items
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/submit')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
    });

    it('should return 400 if PO has no items', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/submit')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 if PO not in draft status', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'submitted' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/submit')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/approve', () => {
    it('should approve submitted PO', async () => {
      const mockPO = {
        id: 'po-123',
        status: 'approved',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'submitted' }], rowCount: 1 }) // Check status
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/approve')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });

    it('should return 400 if PO not in submitted status', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/approve')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/receive', () => {
    it('should receive items successfully', async () => {
      const requestBody = {
        items: [
          {
            item_id: 'item-123',
            quantity_received: 50,
          },
        ],
      };

      const mockPO = {
        id: 'po-123',
        status: 'partially_received',
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 }) // Check PO
        .mockResolvedValueOnce({
          rows: [{ id: 'item-123', quantity_ordered: 100, quantity_received: 0 }],
          rowCount: 1,
        }) // Check item
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE item
        .mockResolvedValueOnce({ rowCount: 0 }) // COMMIT
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/receive')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 if receiving more than ordered', async () => {
      const requestBody = {
        items: [
          {
            item_id: 'item-123',
            quantity_received: 150, // More than ordered
          },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'approved' }], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: 'item-123', quantity_ordered: 100, quantity_received: 0 }],
          rowCount: 1,
        });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/receive')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 if PO not in receivable status', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/receive')
        .send({ items: [{ item_id: 'item-123', quantity_received: 50 }] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/cancel', () => {
    it('should cancel PO with reason', async () => {
      const requestBody = {
        reason: 'Vendor unavailable',
      };

      const mockPO = {
        id: 'po-123',
        status: 'cancelled',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'draft' }], rowCount: 1 }) // Check status
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/cancel')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should return 400 if PO already closed', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'closed' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/cancel')
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/purchase-orders/:id/close', () => {
    it('should close fully received PO', async () => {
      const mockPO = {
        id: 'po-123',
        status: 'closed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ status: 'received' }], rowCount: 1 }) // Check status
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
        // Mock for getPOById
        .mockResolvedValueOnce({ rows: [mockPO], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/close')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('closed');
    });

    it('should return 400 if PO not fully received', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'partially_received' }], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/purchase-orders/po-123/close')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/purchase-orders/reorder-suggestions', () => {
    it('should return low stock products grouped by vendor', async () => {
      const mockProducts = [
        {
          vendor_id: 'vendor-1',
          vendor_name: 'Vendor A',
          product_id: 'product-1',
          product_name: 'Product 1',
          quantity_in_stock: 5,
          reorder_level: 10,
          reorder_quantity: 50,
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockProducts, rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/purchase-orders/reorder-suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendor_id).toBe('vendor-1');
    });

    it('should return empty array if no low stock products', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/purchase-orders/reorder-suggestions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });
});
