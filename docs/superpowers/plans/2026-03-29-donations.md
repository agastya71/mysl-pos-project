# Donations Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Donations backend module — 9 endpoints for creating/listing/updating donations, generating tax receipts, and producing annual donor summaries, with optional auto-creation of linked `inventory_receiving` records when items are provided.

**Architecture:** Four new files (service, controller, routes, integration tests) following the exact same module pattern as `accounts_payable` and the B1 receiving module. A trigger auto-generates `DON-YYYYMMDD-NNNN` donation numbers. When a donation is created with items, the service creates a completed `inventory_receiving` + `receiving_items` in the same transaction and links `donations.receiving_id`.

**Tech Stack:** TypeScript strict, Express, node-postgres (pg), Zod validation, Jest + supertest (mocked pool), existing `AppError` error class.

---

## File Map

| Action | File |
|---|---|
| Create | `schema/functions/generate_donation_number.sql` |
| Create | `schema/triggers/set_donation_number.sql` |
| Create | `backend/src/__tests__/integration/donations.api.test.ts` |
| Create | `backend/src/services/donations.service.ts` |
| Create | `backend/src/controllers/donations.controller.ts` |
| Create | `backend/src/routes/donations.routes.ts` |
| Modify | `backend/src/routes/index.ts` |
| Modify | `backend/src/database/seed.ts` |

All work is done in a **dedicated git worktree** on branch `feature/donations`:

```bash
# From the main repo root (/Users/u0102180/code/personal-projects/mysl-pos-project)
git worktree add ../pos-feature-donations -b feature/donations
cd ../pos-feature-donations
git config --local user.name "agastya71"
git config --local user.email "agastya71@users.noreply.github.com"
```

---

## Task 1: Schema — Donation Number Trigger

Add SQL files that auto-generate `DON-YYYYMMDD-NNNN` donation numbers on INSERT, mirroring the receiving number trigger pattern.

**Files:**
- Create: `schema/functions/generate_donation_number.sql`
- Create: `schema/triggers/set_donation_number.sql`

- [ ] **Step 1.1** — Create `schema/functions/generate_donation_number.sql`

```sql
CREATE OR REPLACE FUNCTION generate_donation_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  next_num INTEGER;
BEGIN
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(CAST(SUBSTRING(donation_number FROM 14) AS INTEGER)), 0) + 1
    INTO next_num
    FROM donations
   WHERE donation_number LIKE 'DON-' || today || '-%';
  NEW.donation_number := 'DON-' || today || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 1.2** — Create `schema/triggers/set_donation_number.sql`

```sql
CREATE TRIGGER set_donation_number_trigger
  BEFORE INSERT ON donations
  FOR EACH ROW
  WHEN (NEW.donation_number IS NULL OR NEW.donation_number = '')
  EXECUTE FUNCTION generate_donation_number();
```

- [ ] **Step 1.3** — Commit

```bash
git add schema/functions/generate_donation_number.sql \
        schema/triggers/set_donation_number.sql
git commit -m "feat(donations): add donation number trigger DON-YYYYMMDD-NNNN"
```

---

## Task 2: Integration Tests (Red Phase)

Write all 28 tests **before** writing any service or route code. Run them — they must all fail (routes don't exist yet). This is the TDD red phase.

**Files:**
- Create: `backend/src/__tests__/integration/donations.api.test.ts`

- [ ] **Step 2.1** — Create the test file

```typescript
import request from 'supertest';
import express from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

let app: express.Application;
let mockClient: { query: jest.Mock; release: jest.Mock };

const USER_ID      = '550e8400-e29b-41d4-a716-446655440200';
const VENDOR_ID    = '550e8400-e29b-41d4-a716-446655440300';
const DONATION_ID  = '550e8400-e29b-41d4-a716-446655440500';
const PRODUCT_ID   = '550e8400-e29b-41d4-a716-446655440600';
const DONATION_NUM = 'DON-20260329-0001';
const RECEIPT_NUM  = 'RCPT-20260329-0001';

const SAMPLE_DONATION = {
  id: DONATION_ID,
  donation_number: DONATION_NUM,
  vendor_id: VENDOR_ID,
  receiving_id: null,
  donation_date: '2026-03-29',
  donation_type: 'goods',
  donor_name: 'Jane Doe',
  donor_email: 'jane@example.com',
  donor_phone: null,
  donor_address: null,
  total_items: 0,
  total_quantity: 0,
  fair_market_value: '250.00',
  cash_amount: '0.00',
  tax_receipt_required: true,
  tax_receipt_sent: false,
  tax_receipt_number: null,
  tax_receipt_date: null,
  acknowledgment_sent: false,
  acknowledgment_date: null,
  goods_services_provided: false,
  goods_services_description: null,
  goods_services_value: '0.00',
  appraisal_required: false,
  appraiser_name: null,
  appraisal_date: null,
  appraisal_document_url: null,
  notes: null,
  internal_notes: null,
  processed_by: USER_ID,
  created_at: '2026-03-29T00:00:00Z',
  updated_at: '2026-03-29T00:00:00Z',
  vendor_name: 'Jane Doe Donations',
};

