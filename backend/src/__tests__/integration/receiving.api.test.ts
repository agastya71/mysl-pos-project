import request from 'supertest';
import express from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

let app: express.Application;
let mockClient: any;

const USER_ID = '550e8400-e29b-41d4-a716-446655440100';
const VENDOR_ID = '550e8400-e29b-41d4-a716-446655440200';
const RECEIVING_ID = '550e8400-e29b-41d4-a716-446655440300';
const ITEM_ID = '550e8400-e29b-41d4-a716-446655440400';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440500';
const PO_ID = '550e8400-e29b-41d4-a716-446655440600';
const PO_ITEM_ID = '550e8400-e29b-41d4-a716-446655440700';

beforeAll(async () => {
  app = express();
  app.use(express.json());

  (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = { userId: USER_ID, username: 'testuser', role: 'admin', terminalId: null };
    next();
  });

  (requirePermission as jest.Mock).mockImplementation(() => (_req: any, _res: any, next: any) => {
    next();
  });

  const receivingRoutes = (await import('../../routes/receiving.routes')).default;
  app.use('/api/v1/receiving', receivingRoutes);

  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  });
});

beforeEach(() => {
  mockClient = { query: jest.fn(), release: jest.fn() };
  (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  jest.restoreAllMocks();
  await new Promise((resolve) => setTimeout(resolve, 100));
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving', () => {
  it('should create a receiving with valid data', async () => {
    const created = {
      id: RECEIVING_ID,
      receiving_number: 'RCV-20260328-0001',
      vendor_id: VENDOR_ID,
      purchase_order_id: null,
      receiving_type: 'purchase',
      status: 'in_progress',
      received_date: '2026-03-28',
      received_by: USER_ID,
      total_items: 0,
      total_quantity: 0,
      total_value: '0.00',
      shipping_carrier: null,
      tracking_number: null,
      packing_slip_number: null,
      condition_notes: null,
      discrepancy_notes: null,
      internal_notes: null,
      is_donation: false,
      donation_receipt_sent: false,
      donation_receipt_number: null,
      donation_date: null,
      fair_market_value: null,
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor' }], rowCount: 1 }) // vendor check
      .mockResolvedValueOnce({ rows: [created], rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post('/api/v1/receiving')
      .send({ vendor_id: VENDOR_ID, receiving_type: 'purchase' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(RECEIVING_ID);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('should return 400 when vendor_id is missing', async () => {
    const res = await request(app)
      .post('/api/v1/receiving')
      .send({ receiving_type: 'purchase' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when receiving_type is missing', async () => {
    const res = await request(app)
      .post('/api/v1/receiving')
      .send({ vendor_id: VENDOR_ID });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when vendor not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // vendor check — not found

    const res = await request(app)
      .post('/api/v1/receiving')
      .send({ vendor_id: VENDOR_ID, receiving_type: 'purchase' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VENDOR_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/receiving
// ---------------------------------------------------------------------------
describe('GET /api/v1/receiving', () => {
  it('should list receivings with pagination', async () => {
    const receivings = [{
      id: RECEIVING_ID,
      receiving_number: 'RCV-20260328-0001',
      vendor_id: VENDOR_ID,
      vendor_name: 'Test Vendor',
      receiving_type: 'purchase',
      status: 'in_progress',
      received_date: '2026-03-28',
      total_items: 2,
      total_quantity: 10,
      total_value: '500.00',
      created_at: '2026-03-28T00:00:00Z',
    }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: receivings, rowCount: 1 });

    const res = await request(app).get('/api/v1/receiving?page=1&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receivings).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pages).toBe(1);
  });

  it('should filter by status', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/receiving?status=completed');
    expect(res.status).toBe(200);
    expect(res.body.data.receivings).toHaveLength(0);
  });

  it('should filter by vendor_id', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/receiving?vendor_id=${VENDOR_ID}`);
    expect(res.status).toBe(200);
  });

  it('should filter by date range', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/receiving?start_date=2026-03-01&end_date=2026-03-31');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/receiving/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/receiving/:id', () => {
  it('should return receiving with items', async () => {
    const receivingRow = {
      id: RECEIVING_ID,
      receiving_number: 'RCV-20260328-0001',
      vendor_id: VENDOR_ID,
      vendor_name: 'Test Vendor',
      purchase_order_id: null,
      receiving_type: 'purchase',
      status: 'in_progress',
      received_date: '2026-03-28',
      received_by: USER_ID,
      total_items: 1,
      total_quantity: 5,
      total_value: '250.00',
      shipping_carrier: null,
      tracking_number: null,
      packing_slip_number: null,
      condition_notes: null,
      discrepancy_notes: null,
      internal_notes: null,
      is_donation: false,
      donation_receipt_sent: false,
      donation_receipt_number: null,
      donation_date: null,
      fair_market_value: null,
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    };

    const items = [{
      id: ITEM_ID,
      receiving_id: RECEIVING_ID,
      product_id: PRODUCT_ID,
      product_name: 'Widget',
      quantity_received: 5,
      accepted_quantity: 5,
      condition: 'new',
      inventory_added: false,
      created_at: '2026-03-28T00:00:00Z',
    }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [receivingRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: items, rowCount: 1 });

    const res = await request(app).get(`/api/v1/receiving/${RECEIVING_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(RECEIVING_ID);
    expect(res.body.data.vendor_name).toBe('Test Vendor');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].product_name).toBe('Widget');
  });

  it('should return 404 when receiving not found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/receiving/${RECEIVING_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/receiving/:id
// ---------------------------------------------------------------------------
describe('PUT /api/v1/receiving/:id', () => {
  it('should update receiving metadata', async () => {
    const existing = { id: RECEIVING_ID, status: 'in_progress', shipping_carrier: 'UPS', tracking_number: '1Z999', updated_at: '2026-03-28T00:00:00Z' };
    const updated = { ...existing, shipping_carrier: 'FedEx', tracking_number: '7489' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existing], rowCount: 1 }) // fetch existing
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 }) // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .put(`/api/v1/receiving/${RECEIVING_ID}`)
      .send({ shipping_carrier: 'FedEx', tracking_number: '7489' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shipping_carrier).toBe('FedEx');
  });

  it('should return 404 when receiving not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch — not found

    const res = await request(app)
      .put(`/api/v1/receiving/${RECEIVING_ID}`)
      .send({ shipping_carrier: 'FedEx' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });

  it('should return 400 when receiving is already completed', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 });

    const res = await request(app)
      .put(`/api/v1/receiving/${RECEIVING_ID}`)
      .send({ shipping_carrier: 'FedEx' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving/:id/complete
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/complete', () => {
  it('should complete receiving and create inventory adjustments', async () => {
    const receiving = { id: RECEIVING_ID, status: 'in_progress', vendor_id: VENDOR_ID, purchase_order_id: null, receiving_number: 'RCV-20260328-0001' };
    const items = [{ id: ITEM_ID, receiving_id: RECEIVING_ID, product_id: PRODUCT_ID, purchase_order_item_id: null, accepted_quantity: 5, add_to_inventory: true, inventory_added: false }];
    const product = { id: PRODUCT_ID, quantity_in_stock: 10 };
    const completedReceiving = { ...receiving, status: 'completed', vendor_name: 'Test Vendor' };
    const completedItems = [{ ...items[0], inventory_added: true }];

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }) // fetch items
      .mockResolvedValueOnce({ rows: [product], rowCount: 1 }) // fetch product quantity
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440900' }], rowCount: 1 }) // INSERT adjustment
      .mockResolvedValueOnce({ rows: [completedItems[0]], rowCount: 1 }) // UPDATE item inventory_added
      .mockResolvedValueOnce({ rows: [{ ...receiving, status: 'completed' }], rowCount: 1 }) // UPDATE receiving status
      .mockResolvedValueOnce({ rows: [completedReceiving], rowCount: 1 }) // fetch updated receiving
      .mockResolvedValueOnce({ rows: completedItems, rowCount: 1 }) // fetch updated items
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
  });

  it('should return 400 when receiving is already completed', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 });

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });

  it('should return 400 when receiving is cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'cancelled' }], rowCount: 1 });

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_CANCELLED');
  });

  it('should return 400 when receiving has no items', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'in_progress', purchase_order_id: null }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch items — empty

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_NO_ITEMS');
  });

  it('should update PO status when purchase_order_id is set', async () => {
    const receiving = { id: RECEIVING_ID, status: 'in_progress', vendor_id: VENDOR_ID, purchase_order_id: PO_ID, receiving_number: 'RCV-20260328-0001' };
    const items = [{ id: ITEM_ID, receiving_id: RECEIVING_ID, product_id: PRODUCT_ID, purchase_order_item_id: PO_ITEM_ID, accepted_quantity: 5, add_to_inventory: true, inventory_added: false }];
    const product = { id: PRODUCT_ID, quantity_in_stock: 10 };
    const completedReceiving = { ...receiving, status: 'completed', vendor_name: 'Test Vendor' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }) // fetch items
      .mockResolvedValueOnce({ rows: [product], rowCount: 1 }) // fetch product
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440900' }], rowCount: 1 }) // INSERT adjustment
      .mockResolvedValueOnce({ rows: [{ ...items[0], inventory_added: true }], rowCount: 1 }) // UPDATE item
      .mockResolvedValueOnce({ rows: [{ ...receiving, status: 'completed' }], rowCount: 1 }) // UPDATE receiving status
      .mockResolvedValueOnce({ rows: [{ id: PO_ITEM_ID, quantity_ordered: 10 }], rowCount: 1 }) // fetch PO items
      .mockResolvedValueOnce({ rows: [{ purchase_order_item_id: PO_ITEM_ID, total_received: '5' }], rowCount: 1 }) // sum received
      .mockResolvedValueOnce({ rows: [{ id: PO_ID, status: 'partially_received' }], rowCount: 1 }) // UPDATE PO status
      .mockResolvedValueOnce({ rows: [completedReceiving], rowCount: 1 }) // fetch updated receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }) // fetch updated items
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving/:id/cancel
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/cancel', () => {
  it('should cancel an in-progress receiving', async () => {
    const existing = { id: RECEIVING_ID, status: 'in_progress', internal_notes: 'Some notes', vendor_name: 'Test Vendor' };
    const cancelled = { ...existing, status: 'cancelled', internal_notes: '[CANCELLED: Duplicate shipment] Some notes' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existing], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [cancelled], rowCount: 1 }) // UPDATE status
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Duplicate shipment' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('should return 400 when reason is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when receiving is already completed', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 });

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Changed mind' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });

  it('should return 400 when receiving is already cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'cancelled' }], rowCount: 1 });

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Changed mind' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_CANCELLED');
  });

  it('should return 404 when receiving not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not found

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Not needed' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving/:id/items
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/items', () => {
  it('should add an item to an in-progress receiving', async () => {
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };
    const createdItem = { id: ITEM_ID, receiving_id: RECEIVING_ID, product_id: PRODUCT_ID, product_name: 'Widget', quantity_received: 5, accepted_quantity: 5, condition: 'new', inventory_added: false };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [createdItem], rowCount: 1 }) // INSERT item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE receiving totals
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({ product_id: PRODUCT_ID, product_name: 'Widget', quantity_received: 5, condition: 'new' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product_name).toBe('Widget');
  });

  it('should return 400 when product_name is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({ condition: 'new', quantity_received: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when condition is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({ product_name: 'Widget', quantity_received: 5 });
    expect(res.status).toBe(400);
  });

  it('should return 404 when receiving not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not found

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({ product_name: 'Widget', condition: 'new', quantity_received: 5 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/receiving/items/:id
// ---------------------------------------------------------------------------
describe('PUT /api/v1/receiving/items/:id', () => {
  it('should update an item', async () => {
    const existingItem = { id: ITEM_ID, receiving_id: RECEIVING_ID, product_name: 'Widget', quantity_received: 5, unit_cost: '50.00', condition: 'new' };
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };
    const updatedItem = { ...existingItem, quantity_received: 10, condition: 'good' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existingItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [updatedItem], rowCount: 1 }) // UPDATE item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE receiving totals
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .put(`/api/v1/receiving/items/${ITEM_ID}`)
      .send({ quantity_received: 10, condition: 'good' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quantity_received).toBe(10);
  });

  it('should return 404 when item not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not found

    const res = await request(app)
      .put(`/api/v1/receiving/items/${ITEM_ID}`)
      .send({ quantity_received: 10 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_ITEM_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/receiving/items/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/receiving/items/:id', () => {
  it('should delete an item', async () => {
    const existingItem = { id: ITEM_ID, receiving_id: RECEIVING_ID };
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existingItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE totals
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app).delete(`/api/v1/receiving/items/${ITEM_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when item not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not found

    const res = await request(app).delete(`/api/v1/receiving/items/${ITEM_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_ITEM_NOT_FOUND');
  });

  it('should return 400 when receiving is completed', async () => {
    const existingItem = { id: ITEM_ID, receiving_id: RECEIVING_ID };
    const receiving = { id: RECEIVING_ID, status: 'completed' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existingItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }); // fetch receiving — completed

    const res = await request(app).delete(`/api/v1/receiving/items/${ITEM_ID}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });
});
