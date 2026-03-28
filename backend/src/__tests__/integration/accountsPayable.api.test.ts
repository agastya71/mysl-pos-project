import request from 'supertest';
import express from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

let app: express.Application;
let mockClient: any;

const VENDOR_ID = '550e8400-e29b-41d4-a716-446655440300';
const PO_ID = '550e8400-e29b-41d4-a716-446655440301';
const AP_ID = '550e8400-e29b-41d4-a716-446655440400';
const USER_ID = '550e8400-e29b-41d4-a716-446655440200';

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

  const apRoutes = (await import('../../routes/accounts_payable.routes')).default;
  app.use('/api/v1/accounts-payable', apRoutes);

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

describe('POST /api/v1/accounts-payable', () => {
  it('should create invoice with valid data', async () => {
    const createdInvoice = {
      id: AP_ID,
      ap_number: 'AP-2026-0001',
      vendor_id: VENDOR_ID,
      purchase_order_id: null,
      invoice_number: 'INV-001',
      invoice_date: '2026-03-01',
      due_date: '2026-03-31',
      status: 'open',
      invoice_amount: '1000.00',
      amount_paid: '0.00',
      amount_due: '1000.00',
      discount_available: '0.00',
      discount_date: null,
      payment_terms: 'Net 30',
      notes: null,
      internal_notes: null,
      created_by: USER_ID,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    };

    // DB call sequence: BEGIN, vendor check, AP number count, INSERT ap, vendor balance UPDATE, COMMIT
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', is_active: true }], rowCount: 1 }) // vendor check
      .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 }) // AP number count
      .mockResolvedValueOnce({ rows: [createdInvoice], rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post('/api/v1/accounts-payable')
      .send({
        vendor_id: VENDOR_ID,
        invoice_date: '2026-03-01',
        due_date: '2026-03-31',
        invoice_amount: 1000,
        invoice_number: 'INV-001',
        payment_terms: 'Net 30',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ap_number).toBe('AP-2026-0001');
    expect(res.body.data.status).toBe('open');
    expect(res.body.data.invoice_amount).toBe('1000.00');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/accounts-payable')
      .send({ vendor_id: VENDOR_ID }); // missing invoice_date, due_date, invoice_amount

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });

  it('should return 404 when vendor not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // vendor check — not found

    const res = await request(app)
      .post('/api/v1/accounts-payable')
      .send({
        vendor_id: VENDOR_ID,
        invoice_date: '2026-03-01',
        due_date: '2026-03-31',
        invoice_amount: 1000,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/vendor not found/i);
  });

  it('should return 400 when vendor_id is not a valid UUID', async () => {
    const res = await request(app)
      .post('/api/v1/accounts-payable')
      .send({
        vendor_id: 'not-a-uuid',
        invoice_date: '2026-03-01',
        due_date: '2026-03-31',
        invoice_amount: 1000,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });
});

describe('GET /api/v1/accounts-payable/:id', () => {
  it('should return invoice with details when found', async () => {
    const invoiceRow = {
      id: AP_ID, ap_number: 'AP-2026-0001', vendor_id: VENDOR_ID,
      purchase_order_id: null, invoice_number: 'INV-001',
      invoice_date: '2026-03-01', due_date: '2026-03-31',
      status: 'open', invoice_amount: '1000.00', amount_paid: '0.00',
      amount_due: '1000.00', discount_available: '0.00', discount_date: null,
      payment_terms: 'Net 30', notes: null, internal_notes: null,
      created_by: USER_ID, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
      vendor_number: 'VEND-000001', business_name: 'Test Vendor',
      po_number: null,
      alloc_id: null, payment_id: null, payment_number: null,
      payment_date: null, payment_method: null, allocated_amount: null,
      payment_status: null,
    };

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [invoiceRow], rowCount: 1 });

    const res = await request(app).get(`/api/v1/accounts-payable/${AP_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(AP_ID);
    expect(res.body.data.vendor).toBeDefined();
    expect(res.body.data.payments).toBeDefined();
  });

  it('should return 404 when not found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/accounts-payable/${AP_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/accounts-payable', () => {
  it('should list invoices with pagination', async () => {
    const invoices = [{
      id: AP_ID, ap_number: 'AP-2026-0001', vendor_id: VENDOR_ID,
      invoice_date: '2026-03-01', due_date: '2026-03-31',
      status: 'open', invoice_amount: '1000.00', amount_paid: '0.00',
      amount_due: '1000.00', discount_available: '0.00', discount_date: null,
      payment_terms: 'Net 30', notes: null, internal_notes: null,
      purchase_order_id: null, invoice_number: null, created_by: USER_ID,
      created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '1', total_due: '1000.00', overdue_total: '0.00' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: invoices, rowCount: 1 });

    const res = await request(app).get('/api/v1/accounts-payable?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('should filter by status', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0', total_due: '0', overdue_total: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/accounts-payable?status=paid');
    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toHaveLength(0);
  });

  it('should filter overdue invoices', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0', total_due: '0', overdue_total: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/accounts-payable?overdue=true');
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/v1/accounts-payable/:id', () => {
  it('should update editable fields', async () => {
    const existing = {
      id: AP_ID, status: 'open', vendor_id: VENDOR_ID,
      ap_number: 'AP-2026-0001', invoice_amount: '1000.00', amount_paid: '0.00',
      amount_due: '1000.00', discount_available: '0.00', discount_date: null,
      payment_terms: 'Net 30', notes: null, internal_notes: null,
      purchase_order_id: null, invoice_number: null, invoice_date: '2026-03-01',
      due_date: '2026-03-31', created_by: USER_ID,
      created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    };
    const updated = { ...existing, payment_terms: 'Net 60', due_date: '2026-04-30' };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [existing], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

    const res = await request(app)
      .put(`/api/v1/accounts-payable/${AP_ID}`)
      .send({ payment_terms: 'Net 60', due_date: '2026-04-30' });

    expect(res.status).toBe(200);
    expect(res.body.data.payment_terms).toBe('Net 60');
  });

  it('should return 400 with empty body', async () => {
    const res = await request(app).put(`/api/v1/accounts-payable/${AP_ID}`).send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/accounts-payable/:id/cancel', () => {
  it('should cancel an open invoice', async () => {
    const existing = {
      id: AP_ID, status: 'open', vendor_id: VENDOR_ID, amount_due: '1000.00',
      ap_number: 'AP-2026-0001', invoice_amount: '1000.00', amount_paid: '0.00',
      discount_available: '0.00', discount_date: null, payment_terms: null,
      notes: null, internal_notes: null, purchase_order_id: null, invoice_number: null,
      invoice_date: '2026-03-01', due_date: '2026-03-31', created_by: USER_ID,
      created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    };
    const cancelled = { ...existing, status: 'cancelled' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [existing], rowCount: 1 }) // fetch
      .mockResolvedValueOnce({ rows: [cancelled], rowCount: 1 }) // UPDATE status
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance decrement
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/accounts-payable/${AP_ID}/cancel`)
      .send({ reason: 'Duplicate invoice' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('should return 400 when invoice is already paid', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{
        id: AP_ID, status: 'paid', vendor_id: VENDOR_ID, amount_due: '0.00',
        ap_number: 'AP-2026-0001', invoice_amount: '1000.00', amount_paid: '1000.00',
      }], rowCount: 1 }); // fetch — paid

    const res = await request(app)
      .post(`/api/v1/accounts-payable/${AP_ID}/cancel`)
      .send({ reason: 'Duplicate invoice' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot cancel a paid or already cancelled invoice/i);
  });

  it('should return 400 when reason is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/accounts-payable/${AP_ID}/cancel`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/accounts-payable/aging-report', () => {
  it('should return aging report grouped by vendor', async () => {
    const agingRows = [
      {
        vendor_id: VENDOR_ID,
        vendor_number: 'VEND-000001',
        business_name: 'Test Vendor',
        current_amount: '500.00',
        days_1_30: '200.00',
        days_31_60: '0.00',
        days_61_90: '0.00',
        days_90_plus: '0.00',
        total: '700.00',
      },
    ];

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: agingRows, rowCount: 1 });

    const res = await request(app).get('/api/v1/accounts-payable/aging-report');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vendors).toHaveLength(1);
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.as_of_date).toBeDefined();
  });
});

describe('GET /api/v1/accounts-payable/due-this-week', () => {
  it('should return invoices due within 7 days', async () => {
    const dueInvoices = [
      {
        id: AP_ID, ap_number: 'AP-2026-0001', vendor_id: VENDOR_ID,
        invoice_date: '2026-03-01', due_date: '2026-03-30',
        status: 'open', invoice_amount: '1000.00', amount_paid: '0.00',
        amount_due: '1000.00', discount_available: '0.00', discount_date: null,
        payment_terms: 'Net 30', notes: null, internal_notes: null,
        purchase_order_id: null, invoice_number: null, created_by: USER_ID,
        created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: dueInvoices, rowCount: 1 });

    const res = await request(app).get('/api/v1/accounts-payable/due-this-week');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(AP_ID);
  });

  it('should return empty array when no invoices due', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/accounts-payable/due-this-week');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
