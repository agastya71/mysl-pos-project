# Inventory Receiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Inventory Receiving backend module — 9 endpoints to record, track, and complete physical stock intake with full inventory audit trail.

**Architecture:** Three new files (routes/receiving.routes.ts, controllers/receiving.controller.ts, services/receiving.service.ts) following the established PO module pattern; one integration test file; two new schema files (function + trigger for receiving number); one schema modification (inventory_adjustments CHECK constraint). Registered in routes/index.ts under /api/v1/receiving.

**Tech Stack:** Node.js + Express + TypeScript strict + PostgreSQL (pg pool) + Zod validation + Jest + supertest

---

## Task 1: Schema Changes

Add `'receiving'` to the `inventory_adjustments` CHECK constraint, create the `generate_receiving_number` function and `set_receiving_number` trigger.

- [ ] **Step 1.1** — Modify `schema/tables/inventory_adjustments.sql` to add `'receiving'` to the CHECK constraint

Open `schema/tables/inventory_adjustments.sql` and change line 12:

```sql
-- OLD:
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('damage', 'theft', 'found', 'correction', 'initial')),
-- NEW:
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('damage', 'theft', 'found', 'correction', 'initial', 'receiving')),
```

Also update the COMMENT on line 32:

```sql
-- OLD:
COMMENT ON COLUMN inventory_adjustments.adjustment_type IS 'Type: damage, theft, found, correction, initial';
-- NEW:
COMMENT ON COLUMN inventory_adjustments.adjustment_type IS 'Type: damage, theft, found, correction, initial, receiving';
```

- [ ] **Step 1.2** — Create `schema/functions/generate_receiving_number.sql`

```bash
cat > schema/functions/generate_receiving_number.sql << 'SQLEOF'
/**
 * Auto-generates sequential receiving numbers with date-based format
 * Format: RCV-YYYYMMDD-XXXX (e.g., RCV-20260328-0001)
 *
 * Resets sequence daily for better organization and reporting
 * Called by trigger before INSERT on inventory_receiving table
 */
CREATE OR REPLACE FUNCTION generate_receiving_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  next_num INTEGER;
BEGIN
  -- Get today's date in YYYYMMDD format
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Find the highest sequence number for today and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(receiving_number FROM 14) AS INTEGER)), 0) + 1
  INTO next_num
  FROM inventory_receiving
  WHERE receiving_number LIKE 'RCV-' || today || '-%';

  -- Generate receiving number: RCV-YYYYMMDD-XXXX
  NEW.receiving_number := 'RCV-' || today || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SQLEOF
```

Verify:

```bash
cat schema/functions/generate_receiving_number.sql
# Expected: 28-line SQL function matching the pattern above
```

- [ ] **Step 1.3** — Create `schema/triggers/set_receiving_number.sql`

```bash
cat > schema/triggers/set_receiving_number.sql << 'SQLEOF'
/**
 * Trigger: set_receiving_number_trigger
 * Automatically generates receiving number before INSERT if not provided
 *
 * Format: RCV-YYYYMMDD-XXXX (e.g., RCV-20260328-0001)
 * Ensures all inventory receivings have unique sequential numbers
 */
CREATE TRIGGER set_receiving_number_trigger
  BEFORE INSERT ON inventory_receiving
  FOR EACH ROW
  WHEN (NEW.receiving_number IS NULL OR NEW.receiving_number = '')
  EXECUTE FUNCTION generate_receiving_number();
SQLEOF
```

Verify:

```bash
cat schema/triggers/set_receiving_number.sql
# Expected: 13-line SQL trigger matching the pattern above
```

- [ ] **Step 1.4** — Commit schema changes

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving
git add schema/tables/inventory_adjustments.sql \
        schema/functions/generate_receiving_number.sql \
        schema/triggers/set_receiving_number.sql
git commit -m "feat(receiving): add receiving number trigger and receiving adjustment type