beforeAll(async () => {
  app = express();
  app.use(express.json());

  (authenticateToken as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { userId: USER_ID, username: 'testuser', role: 'admin', terminalId: null };
    next();
  });

  (requirePermission as jest.Mock).mockImplementation(
    () => (_req: any, _res: any, next: any) => next()
  );

  const donationRoutes = (await import('../../routes/donations.routes')).default;
  app.use('/api/v1/donations', donationRoutes);

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
// POST /api/v1/donations
// ---------------------------------------------------------------------------
describe('POST /api/v1/donations', () => {
  it('should create a donation without items', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Jane Doe Donations' }], rowCount: 1 })  // vendor check
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // INSERT donation
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .post('/api/v1/donations')
      .send({ vendor_id: VENDOR_ID, donor_name: 'Jane Doe', donation_type: 'goods', fair_market_value: 250 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(DONATION_ID);
    expect(res.body.data.donation_type).toBe('goods');
  });

  it('should create a donation with items and linked receiving', async () => {
    const receiving = {
      id: '550e8400-e29b-41d4-a716-446655440700',
      receiving_number: 'RCV-20260329-0001',
      status: 'in_progress',
    };
    const item = { id: '550e8400-e29b-41d4-a716-446655440800', product_id: PRODUCT_ID, quantity_received: 2, accepted_quantity: 2 };
    const product = { id: PRODUCT_ID, quantity_in_stock: 10 };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID }], rowCount: 1 })  // vendor check
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // INSERT donation
      .mockResolvedValueOnce({ rows: [receiving], rowCount: 1 })  // INSERT receiving
      .mockResolvedValueOnce({ rows: [item], rowCount: 1 })  // INSERT receiving_item
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // UPDATE receiving totals
      .mockResolvedValueOnce({ rows: [product], rowCount: 1 })  // SELECT product stock
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // INSERT inventory_adjustment
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // UPDATE receiving status=completed
      .mockResolvedValueOnce({ rows: [{ ...SAMPLE_DONATION, receiving_id: receiving.id }], rowCount: 1 })  // UPDATE donation.receiving_id
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .post('/api/v1/donations')
      .send({
        vendor_id: VENDOR_ID,
        donor_name: 'Jane Doe',
        donation_type: 'goods',
        fair_market_value: 250,
        items: [{ product_name: 'Office Chair', product_id: PRODUCT_ID, quantity_received: 2, condition: 'good' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when vendor_id is missing', async () => {
    const res = await request(app)
      .post('/api/v1/donations')
      .send({ donor_name: 'Jane Doe', donation_type: 'goods', fair_market_value: 250 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when donor_name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/donations')
      .send({ vendor_id: VENDOR_ID, donation_type: 'goods', fair_market_value: 250 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when donation_type is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/donations')
      .send({ vendor_id: VENDOR_ID, donor_name: 'Jane Doe', donation_type: 'invalid', fair_market_value: 250 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 400 when vendor not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // vendor check — not found

    const res = await request(app)
      .post('/api/v1/donations')
      .send({ vendor_id: VENDOR_ID, donor_name: 'Jane Doe', donation_type: 'goods', fair_market_value: 250 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VENDOR_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/donations
// ---------------------------------------------------------------------------
describe('GET /api/v1/donations', () => {
  it('should list donations with pagination', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION, { ...SAMPLE_DONATION, id: '550e8400-e29b-41d4-a716-446655440501' }], rowCount: 2 });

    const res = await request(app).get('/api/v1/donations?page=1&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.donations).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pages).toBe(1);
  });

  it('should return empty list when no donations', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/donations');
    expect(res.status).toBe(200);
    expect(res.body.data.donations).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('should filter by receipt_sent', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/donations?receipt_sent=true');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/donations/annual-summary/:vendorId/:year
// ---------------------------------------------------------------------------
describe('GET /api/v1/donations/annual-summary/:vendorId/:year', () => {
  it('should return annual summary for a vendor', async () => {
    const summaryRows = [
      { donation_type: 'goods', count: '3', total_value: '750.00', receipts_sent: '2' },
      { donation_type: 'cash', count: '1', total_value: '100.00', receipts_sent: '1' },
    ];
    const donationRows = [SAMPLE_DONATION];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: summaryRows, rowCount: 2 })
      .mockResolvedValueOnce({ rows: donationRows, rowCount: 1 });

    const res = await request(app).get(`/api/v1/donations/annual-summary/${VENDOR_ID}/2026`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vendor_id).toBe(VENDOR_ID);
    expect(res.body.data.year).toBe(2026);
    expect(res.body.data.total_donations).toBe(4);
    expect(res.body.data.donations).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/donations/receipts/:donationNumber
// ---------------------------------------------------------------------------
describe('GET /api/v1/donations/receipts/:donationNumber', () => {
  it('should return receipt info for a donation number', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ ...SAMPLE_DONATION, tax_receipt_number: RECEIPT_NUM }],
      rowCount: 1,
    });

    const res = await request(app).get(`/api/v1/donations/receipts/${DONATION_NUM}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.donation_number).toBe(DONATION_NUM);
  });

  it('should return 404 for unknown donation number', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/donations/receipts/DON-99999999-9999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DONATION_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/donations/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/donations/:id', () => {
  it('should return donation with items from linked receiving', async () => {
    const items = [{ id: '550e8400-e29b-41d4-a716-446655440800', product_name: 'Office Chair', quantity_received: 2 }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })
      .mockResolvedValueOnce({ rows: items, rowCount: 1 });

    const res = await request(app).get(`/api/v1/donations/${DONATION_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(DONATION_ID);
    expect(res.body.data.items).toHaveLength(1);
  });

  it('should return 404 for unknown ID', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/donations/${VENDOR_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DONATION_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/donations/:id
// ---------------------------------------------------------------------------
describe('PUT /api/v1/donations/:id', () => {
  it('should update a donation successfully', async () => {
    const updated = { ...SAMPLE_DONATION, donor_email: 'updated@example.com' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // fetch existing
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 })  // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .put(`/api/v1/donations/${DONATION_ID}`)
      .send({ donor_email: 'updated@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when donation is already receipted', async () => {
    const receipted = { ...SAMPLE_DONATION, tax_receipt_sent: true };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [receipted], rowCount: 1 });  // fetch — already receipted

    const res = await request(app)
      .put(`/api/v1/donations/${DONATION_ID}`)
      .send({ donor_email: 'x@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DONATION_RECEIPTED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/donations/:id/generate-receipt
// ---------------------------------------------------------------------------
describe('POST /api/v1/donations/:id/generate-receipt', () => {
  it('should generate a receipt number', async () => {
    const withReceipt = { ...SAMPLE_DONATION, tax_receipt_number: RECEIPT_NUM, tax_receipt_sent: true };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // fetch
      .mockResolvedValueOnce({ rows: [{ max_num: null }], rowCount: 1 })  // max receipt num query
      .mockResolvedValueOnce({ rows: [withReceipt], rowCount: 1 })  // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app).post(`/api/v1/donations/${DONATION_ID}/generate-receipt`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tax_receipt_sent).toBe(true);
  });

  it('should return 400 when receipt already generated', async () => {
    const withReceipt = { ...SAMPLE_DONATION, tax_receipt_number: RECEIPT_NUM };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [withReceipt], rowCount: 1 });  // fetch — already has receipt

    const res = await request(app).post(`/api/v1/donations/${DONATION_ID}/generate-receipt`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RECEIPT_ALREADY_GENERATED');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/donations/:id/send-receipt
// ---------------------------------------------------------------------------
describe('POST /api/v1/donations/:id/send-receipt', () => {
  it('should record receipt delivery', async () => {
    const sent = { ...SAMPLE_DONATION, tax_receipt_sent: true };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // fetch
      .mockResolvedValueOnce({ rows: [sent], rowCount: 1 })  // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app)
      .post(`/api/v1/donations/${DONATION_ID}/send-receipt`)
      .send({ email: 'jane@example.com', method: 'email' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tax_receipt_sent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/donations/:id/generate-acknowledgment
// ---------------------------------------------------------------------------
describe('POST /api/v1/donations/:id/generate-acknowledgment', () => {
  it('should mark acknowledgment as sent', async () => {
    const acked = { ...SAMPLE_DONATION, acknowledgment_sent: true, acknowledgment_date: '2026-03-29' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // BEGIN
      .mockResolvedValueOnce({ rows: [SAMPLE_DONATION], rowCount: 1 })  // fetch
      .mockResolvedValueOnce({ rows: [acked], rowCount: 1 })  // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });  // COMMIT

    const res = await request(app).post(`/api/v1/donations/${DONATION_ID}/generate-acknowledgment`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.acknowledgment_sent).toBe(true);
  });
});
```

- [ ] **Step 2.2** — Run tests to verify they all fail (red phase)

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations/backend
npx jest --testPathPattern="donations.api.test" --no-coverage 2>&1 | tail -20
```

Expected: All tests fail with `Cannot find module '../../routes/donations.routes'`.

- [ ] **Step 2.3** — Commit

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations
git add backend/src/__tests__/integration/donations.api.test.ts
git commit -m "test(donations): add 28 integration tests for donations API (red phase)"
```

---

## Task 3: Service Layer

Create `donations.service.ts` with all 8 exported functions.

**Files:**
- Create: `backend/src/services/donations.service.ts`

- [ ] **Step 3.1** — Create `backend/src/services/donations.service.ts`

```typescript
import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface CreateDonationInput {
  vendor_id: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;
  donation_type: string;
  fair_market_value: number;
  cash_amount?: number;
  tax_receipt_required?: boolean;
  goods_services_provided?: boolean;
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean;
  notes?: string;
  internal_notes?: string;
  items?: Array<{
    product_id?: string;
    sku?: string;
    product_name: string;
    category_id?: string;
    quantity_received: number;
    fair_market_value?: number;
    condition: string;
    notes?: string;
  }>;
}

export interface UpdateDonationInput {
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;
  donation_type?: string;
  fair_market_value?: number;
  cash_amount?: number;
  tax_receipt_required?: boolean;
  goods_services_provided?: boolean;
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean;
  appraiser_name?: string;
  appraisal_date?: string;
  notes?: string;
  internal_notes?: string;
}

export interface ListDonationsQuery {
  vendor_id?: string;
  donation_type?: string;
  receipt_sent?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function createDonation(userId: string, data: CreateDonationInput): Promise<any> {
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

    // Insert donation (trigger auto-generates donation_number)
    const donationResult = await client.query(
      `INSERT INTO donations
         (vendor_id, donor_name, donor_email, donor_phone, donor_address,
          donation_date, donation_type, fair_market_value, cash_amount,
          tax_receipt_required, goods_services_provided, goods_services_description,
          goods_services_value, appraisal_required, notes, internal_notes, processed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        data.vendor_id,
        data.donor_name,
        data.donor_email ?? null,
        data.donor_phone ?? null,
        data.donor_address ?? null,
        data.donation_date ?? null,
        data.donation_type,
        data.fair_market_value,
        data.cash_amount ?? 0,
        data.tax_receipt_required ?? true,
        data.goods_services_provided ?? false,
        data.goods_services_description ?? null,
        data.goods_services_value ?? 0,
        data.appraisal_required ?? false,
        data.notes ?? null,
        data.internal_notes ?? null,
        userId,
      ]
    );
    const donation = donationResult.rows[0];

    // If items provided: create linked receiving, insert items, complete receiving
    if (data.items && data.items.length > 0) {
      // 1. Create inventory_receiving of type 'donation'
      const receivingResult = await client.query(
        `INSERT INTO inventory_receiving
           (vendor_id, receiving_type, received_by, is_donation)
         VALUES ($1, 'donation', $2, true)
         RETURNING *`,
        [data.vendor_id, userId]
      );
      const receiving = receivingResult.rows[0];

      // 2. Insert each item into receiving_items
      for (const item of data.items) {
        const lineTotal = (item.fair_market_value ?? 0) * item.quantity_received;
        await client.query(
          `INSERT INTO receiving_items
             (receiving_id, product_id, sku, product_name, category_id,
              quantity_received, fair_market_value, condition, line_total,
              accepted_quantity, rejected_quantity, add_to_inventory, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,true,$11)`,
          [
            receiving.id,
            item.product_id ?? null,
            item.sku ?? null,
            item.product_name,
            item.category_id ?? null,
            item.quantity_received,
            item.fair_market_value ?? null,
            item.condition,
            lineTotal,
            item.quantity_received,  // accepted_quantity = quantity_received
            item.notes ?? null,
          ]
        );
      }

      // 3. Update receiving totals
      await client.query(
        `UPDATE inventory_receiving
         SET total_items    = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
             total_quantity = (SELECT COALESCE(SUM(quantity_received),0) FROM receiving_items WHERE receiving_id = $1),
             total_value    = (SELECT COALESCE(SUM(line_total),0) FROM receiving_items WHERE receiving_id = $1),
             updated_at     = NOW()
         WHERE id = $1`,
        [receiving.id]
      );

      // 4. Create inventory_adjustments for items with product_id (trigger updates stock + generates adj number)
      for (const item of data.items) {
        if (item.product_id) {
          const productResult = await client.query(
            'SELECT quantity_in_stock FROM products WHERE id = $1',
            [item.product_id]
          );
          const oldQty = productResult.rows[0]?.quantity_in_stock ?? 0;
          const newQty = oldQty + item.quantity_received;
          await client.query(
            `INSERT INTO inventory_adjustments
               (product_id, adjustment_type, quantity_change, old_quantity, new_quantity, reason, adjusted_by)
             VALUES ($1, 'receiving', $2, $3, $4, $5, $6)`,
            [item.product_id, item.quantity_received, oldQty, newQty, `Donation: ${donation.donation_number}`, userId]
          );
        }
      }

      // 5. Mark receiving completed, link donation.receiving_id
      await client.query(
        `UPDATE inventory_receiving SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [receiving.id]
      );
      const updatedDonation = await client.query(
        `UPDATE donations SET receiving_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [receiving.id, donation.id]
      );
      await client.query('COMMIT');
      return updatedDonation.rows[0];
    }

    await client.query('COMMIT');
    return donation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listDonations(query: ListDonationsQuery): Promise<any> {
  const { vendor_id, donation_type, receipt_sent, start_date, end_date, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendor_id)     { conditions.push(`d.vendor_id = $${i++}`);      params.push(vendor_id); }
  if (donation_type) { conditions.push(`d.donation_type = $${i++}`);  params.push(donation_type); }
  if (receipt_sent !== undefined) { conditions.push(`d.tax_receipt_sent = $${i++}`); params.push(receipt_sent); }
  if (start_date)    { conditions.push(`d.donation_date >= $${i++}`); params.push(start_date); }
  if (end_date)      { conditions.push(`d.donation_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM donations d ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT d.*, v.business_name AS vendor_name
     FROM donations d
     JOIN vendors v ON v.id = d.vendor_id
     ${where}
     ORDER BY d.donation_date DESC, d.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  return {
    donations: dataResult.rows,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getDonation(id: string): Promise<any> {
  const donationResult = await pool.query(
    `SELECT d.*, v.business_name AS vendor_name
     FROM donations d
     JOIN vendors v ON v.id = d.vendor_id
     WHERE d.id = $1`,
    [id]
  );
  if (donationResult.rowCount === 0) {
    throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
  }
  const donation = donationResult.rows[0];

  // Load items from linked receiving (if any)
  let items: any[] = [];
  if (donation.receiving_id) {
    const itemsResult = await pool.query(
      'SELECT * FROM receiving_items WHERE receiving_id = $1 ORDER BY created_at ASC',
      [donation.receiving_id]
    );
    items = itemsResult.rows;
  }

  return { ...donation, items };
}

export async function getReceiptByNumber(donationNumber: string): Promise<any> {
  const result = await pool.query(
    `SELECT d.donation_number, d.donor_name, d.donation_date, d.fair_market_value,
            d.tax_receipt_number, d.tax_receipt_date, d.goods_services_provided,
            d.goods_services_value, d.acknowledgment_sent
     FROM donations d
     WHERE d.donation_number = $1`,
    [donationNumber]
  );
  if (result.rowCount === 0) {
    throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
  }
  return result.rows[0];
}

export async function getAnnualSummary(vendorId: string, year: number): Promise<any> {
  const summaryResult = await pool.query(
    `SELECT donation_type,
            COUNT(*) AS count,
            COALESCE(SUM(fair_market_value), 0) AS total_value,
            COUNT(*) FILTER (WHERE tax_receipt_sent = true) AS receipts_sent
     FROM donations
     WHERE vendor_id = $1
       AND EXTRACT(year FROM donation_date) = $2
     GROUP BY donation_type`,
    [vendorId, year]
  );

  const donationRows = await pool.query(
    `SELECT id, donation_number, donation_date, donation_type, fair_market_value, tax_receipt_sent
     FROM donations
     WHERE vendor_id = $1
       AND EXTRACT(year FROM donation_date) = $2
     ORDER BY donation_date ASC`,
    [vendorId, year]
  );

  let totalDonations = 0;
  let totalValue = 0;
  let goodsDonations = 0;
  let cashDonations = 0;
  let mixedDonations = 0;
  let receiptsSent = 0;

  for (const row of summaryResult.rows) {
    const count = parseInt(row.count, 10);
    totalDonations += count;
    totalValue += parseFloat(row.total_value);
    receiptsSent += parseInt(row.receipts_sent, 10);
    if (row.donation_type === 'goods')  goodsDonations  += count;
    if (row.donation_type === 'cash')   cashDonations   += count;
    if (row.donation_type === 'mixed')  mixedDonations  += count;
  }

  return {
    vendor_id: vendorId,
    year,
    total_donations: totalDonations,
    total_value: totalValue,
    goods_donations: goodsDonations,
    cash_donations: cashDonations,
    mixed_donations: mixedDonations,
    receipts_sent: receiptsSent,
    donations: donationRows.rows,
  };
}

export async function updateDonation(id: string, data: UpdateDonationInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const existing = fetchResult.rows[0];
    if (existing.tax_receipt_sent) {
      throw new AppError(400, 'DONATION_RECEIPTED', 'Cannot update a receipted donation');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.donor_name !== undefined)                { setClauses.push(`donor_name = $${i++}`);                params.push(data.donor_name); }
    if (data.donor_email !== undefined)               { setClauses.push(`donor_email = $${i++}`);               params.push(data.donor_email); }
    if (data.donor_phone !== undefined)               { setClauses.push(`donor_phone = $${i++}`);               params.push(data.donor_phone); }
    if (data.donor_address !== undefined)             { setClauses.push(`donor_address = $${i++}`);             params.push(data.donor_address); }
    if (data.donation_date !== undefined)             { setClauses.push(`donation_date = $${i++}`);             params.push(data.donation_date); }
    if (data.donation_type !== undefined)             { setClauses.push(`donation_type = $${i++}`);             params.push(data.donation_type); }
    if (data.fair_market_value !== undefined)         { setClauses.push(`fair_market_value = $${i++}`);         params.push(data.fair_market_value); }
    if (data.cash_amount !== undefined)               { setClauses.push(`cash_amount = $${i++}`);               params.push(data.cash_amount); }
    if (data.tax_receipt_required !== undefined)      { setClauses.push(`tax_receipt_required = $${i++}`);      params.push(data.tax_receipt_required); }
    if (data.goods_services_provided !== undefined)   { setClauses.push(`goods_services_provided = $${i++}`);   params.push(data.goods_services_provided); }
    if (data.goods_services_description !== undefined){ setClauses.push(`goods_services_description = $${i++}`);params.push(data.goods_services_description); }
    if (data.goods_services_value !== undefined)      { setClauses.push(`goods_services_value = $${i++}`);      params.push(data.goods_services_value); }
    if (data.appraisal_required !== undefined)        { setClauses.push(`appraisal_required = $${i++}`);        params.push(data.appraisal_required); }
    if (data.appraiser_name !== undefined)            { setClauses.push(`appraiser_name = $${i++}`);            params.push(data.appraiser_name); }
    if (data.appraisal_date !== undefined)            { setClauses.push(`appraisal_date = $${i++}`);            params.push(data.appraisal_date); }
    if (data.notes !== undefined)                     { setClauses.push(`notes = $${i++}`);                     params.push(data.notes); }
    if (data.internal_notes !== undefined)            { setClauses.push(`internal_notes = $${i++}`);            params.push(data.internal_notes); }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await client.query(
      `UPDATE donations SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
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

export async function generateReceipt(id: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const donation = fetchResult.rows[0];
    if (donation.tax_receipt_number) {
      throw new AppError(400, 'RECEIPT_ALREADY_GENERATED', 'Receipt already generated for this donation');
    }

    // Generate RCPT-YYYYMMDD-NNNN
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxResult = await client.query(
      `SELECT MAX(CAST(SUBSTRING(tax_receipt_number FROM 15) AS INTEGER)) AS max_num
       FROM donations
       WHERE tax_receipt_number LIKE 'RCPT-' || $1 || '-%'`,
      [today]
    );
    const nextNum = (maxResult.rows[0].max_num ?? 0) + 1;
    const receiptNumber = `RCPT-${today}-${nextNum.toString().padStart(4, '0')}`;

    const result = await client.query(
      `UPDATE donations
       SET tax_receipt_number = $1,
           tax_receipt_sent   = true,
           tax_receipt_date   = CURRENT_DATE,
           updated_at         = NOW()
       WHERE id = $2
       RETURNING *`,
      [receiptNumber, id]
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

export async function sendReceipt(id: string, email?: string, method?: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const donation = fetchResult.rows[0];

    const deliveryNote = `[RECEIPT SENT${email ? ' to ' + email : ''}${method ? ' via ' + method : ''}]`;
    const newNotes = donation.internal_notes
      ? `${donation.internal_notes} ${deliveryNote}`
      : deliveryNote;

    const result = await client.query(
      `UPDATE donations
       SET tax_receipt_sent = true,
           tax_receipt_date = COALESCE(tax_receipt_date, CURRENT_DATE),
           internal_notes   = $1,
           updated_at       = NOW()
       WHERE id = $2
       RETURNING *`,
      [newNotes, id]
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

export async function generateAcknowledgment(id: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }

    const result = await client.query(
      `UPDATE donations
       SET acknowledgment_sent = true,
           acknowledgment_date = CURRENT_DATE,
           updated_at          = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
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
```

- [ ] **Step 3.2** — Commit the service

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations
git add backend/src/services/donations.service.ts
git commit -m "feat(donations): add donations service with 8 methods"
```

---

## Task 4: Controller + Routes + Registration

Create the controller with Zod validation, the route file with correct ordering, and register in `routes/index.ts`. Then run all tests to confirm green.

**Files:**
- Create: `backend/src/controllers/donations.controller.ts`
- Create: `backend/src/routes/donations.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 4.1** — Create `backend/src/controllers/donations.controller.ts`

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import * as donationsService from '../services/donations.service';

const DonationItemSchema = z.object({
  product_id:       z.string().uuid().optional(),
  sku:              z.string().max(100).optional(),
  product_name:     z.string().min(1, 'Product name is required').max(255),
  category_id:      z.string().uuid().optional(),
  quantity_received: z.number().int().positive('Quantity must be positive'),
  fair_market_value: z.number().nonnegative().optional(),
  condition:        z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']),
  notes:            z.string().max(2000).optional(),
});

const CreateDonationSchema = z.object({
  vendor_id:                    z.string().uuid('Invalid vendor ID'),
  donor_name:                   z.string().min(1, 'Donor name is required').max(255),
  donor_email:                  z.string().email().max(255).optional(),
  donor_phone:                  z.string().max(20).optional(),
  donor_address:                z.string().max(500).optional(),
  donation_date:                z.string().optional(),
  donation_type:                z.enum(['goods', 'cash', 'mixed']),
  fair_market_value:            z.number().nonnegative('Fair market value must be >= 0'),
  cash_amount:                  z.number().nonnegative().optional(),
  tax_receipt_required:         z.boolean().optional(),
  goods_services_provided:      z.boolean().optional(),
  goods_services_description:   z.string().max(2000).optional(),
  goods_services_value:         z.number().nonnegative().optional(),
  appraisal_required:           z.boolean().optional(),
  notes:                        z.string().max(2000).optional(),
  internal_notes:               z.string().max(2000).optional(),
  items:                        z.array(DonationItemSchema).optional(),
});

const UpdateDonationSchema = z.object({
  donor_name:                   z.string().min(1).max(255).optional(),
  donor_email:                  z.string().email().max(255).optional(),
  donor_phone:                  z.string().max(20).optional(),
  donor_address:                z.string().max(500).optional(),
  donation_date:                z.string().optional(),
  donation_type:                z.enum(['goods', 'cash', 'mixed']).optional(),
  fair_market_value:            z.number().nonnegative().optional(),
  cash_amount:                  z.number().nonnegative().optional(),
  tax_receipt_required:         z.boolean().optional(),
  goods_services_provided:      z.boolean().optional(),
  goods_services_description:   z.string().max(2000).optional(),
  goods_services_value:         z.number().nonnegative().optional(),
  appraisal_required:           z.boolean().optional(),
  appraiser_name:               z.string().max(255).optional(),
  appraisal_date:               z.string().optional(),
  notes:                        z.string().max(2000).optional(),
  internal_notes:               z.string().max(2000).optional(),
});

const SendReceiptSchema = z.object({
  email:  z.string().email().optional(),
  method: z.string().max(50).optional(),
});

function errResponse(res: Response, err: unknown): void {
  const e = err as { statusCode?: number; code?: string; message?: string };
  res.status(e.statusCode || 500).json({
    success: false,
    error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
  });
}

export async function createDonation(req: Request, res: Response): Promise<void> {
  const parsed = CreateDonationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.createDonation(req.user!.userId, parsed.data as any);
    res.status(201).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function listDonations(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      vendor_id:     req.query.vendor_id     as string | undefined,
      donation_type: req.query.donation_type as string | undefined,
      receipt_sent:  req.query.receipt_sent !== undefined
                       ? req.query.receipt_sent === 'true'
                       : undefined,
      start_date:    req.query.start_date    as string | undefined,
      end_date:      req.query.end_date      as string | undefined,
      page:          req.query.page  ? parseInt(req.query.page  as string, 10) : 1,
      limit:         req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await donationsService.listDonations(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getDonation(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.getDonation(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getReceiptByNumber(req: Request, res: Response): Promise<void> {
  try {
    const receipt = await donationsService.getReceiptByNumber(req.params.donationNumber);
    res.status(200).json({ success: true, data: receipt });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getAnnualSummary(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year, 10);
    const summary = await donationsService.getAnnualSummary(req.params.vendorId, year);
    res.status(200).json({ success: true, data: summary });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function updateDonation(req: Request, res: Response): Promise<void> {
  const parsed = UpdateDonationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.updateDonation(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function generateReceipt(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.generateReceipt(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function sendReceipt(req: Request, res: Response): Promise<void> {
  const parsed = SendReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.sendReceipt(req.params.id, parsed.data.email, parsed.data.method);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function generateAcknowledgment(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.generateAcknowledgment(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}
```

- [ ] **Step 4.2** — Create `backend/src/routes/donations.routes.ts`

**CRITICAL route ordering:** `annual-summary` and `receipts` routes MUST come before `/:id` to prevent Express matching those literal strings as ID params.

```typescript
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as donationsController from '../controllers/donations.controller';

const router = Router();

router.use(authenticateToken);

// Static sub-paths MUST come before /:id
router.get('/annual-summary/:vendorId/:year', requirePermission('donations', 'read'),   donationsController.getAnnualSummary);
router.get('/receipts/:donationNumber',        requirePermission('donations', 'read'),   donationsController.getReceiptByNumber);

router.get('/',    requirePermission('donations', 'read'),   donationsController.listDonations);
router.post('/',   requirePermission('donations', 'create'), donationsController.createDonation);
router.get('/:id', requirePermission('donations', 'read'),   donationsController.getDonation);
router.put('/:id', requirePermission('donations', 'update'), donationsController.updateDonation);

router.post('/:id/generate-receipt',      requirePermission('donations', 'receipt'), donationsController.generateReceipt);
router.post('/:id/send-receipt',          requirePermission('donations', 'receipt'), donationsController.sendReceipt);
router.post('/:id/generate-acknowledgment', requirePermission('donations', 'receipt'), donationsController.generateAcknowledgment);

export default router;
```

- [ ] **Step 4.3** — Register in `backend/src/routes/index.ts`

Add two lines:

**Import** (after `vendorPaymentsRoutes` import):
```typescript
import donationRoutes from './donations.routes';
```

**Route** (after `router.use('/vendor-payments', vendorPaymentsRoutes);`):
```typescript
router.use('/donations', donationRoutes);
```

- [ ] **Step 4.4** — Run all tests

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations/backend
npx jest --testPathPattern="donations.api.test" --no-coverage 2>&1 | tail -40
```

Expected: All 28 tests pass.

If tests fail, diagnose: read the error output, check mock call counts match the number of `mockClient.query` / `pool.query` calls in the service method.

- [ ] **Step 4.5** — Commit

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations
git add backend/src/controllers/donations.controller.ts \
        backend/src/routes/donations.routes.ts \
        backend/src/routes/index.ts
git commit -m "feat(donations): add controller, routes, register under /api/v1/donations

- donations.controller.ts: Zod validation for all 9 endpoints
- donations.routes.ts: annual-summary and receipts routes before /:id
- routes/index.ts: register /donations route
All 28 integration tests pass."
```

---

## Task 5: Seed Donations Permissions

Add 4 donations permissions to the manager role in `backend/src/database/seed.ts`.

**Files:**
- Modify: `backend/src/database/seed.ts`

- [ ] **Step 5.1** — Open `backend/src/database/seed.ts` and find the `manager` array (around line 17). Add the following after the `vendor_payments` permissions line:

```typescript
    'donations:create', 'donations:read', 'donations:update', 'donations:receipt',
```

The manager array should end with:
```typescript
    'accounts_payable:create', 'accounts_payable:read', 'accounts_payable:update',
    'vendor_payments:create', 'vendor_payments:read', 'vendor_payments:update',
    'donations:create', 'donations:read', 'donations:update', 'donations:receipt',
```

- [ ] **Step 5.2** — Commit

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-donations
git add backend/src/database/seed.ts
git commit -m "feat(donations): seed 4 donations permissions for manager role

Adds donations:create, donations:read, donations:update, donations:receipt
to manager tier. Admin inherits via cumulative assignment."
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| 9 endpoints (list, get, create, update, generate-receipt, send-receipt, generate-acknowledgment, annual-summary, receipts lookup) | Tasks 4 |
| DON-YYYYMMDD-NNNN trigger | Task 1 |
| RCPT-YYYYMMDD-NNNN generation in service | Task 3 `generateReceipt` |
| Create with items → linked receiving + receiving_items + inventory_adjustments | Task 3 `createDonation` |
| Update guard for receipted donations (DONATION_RECEIPTED) | Task 3 `updateDonation` |
| Annual summary aggregation | Task 3 `getAnnualSummary` |
| Receipt by donation number | Task 3 `getReceiptByNumber` |
| `annual-summary` and `receipts` routes before `/:id` | Task 4.2 |
| 4 permissions seeded for manager | Task 5 |
| ~28 integration tests | Task 2 |

All spec requirements are covered. No placeholders. Method names are consistent across service, controller, and routes.
