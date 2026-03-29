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