- Add 'receiving' to inventory_adjustments CHECK constraint
- Create generate_receiving_number() function (RCV-YYYYMMDD-XXXX format)
- Create set_receiving_number_trigger on inventory_receiving table"
```

---

## Task 2: Integration Tests (Red Phase)

Write the full test file. All tests will fail because no routes/service/controller exist yet.

- [ ] **Step 2.1** — Create `backend/src/__tests__/integration/receiving.api.test.ts`

```bash
cat > backend/src/__tests__/integration/receiving.api.test.ts << 'TSEOF'
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
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440800';

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
// POST /api/v1/receiving — Create Receiving
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

    // BEGIN, vendor check, INSERT, COMMIT
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
// GET /api/v1/receiving — List Receivings
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
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // count
      .mockResolvedValueOnce({ rows: receivings, rowCount: 1 }); // data

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
    expect(res.body.data.receivings).toHaveLength(0);
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
// GET /api/v1/receiving/:id — Get Receiving
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
      purchase_order_item_id: null,
      product_id: PRODUCT_ID,
      sku: 'SKU-001',
      product_name: 'Widget',
      product_description: null,
      category_id: null,
      quantity_received: 5,
      unit_cost: '50.00',
      fair_market_value: null,
      condition: 'new',
      line_total: '250.00',
      accepted_quantity: 5,
      rejected_quantity: 0,
      rejection_reason: null,
      add_to_inventory: true,
      inventory_added: false,
      notes: null,
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [receivingRow], rowCount: 1 }) // receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }); // items

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
// PUT /api/v1/receiving/:id — Update Receiving
// ---------------------------------------------------------------------------
describe('PUT /api/v1/receiving/:id', () => {
  it('should update receiving metadata', async () => {
    const existing = {
      id: RECEIVING_ID,
      status: 'in_progress',
      shipping_carrier: 'UPS',
      tracking_number: '1Z999',
      condition_notes: 'Good condition',
      updated_at: '2026-03-28T00:00:00Z',
    };
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
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 }); // fetch — completed

    const res = await request(app)
      .put(`/api/v1/receiving/${RECEIVING_ID}`)
      .send({ shipping_carrier: 'FedEx' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving/:id/complete — Complete Receiving
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/complete', () => {
  it('should complete receiving and create inventory adjustments', async () => {
    const receiving = {
      id: RECEIVING_ID,
      status: 'in_progress',
      vendor_id: VENDOR_ID,
      purchase_order_id: null,
      receiving_number: 'RCV-20260328-0001',
    };

    const items = [{
      id: ITEM_ID,
      receiving_id: RECEIVING_ID,
      product_id: PRODUCT_ID,
      purchase_order_item_id: null,
      accepted_quantity: 5,
      add_to_inventory: true,
      inventory_added: false,
    }];

    const product = { id: PRODUCT_ID, quantity_in_stock: 10 };

    const completedReceiving = {
      ...receiving,
      status: 'completed',
      total_items: 1,
      total_quantity: 5,
      vendor_name: 'Test Vendor',
    };

    const completedItems = [{
      ...items[0],
      inventory_added: true,
    }];

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }) // fetch items
      .mockResolvedValueOnce({ rows: [product], rowCount: 1 }) // fetch product quantity_in_stock
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440900' }], rowCount: 1 }) // INSERT inventory_adjustment
      .mockResolvedValueOnce({ rows: [{ ...items[0], inventory_added: true }], rowCount: 1 }) // UPDATE receiving_item inventory_added
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
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 }); // fetch — completed

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });

  it('should return 400 when receiving is cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'cancelled' }], rowCount: 1 }); // fetch — cancelled

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_CANCELLED');
  });

  it('should return 400 when receiving has no items', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'in_progress', purchase_order_id: null }], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch items — empty

    const res = await request(app).post(`/api/v1/receiving/${RECEIVING_ID}/complete`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_NO_ITEMS');
  });

  it('should update PO status when purchase_order_id is set', async () => {
    const receiving = {
      id: RECEIVING_ID,
      status: 'in_progress',
      vendor_id: VENDOR_ID,
      purchase_order_id: PO_ID,
      receiving_number: 'RCV-20260328-0001',
    };

    const items = [{
      id: ITEM_ID,
      receiving_id: RECEIVING_ID,
      product_id: PRODUCT_ID,
      purchase_order_item_id: PO_ITEM_ID,
      accepted_quantity: 5,
      add_to_inventory: true,
      inventory_added: false,
    }];

    const product = { id: PRODUCT_ID, quantity_in_stock: 10 };

    const poItems = [{ id: PO_ITEM_ID, quantity_ordered: 10 }];
    const receivedSums = [{ purchase_order_item_id: PO_ITEM_ID, total_received: '5' }];

    const completedReceiving = {
      ...receiving,
      status: 'completed',
      vendor_name: 'Test Vendor',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: items, rowCount: 1 }) // fetch items
      .mockResolvedValueOnce({ rows: [product], rowCount: 1 }) // fetch product
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440900' }], rowCount: 1 }) // INSERT inventory_adjustment
      .mockResolvedValueOnce({ rows: [{ ...items[0], inventory_added: true }], rowCount: 1 }) // UPDATE receiving_item
      .mockResolvedValueOnce({ rows: [{ ...receiving, status: 'completed' }], rowCount: 1 }) // UPDATE receiving status
      .mockResolvedValueOnce({ rows: poItems, rowCount: 1 }) // fetch PO items
      .mockResolvedValueOnce({ rows: receivedSums, rowCount: 1 }) // sum received quantities
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
// POST /api/v1/receiving/:id/cancel — Cancel Receiving
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/cancel', () => {
  it('should cancel an in-progress receiving', async () => {
    const existing = {
      id: RECEIVING_ID,
      status: 'in_progress',
      internal_notes: 'Some notes',
      vendor_name: 'Test Vendor',
    };
    const cancelled = {
      ...existing,
      status: 'cancelled',
      internal_notes: '[CANCELLED: Duplicate shipment] Some notes',
    };

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
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'completed' }], rowCount: 1 }); // fetch — completed

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Changed mind' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_COMPLETED');
  });

  it('should return 400 when receiving is already cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: RECEIVING_ID, status: 'cancelled' }], rowCount: 1 }); // fetch — cancelled

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Changed mind' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIVING_ALREADY_CANCELLED');
  });

  it('should return 404 when receiving not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch — not found

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/cancel`)
      .send({ reason: 'Not needed' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/receiving/:id/items — Add Item
// ---------------------------------------------------------------------------
describe('POST /api/v1/receiving/:id/items', () => {
  it('should add an item to an in-progress receiving', async () => {
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };
    const createdItem = {
      id: ITEM_ID,
      receiving_id: RECEIVING_ID,
      product_id: PRODUCT_ID,
      sku: 'SKU-001',
      product_name: 'Widget',
      product_description: null,
      category_id: null,
      quantity_received: 5,
      unit_cost: '50.00',
      fair_market_value: null,
      condition: 'new',
      line_total: '250.00',
      accepted_quantity: 5,
      rejected_quantity: 0,
      rejection_reason: null,
      add_to_inventory: true,
      inventory_added: false,
      notes: null,
      purchase_order_item_id: null,
      created_at: '2026-03-28T00:00:00Z',
      updated_at: '2026-03-28T00:00:00Z',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving
      .mockResolvedValueOnce({ rows: [createdItem], rowCount: 1 }) // INSERT item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE receiving totals
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({
        product_id: PRODUCT_ID,
        product_name: 'Widget',
        sku: 'SKU-001',
        quantity_received: 5,
        unit_cost: 50,
        condition: 'new',
        accepted_quantity: 5,
        rejected_quantity: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product_name).toBe('Widget');
    expect(res.body.data.quantity_received).toBe(5);
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
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 404 when receiving not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch — not found

    const res = await request(app)
      .post(`/api/v1/receiving/${RECEIVING_ID}/items`)
      .send({ product_name: 'Widget', condition: 'new', quantity_received: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/receiving/items/:id — Update Item
// ---------------------------------------------------------------------------
describe('PUT /api/v1/receiving/items/:id', () => {
  it('should update an item', async () => {
    const existingItem = {
      id: ITEM_ID,
      receiving_id: RECEIVING_ID,
      product_name: 'Widget',
      quantity_received: 5,
      condition: 'new',
    };
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };
    const updatedItem = { ...existingItem, quantity_received: 10, condition: 'good' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existingItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving (check status)
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
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch — not found

    const res = await request(app)
      .put(`/api/v1/receiving/items/${ITEM_ID}`)
      .send({ quantity_received: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECEIVING_ITEM_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/receiving/items/:id — Delete Item
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/receiving/items/:id', () => {
  it('should delete an item', async () => {
    const existingItem = { id: ITEM_ID, receiving_id: RECEIVING_ID };
    const receiving = { id: RECEIVING_ID, status: 'in_progress' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existingItem], rowCount: 1 }) // fetch item
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 }) // fetch receiving (check status)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE receiving totals
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app).delete(`/api/v1/receiving/items/${ITEM_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 404 when item not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch — not found

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
TSEOF
```

Verify the test file exists and count tests:

```bash
grep -c "it('" backend/src/__tests__/integration/receiving.api.test.ts
# Expected: 25
```

- [ ] **Step 2.2** — Commit the test file

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving
git add backend/src/__tests__/integration/receiving.api.test.ts
git commit -m "test(receiving): add 25 integration tests for receiving API (red phase)

All tests will fail — routes, controller, and service do not exist yet.
Covers: create, list, get, update, complete, cancel, add/update/delete items."
```

---

## Task 3: Service Layer

Create `receiving.service.ts` with all 9 methods. Each method follows the established pattern: `pool` for reads, `pool.connect()` + transaction for writes, throws `AppError` for domain errors.

- [ ] **Step 3.1** — Create `backend/src/services/receiving.service.ts`

```bash
cat > backend/src/services/receiving.service.ts << 'TSEOF'
import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface CreateReceivingInput {
  vendor_id: string;
  receiving_type: string;
  purchase_order_id?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  packing_slip_number?: string;
  condition_notes?: string;
  discrepancy_notes?: string;
  internal_notes?: string;
  is_donation?: boolean;
  donation_date?: string;
  fair_market_value?: number;
}

export interface UpdateReceivingInput {
  shipping_carrier?: string;
  tracking_number?: string;
  packing_slip_number?: string;
  condition_notes?: string;
  discrepancy_notes?: string;
  internal_notes?: string;
  is_donation?: boolean;
  donation_receipt_sent?: boolean;
  donation_receipt_number?: string;
  donation_date?: string;
  fair_market_value?: number;
}

export interface AddItemInput {
  purchase_order_item_id?: string;
  product_id?: string;
  sku?: string;
  product_name: string;
  product_description?: string;
  category_id?: string;
  quantity_received: number;
  unit_cost?: number;
  fair_market_value?: number;
  condition: string;
  accepted_quantity?: number;
  rejected_quantity?: number;
  rejection_reason?: string;
  add_to_inventory?: boolean;
  notes?: string;
}

export interface UpdateItemInput {
  product_id?: string;
  sku?: string;
  product_name?: string;
  product_description?: string;
  category_id?: string;
  quantity_received?: number;
  unit_cost?: number;
  fair_market_value?: number;
  condition?: string;
  accepted_quantity?: number;
  rejected_quantity?: number;
  rejection_reason?: string;
  add_to_inventory?: boolean;
  notes?: string;
}

export interface ListReceivingQuery {
  status?: string;
  vendor_id?: string;
  receiving_type?: string;
  purchase_order_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function createReceiving(
  userId: string,
  data: CreateReceivingInput
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate vendor exists
    const vendorResult = await client.query(
      'SELECT id, business_name FROM vendors WHERE id = $1 AND is_active = true',
      [data.vendor_id]
    );
    if (vendorResult.rowCount === 0) {
      throw new AppError(400, 'VENDOR_NOT_FOUND', 'Vendor not found');
    }

    const result = await client.query(
      `INSERT INTO inventory_receiving
         (vendor_id, purchase_order_id, receiving_type, received_by,
          shipping_carrier, tracking_number, packing_slip_number,
          condition_notes, discrepancy_notes, internal_notes,
          is_donation, donation_date, fair_market_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.vendor_id,
        data.purchase_order_id ?? null,
        data.receiving_type,
        userId,
        data.shipping_carrier ?? null,
        data.tracking_number ?? null,
        data.packing_slip_number ?? null,
        data.condition_notes ?? null,
        data.discrepancy_notes ?? null,
        data.internal_notes ?? null,
        data.is_donation ?? false,
        data.donation_date ?? null,
        data.fair_market_value ?? null,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listReceivings(query: ListReceivingQuery): Promise<any> {
  const {
    status,
    vendor_id,
    receiving_type,
    purchase_order_id,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = query;

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (status) { conditions.push(`ir.status = $${i++}`); params.push(status); }
  if (vendor_id) { conditions.push(`ir.vendor_id = $${i++}`); params.push(vendor_id); }
  if (receiving_type) { conditions.push(`ir.receiving_type = $${i++}`); params.push(receiving_type); }
  if (purchase_order_id) { conditions.push(`ir.purchase_order_id = $${i++}`); params.push(purchase_order_id); }
  if (start_date) { conditions.push(`ir.received_date >= $${i++}`); params.push(start_date); }
  if (end_date) { conditions.push(`ir.received_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM inventory_receiving ir ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT ir.*, v.business_name AS vendor_name
     FROM inventory_receiving ir
     JOIN vendors v ON v.id = ir.vendor_id
     ${where}
     ORDER BY ir.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  return {
    receivings: dataResult.rows,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getReceiving(id: string): Promise<any> {
  const receivingResult = await pool.query(
    `SELECT ir.*, v.business_name AS vendor_name
     FROM inventory_receiving ir
     JOIN vendors v ON v.id = ir.vendor_id
     WHERE ir.id = $1`,
    [id]
  );

  if (receivingResult.rowCount === 0) {
    throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
  }

  const itemsResult = await pool.query(
    `SELECT * FROM receiving_items WHERE receiving_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  return {
    ...receivingResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function updateReceiving(
  id: string,
  data: UpdateReceivingInput
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const existing = fetchResult.rows[0];
    if (existing.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (existing.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.shipping_carrier !== undefined) { setClauses.push(`shipping_carrier = $${i++}`); params.push(data.shipping_carrier); }
    if (data.tracking_number !== undefined) { setClauses.push(`tracking_number = $${i++}`); params.push(data.tracking_number); }
    if (data.packing_slip_number !== undefined) { setClauses.push(`packing_slip_number = $${i++}`); params.push(data.packing_slip_number); }
    if (data.condition_notes !== undefined) { setClauses.push(`condition_notes = $${i++}`); params.push(data.condition_notes); }
    if (data.discrepancy_notes !== undefined) { setClauses.push(`discrepancy_notes = $${i++}`); params.push(data.discrepancy_notes); }
    if (data.internal_notes !== undefined) { setClauses.push(`internal_notes = $${i++}`); params.push(data.internal_notes); }
    if (data.is_donation !== undefined) { setClauses.push(`is_donation = $${i++}`); params.push(data.is_donation); }
    if (data.donation_receipt_sent !== undefined) { setClauses.push(`donation_receipt_sent = $${i++}`); params.push(data.donation_receipt_sent); }
    if (data.donation_receipt_number !== undefined) { setClauses.push(`donation_receipt_number = $${i++}`); params.push(data.donation_receipt_number); }
    if (data.donation_date !== undefined) { setClauses.push(`donation_date = $${i++}`); params.push(data.donation_date); }
    if (data.fair_market_value !== undefined) { setClauses.push(`fair_market_value = $${i++}`); params.push(data.fair_market_value); }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await client.query(
      `UPDATE inventory_receiving SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function completeReceiving(id: string, userId: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check status
    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = fetchResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    // 2. Check items exist
    const itemsResult = await client.query(
      'SELECT * FROM receiving_items WHERE receiving_id = $1',
      [id]
    );
    if (itemsResult.rowCount === 0) {
      throw new AppError(400, 'RECEIVING_NO_ITEMS', 'Receiving has no items');
    }
    const items = itemsResult.rows;

    // 3. Create inventory adjustments for eligible items
    for (const item of items) {
      if (item.add_to_inventory && item.product_id && (item.accepted_quantity || 0) > 0) {
        // Fetch current stock
        const productResult = await client.query(
          'SELECT quantity_in_stock FROM products WHERE id = $1',
          [item.product_id]
        );
        const oldQuantity = productResult.rows[0]?.quantity_in_stock ?? 0;
        const quantityChange = item.accepted_quantity;
        const newQuantity = oldQuantity + quantityChange;

        // INSERT into inventory_adjustments — trigger auto-updates products.quantity_in_stock
        // Do NOT include adjustment_number — trigger auto-generates it
        await client.query(
          `INSERT INTO inventory_adjustments
             (product_id, adjustment_type, quantity_change, old_quantity, new_quantity, reason, notes, adjusted_by)
           VALUES ($1, 'receiving', $2, $3, $4, $5, $6, $7)`,
          [
            item.product_id,
            quantityChange,
            oldQuantity,
            newQuantity,
            `Received via ${receiving.receiving_number}`,
            item.notes ?? null,
            userId,
          ]
        );

        // Mark item as inventory_added
        await client.query(
          'UPDATE receiving_items SET inventory_added = true, updated_at = NOW() WHERE id = $1',
          [item.id]
        );
      }
    }

    // 4. Update receiving status
    await client.query(
      `UPDATE inventory_receiving SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // 5. Update PO status if linked
    if (receiving.purchase_order_id) {
      const poItemsResult = await client.query(
        'SELECT id, quantity_ordered FROM purchase_order_items WHERE purchase_order_id = $1',
        [receiving.purchase_order_id]
      );

      const receivedSumsResult = await client.query(
        `SELECT ri.purchase_order_item_id, SUM(ri.accepted_quantity) AS total_received
         FROM receiving_items ri
         JOIN inventory_receiving ir ON ir.id = ri.receiving_id
         WHERE ir.purchase_order_id = $1
           AND ir.status = 'completed'
           AND ri.purchase_order_item_id IS NOT NULL
         GROUP BY ri.purchase_order_item_id`,
        [receiving.purchase_order_id]
      );

      const receivedMap: Record<string, number> = {};
      for (const row of receivedSumsResult.rows) {
        receivedMap[row.purchase_order_item_id] = parseInt(row.total_received, 10);
      }

      let allFullyReceived = true;
      for (const poItem of poItemsResult.rows) {
        const received = receivedMap[poItem.id] || 0;
        if (received < poItem.quantity_ordered) {
          allFullyReceived = false;
          break;
        }
      }

      const newPoStatus = allFullyReceived ? 'received' : 'partially_received';
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [newPoStatus, receiving.purchase_order_id]
      );
    }

    // 6. Return updated receiving with items
    const updatedReceiving = await client.query(
      `SELECT ir.*, v.business_name AS vendor_name
       FROM inventory_receiving ir
       JOIN vendors v ON v.id = ir.vendor_id
       WHERE ir.id = $1`,
      [id]
    );

    const updatedItems = await client.query(
      'SELECT * FROM receiving_items WHERE receiving_id = $1 ORDER BY created_at ASC',
      [id]
    );

    await client.query('COMMIT');
    return {
      ...updatedReceiving.rows[0],
      items: updatedItems.rows,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelReceiving(id: string, reason: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = fetchResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const cancelledNotes = `[CANCELLED: ${reason}] ${receiving.internal_notes || ''}`.trim();

    const result = await client.query(
      `UPDATE inventory_receiving
       SET status = 'cancelled', internal_notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [cancelledNotes, id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addItem(receivingId: string, data: AddItemInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check receiving exists and is in_progress
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [receivingId]
    );
    if (receivingResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const lineTotal = (data.unit_cost ?? 0) * data.quantity_received;
    const acceptedQty = data.accepted_quantity ?? data.quantity_received;
    const rejectedQty = data.rejected_quantity ?? 0;

    const itemResult = await client.query(
      `INSERT INTO receiving_items
         (receiving_id, purchase_order_item_id, product_id, sku, product_name,
          product_description, category_id, quantity_received, unit_cost,
          fair_market_value, condition, line_total, accepted_quantity,
          rejected_quantity, rejection_reason, add_to_inventory, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        receivingId,
        data.purchase_order_item_id ?? null,
        data.product_id ?? null,
        data.sku ?? null,
        data.product_name,
        data.product_description ?? null,
        data.category_id ?? null,
        data.quantity_received,
        data.unit_cost ?? 0,
        data.fair_market_value ?? null,
        data.condition,
        lineTotal,
        acceptedQty,
        rejectedQty,
        data.rejection_reason ?? null,
        data.add_to_inventory ?? true,
        data.notes ?? null,
      ]
    );

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [receivingId]
    );

    await client.query('COMMIT');
    return itemResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateItem(itemId: string, data: UpdateItemInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch item
    const itemResult = await client.query(
      'SELECT * FROM receiving_items WHERE id = $1',
      [itemId]
    );
    if (itemResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_ITEM_NOT_FOUND', 'Receiving item not found');
    }
    const item = itemResult.rows[0];

    // Check receiving status
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [item.receiving_id]
    );
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.product_id !== undefined) { setClauses.push(`product_id = $${i++}`); params.push(data.product_id); }
    if (data.sku !== undefined) { setClauses.push(`sku = $${i++}`); params.push(data.sku); }
    if (data.product_name !== undefined) { setClauses.push(`product_name = $${i++}`); params.push(data.product_name); }
    if (data.product_description !== undefined) { setClauses.push(`product_description = $${i++}`); params.push(data.product_description); }
    if (data.category_id !== undefined) { setClauses.push(`category_id = $${i++}`); params.push(data.category_id); }
    if (data.quantity_received !== undefined) { setClauses.push(`quantity_received = $${i++}`); params.push(data.quantity_received); }
    if (data.unit_cost !== undefined) { setClauses.push(`unit_cost = $${i++}`); params.push(data.unit_cost); }
    if (data.fair_market_value !== undefined) { setClauses.push(`fair_market_value = $${i++}`); params.push(data.fair_market_value); }
    if (data.condition !== undefined) { setClauses.push(`condition = $${i++}`); params.push(data.condition); }
    if (data.accepted_quantity !== undefined) { setClauses.push(`accepted_quantity = $${i++}`); params.push(data.accepted_quantity); }
    if (data.rejected_quantity !== undefined) { setClauses.push(`rejected_quantity = $${i++}`); params.push(data.rejected_quantity); }
    if (data.rejection_reason !== undefined) { setClauses.push(`rejection_reason = $${i++}`); params.push(data.rejection_reason); }
    if (data.add_to_inventory !== undefined) { setClauses.push(`add_to_inventory = $${i++}`); params.push(data.add_to_inventory); }
    if (data.notes !== undefined) { setClauses.push(`notes = $${i++}`); params.push(data.notes); }

    // Recalculate line_total if unit_cost or quantity_received changed
    const newQty = data.quantity_received ?? item.quantity_received;
    const newCost = data.unit_cost ?? parseFloat(item.unit_cost);
    setClauses.push(`line_total = $${i++}`);
    params.push(newQty * newCost);

    setClauses.push('updated_at = NOW()');
    params.push(itemId);

    const result = await client.query(
      `UPDATE receiving_items SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [item.receiving_id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch item
    const itemResult = await client.query(
      'SELECT * FROM receiving_items WHERE id = $1',
      [itemId]
    );
    if (itemResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_ITEM_NOT_FOUND', 'Receiving item not found');
    }
    const item = itemResult.rows[0];

    // Check receiving status
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [item.receiving_id]
    );
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    await client.query('DELETE FROM receiving_items WHERE id = $1', [itemId]);

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [item.receiving_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
TSEOF
```

- [ ] **Step 3.2** — Commit the service

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving
git add backend/src/services/receiving.service.ts
git commit -m "feat(receiving): add receiving service with 9 methods

Implements: createReceiving, listReceivings, getReceiving, updateReceiving,
completeReceiving, cancelReceiving, addItem, updateItem, deleteItem.
Complete action creates inventory_adjustments via trigger pattern."
```

---

## Task 4: Controller + Routes + Registration

Create the controller with Zod validation, the route file with permission middleware, and register in `routes/index.ts`.

- [ ] **Step 4.1** — Create `backend/src/controllers/receiving.controller.ts`

```bash
cat > backend/src/controllers/receiving.controller.ts << 'TSEOF'
import { Request, Response } from 'express';
import { z } from 'zod';
import * as receivingService from '../services/receiving.service';

const CreateReceivingSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  receiving_type: z.enum(['purchase', 'donation', 'consignment', 'transfer', 'adjustment']),
  purchase_order_id: z.string().uuid('Invalid PO ID').optional(),
  shipping_carrier: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  packing_slip_number: z.string().max(100).optional(),
  condition_notes: z.string().max(2000).optional(),
  discrepancy_notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  is_donation: z.boolean().optional(),
  donation_date: z.string().optional(),
  fair_market_value: z.number().nonnegative().optional(),
});

const UpdateReceivingSchema = z.object({
  shipping_carrier: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  packing_slip_number: z.string().max(100).optional(),
  condition_notes: z.string().max(2000).optional(),
  discrepancy_notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  is_donation: z.boolean().optional(),
  donation_receipt_sent: z.boolean().optional(),
  donation_receipt_number: z.string().max(50).optional(),
  donation_date: z.string().optional(),
  fair_market_value: z.number().nonnegative().optional(),
});

const AddItemSchema = z.object({
  purchase_order_item_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  product_name: z.string().min(1, 'Product name is required').max(255),
  product_description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  quantity_received: z.number().int().positive('Quantity must be positive'),
  unit_cost: z.number().nonnegative().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']),
  accepted_quantity: z.number().int().nonnegative().optional(),
  rejected_quantity: z.number().int().nonnegative().optional(),
  rejection_reason: z.string().max(500).optional(),
  add_to_inventory: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const UpdateItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  product_name: z.string().max(255).optional(),
  product_description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  quantity_received: z.number().int().positive().optional(),
  unit_cost: z.number().nonnegative().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']).optional(),
  accepted_quantity: z.number().int().nonnegative().optional(),
  rejected_quantity: z.number().int().nonnegative().optional(),
  rejection_reason: z.string().max(500).optional(),
  add_to_inventory: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const CancelReceivingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export async function createReceiving(req: Request, res: Response): Promise<void> {
  const parsed = CreateReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.createReceiving(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: receiving });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function listReceivings(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      status: req.query.status as string | undefined,
      vendor_id: req.query.vendor_id as string | undefined,
      receiving_type: req.query.receiving_type as string | undefined,
      purchase_order_id: req.query.purchase_order_id as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await receivingService.listReceivings(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function getReceiving(req: Request, res: Response): Promise<void> {
  try {
    const receiving = await receivingService.getReceiving(req.params.id);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function updateReceiving(req: Request, res: Response): Promise<void> {
  const parsed = UpdateReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.updateReceiving(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function completeReceiving(req: Request, res: Response): Promise<void> {
  try {
    const receiving = await receivingService.completeReceiving(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function cancelReceiving(req: Request, res: Response): Promise<void> {
  const parsed = CancelReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.cancelReceiving(req.params.id, parsed.data.reason);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const item = await receivingService.addItem(req.params.id, parsed.data);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const parsed = UpdateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const item = await receivingService.updateItem(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: item });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    await receivingService.deleteItem(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Item deleted' } });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' },
    });
  }
}
TSEOF
```

- [ ] **Step 4.2** — Create `backend/src/routes/receiving.routes.ts`

```bash
cat > backend/src/routes/receiving.routes.ts << 'TSEOF'
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as receivingController from '../controllers/receiving.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('receiving', 'read'), receivingController.listReceivings);
router.post('/', requirePermission('receiving', 'create'), receivingController.createReceiving);
router.get('/:id', requirePermission('receiving', 'read'), receivingController.getReceiving);
router.put('/:id', requirePermission('receiving', 'update'), receivingController.updateReceiving);
router.post('/:id/complete', requirePermission('receiving', 'complete'), receivingController.completeReceiving);
router.post('/:id/cancel', requirePermission('receiving', 'cancel'), receivingController.cancelReceiving);
router.post('/:id/items', requirePermission('receiving', 'create'), receivingController.addItem);

// Item-level routes (use /items/:id prefix for item mutations)
router.put('/items/:id', requirePermission('receiving', 'update'), receivingController.updateItem);
router.delete('/items/:id', requirePermission('receiving', 'update'), receivingController.deleteItem);

export default router;
TSEOF
```

- [ ] **Step 4.3** — Register in `backend/src/routes/index.ts`

Add two lines to `backend/src/routes/index.ts`:

**Import** (add after the `vendorPaymentsRoutes` import):
```typescript
import receivingRoutes from './receiving.routes';
```

**Route** (add after the `vendor-payments` route):
```typescript
router.use('/receiving', receivingRoutes);
```

The file should look like:

```typescript
import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';
import customerRoutes from './customer.routes';
import inventoryRoutes from './inventory.routes';
import vendorRoutes from './vendor.routes';
import purchaseOrderRoutes from './purchaseOrder.routes';
import employeeRoutes from './employee.routes';
import roleRoutes from './role.routes';
import giftCardRoutes from './gift-card.routes';
import reconciliationRoutes from './reconciliation.routes';
import paymentsRoutes from './payments.routes';
import accountsPayableRoutes from './accounts_payable.routes';
import vendorPaymentsRoutes from './vendor_payments.routes';
import receivingRoutes from './receiving.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/vendors', vendorRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/employees', employeeRoutes);
router.use('/roles', roleRoutes);
router.use('/gift-cards', giftCardRoutes);
router.use('/reconciliation', reconciliationRoutes);
router.use('/payments', paymentsRoutes);
router.use('/accounts-payable', accountsPayableRoutes);
router.use('/vendor-payments', vendorPaymentsRoutes);
router.use('/receiving', receivingRoutes);

export default router;
```

- [ ] **Step 4.4** — Run tests to verify all pass

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving/backend
npx jest --testPathPattern="receiving.api.test" --verbose 2>&1 | tail -40
# Expected: 25 tests, all passing
```

- [ ] **Step 4.5** — Commit controller, routes, and index registration

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving
git add backend/src/controllers/receiving.controller.ts \
        backend/src/routes/receiving.routes.ts \
        backend/src/routes/index.ts
git commit -m "feat(receiving): add controller, routes, and register under /api/v1/receiving

- receiving.controller.ts: Zod validation for all request bodies
- receiving.routes.ts: 9 endpoints with permission middleware
- routes/index.ts: register /receiving route
All 25 integration tests pass."
```

---

## Task 5: Seed Receiving Permissions

Add 5 receiving permissions to the ROLE_PERMISSIONS matrix in `backend/src/database/seed.ts`.

- [ ] **Step 5.1** — Modify `backend/src/database/seed.ts`

Add receiving permissions to the `ROLE_PERMISSIONS` object:

In the **manager** array, after the `vendor_payments` permissions, add:
```typescript
    'receiving:create', 'receiving:read', 'receiving:update', 'receiving:complete', 'receiving:cancel',
```

The updated `ROLE_PERMISSIONS` should look like:

```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  cashier: [
    'products:read',
    'categories:read',
    'transactions:create', 'transactions:read',
    'customers:create', 'customers:read',
    'payments:create', 'payments:read',
    'gift_cards:create', 'gift_cards:read',
  ],
  manager: [
    'transactions:update',
    'customers:update', 'customers:delete',
    'payments:update',
    'gift_cards:update', 'gift_cards:delete',
    'inventory:adjust', 'inventory:read', 'inventory:reports',
    'vendors:read',
    'purchase_orders:create', 'purchase_orders:read',
    'purchase_orders:update', 'purchase_orders:receive', 'purchase_orders:cancel',
    'employees:read',
    'roles:read',
    'permissions:read',
    'accounts_payable:create', 'accounts_payable:read', 'accounts_payable:update',
    'vendor_payments:create', 'vendor_payments:read', 'vendor_payments:update',
    'receiving:create', 'receiving:read', 'receiving:update', 'receiving:complete', 'receiving:cancel',
  ],
  admin: [
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'vendors:create', 'vendors:update', 'vendors:delete',
    'employees:create', 'employees:update', 'employees:delete',
    'purchase_orders:approve', 'purchase_orders:delete',
    'roles:create', 'roles:update',
    'vendor_payments:approve',
  ],
};
```

This means:
- **Cashier**: No receiving permissions
- **Manager**: All 5 receiving permissions (create, read, update, complete, cancel)
- **Admin**: Inherits manager's receiving permissions (via cumulative assignment)

- [ ] **Step 5.2** — Verify the permission seed test still compiles

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving/backend
npx tsc --noEmit 2>&1 | head -20
# Expected: no errors
```

- [ ] **Step 5.3** — Commit seed changes

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-inventory-receiving
git add backend/src/database/seed.ts
git commit -m "feat(receiving): seed 5 receiving permissions for manager role

Adds receiving:create, receiving:read, receiving:update, receiving:complete,
receiving:cancel to the manager tier. Admin inherits via cumulative assignment."
```
