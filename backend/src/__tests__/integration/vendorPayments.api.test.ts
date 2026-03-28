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
const AP_ID = '550e8400-e29b-41d4-a716-446655440400';
const PAYMENT_ID = '550e8400-e29b-41d4-a716-446655440500';
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

  const vendorPaymentRoutes = (await import('../../routes/vendor_payments.routes')).default;
  app.use('/api/v1/vendor-payments', vendorPaymentRoutes);

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

describe('POST /api/v1/vendor-payments', () => {
  it('should create a payment with single allocation', async () => {
    const apInvoice = {
      id: AP_ID, ap_number: 'AP-2026-0001', vendor_id: VENDOR_ID,
      invoice_amount: '1000.00', amount_paid: '0.00', amount_due: '1000.00', status: 'open',
    };
    const createdPayment = {
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      payment_date: '2026-03-28', payment_method: 'check',
      total_amount: '500.00', status: 'pending',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };

    // Sequence: BEGIN, vendor check, count for PMT number, INSERT payment,
    // AP lock (for allocation validation), INSERT allocation,
    // updateAPBalance lock, updateAPBalance UPDATE, vendor balance UPDATE, COMMIT
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '2000.00' }], rowCount: 1 }) // vendor check
      .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 }) // PMT count
      .mockResolvedValueOnce({ rows: [createdPayment], rowCount: 1 }) // INSERT payment
      .mockResolvedValueOnce({ rows: [apInvoice], rowCount: 1 }) // AP lock for validation
      .mockResolvedValueOnce({ rows: [{ id: 'alloc-1' }], rowCount: 1 }) // INSERT allocation
      .mockResolvedValueOnce({ rows: [{ ...apInvoice, amount_paid: '500.00', amount_due: '500.00', status: 'partial' }], rowCount: 1 }) // updateAPBalance lock
      .mockResolvedValueOnce({ rows: [{ ...apInvoice, amount_paid: '500.00', amount_due: '500.00', status: 'partial' }], rowCount: 1 }) // updateAPBalance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post('/api/v1/vendor-payments')
      .send({
        vendor_id: VENDOR_ID,
        payment_date: '2026-03-28',
        payment_method: 'check',
        invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 500 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment_number).toBe('PMT-2026-0001');
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.total_amount).toBe('500.00');
  });

  it('should return 400 when allocation exceeds amount_due', async () => {
    const apInvoice = {
      id: AP_ID, vendor_id: VENDOR_ID,
      invoice_amount: '1000.00', amount_paid: '800.00', amount_due: '200.00', status: 'partial',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '200.00' }], rowCount: 1 }) // vendor check
      .mockResolvedValueOnce({ rows: [{ next_seq: 2 }], rowCount: 1 }) // PMT count
      .mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, payment_number: 'PMT-2026-0002', total_amount: '500.00', status: 'pending', vendor_id: VENDOR_ID, payment_date: '2026-03-28', payment_method: 'check', reference_number: null, memo: null, approved_by: null, approved_at: null, created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z' }], rowCount: 1 }) // INSERT payment
      .mockResolvedValueOnce({ rows: [apInvoice], rowCount: 1 }); // AP lock — amount_due 200 < allocated 500

    const res = await request(app)
      .post('/api/v1/vendor-payments')
      .send({
        vendor_id: VENDOR_ID,
        payment_date: '2026-03-28',
        payment_method: 'check',
        invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 500 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/exceeds invoice balance/i);
  });

  it('should return 400 when invoice belongs to different vendor', async () => {
    const otherVendorApInvoice = {
      id: AP_ID, vendor_id: 'a0000000-0000-0000-0000-000000000001',
      invoice_amount: '1000.00', amount_paid: '0.00', amount_due: '1000.00', status: 'open',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '1000.00' }], rowCount: 1 }) // vendor check
      .mockResolvedValueOnce({ rows: [{ next_seq: 3 }], rowCount: 1 }) // PMT count
      .mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, payment_number: 'PMT-2026-0003', total_amount: '500.00', status: 'pending', vendor_id: VENDOR_ID, payment_date: '2026-03-28', payment_method: 'check', reference_number: null, memo: null, approved_by: null, approved_at: null, created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z' }], rowCount: 1 }) // INSERT payment
      .mockResolvedValueOnce({ rows: [otherVendorApInvoice], rowCount: 1 }); // AP lock — different vendor

    const res = await request(app)
      .post('/api/v1/vendor-payments')
      .send({
        vendor_id: VENDOR_ID,
        payment_date: '2026-03-28',
        payment_method: 'check',
        invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 500 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not belong to this vendor/i);
  });

  it('should return 404 when vendor not found', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // vendor check — not found

    const res = await request(app)
      .post('/api/v1/vendor-payments')
      .send({
        vendor_id: VENDOR_ID,
        payment_date: '2026-03-28',
        payment_method: 'check',
        invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 500 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/vendor not found/i);
  });

  it('should return 400 when invoice_allocations is empty', async () => {
    const res = await request(app)
      .post('/api/v1/vendor-payments')
      .send({
        vendor_id: VENDOR_ID,
        payment_date: '2026-03-28',
        payment_method: 'check',
        invoice_allocations: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation error');
  });
});

describe('POST /api/v1/vendor-payments/:id/approve', () => {
  it('should approve a pending payment', async () => {
    const pendingPayment = {
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      status: 'pending', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };
    const approvedPayment = {
      ...pendingPayment, status: 'cleared',
      approved_by: USER_ID, approved_at: '2026-03-28T01:00:00Z',
    };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [pendingPayment], rowCount: 1 }) // fetch payment
      .mockResolvedValueOnce({ rows: [approvedPayment], rowCount: 1 }); // UPDATE

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cleared');
    expect(res.body.data.approved_by).toBe(USER_ID);
  });

  it('should return 400 when payment is not pending', async () => {
    const clearedPayment = {
      id: PAYMENT_ID, status: 'cleared', vendor_id: VENDOR_ID,
      payment_number: 'PMT-2026-0001', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: USER_ID,
      approved_at: '2026-03-28T01:00:00Z',
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [clearedPayment], rowCount: 1 }); // fetch — cleared

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/approve`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/only pending payments can be approved/i);
  });

  it('should return 404 when payment not found', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // not found

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/approve`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/payment not found/i);
  });
});

describe('POST /api/v1/vendor-payments/:id/void', () => {
  it('should void a cleared payment and reverse AP balances', async () => {
    const clearedPayment = {
      id: PAYMENT_ID, vendor_id: VENDOR_ID, status: 'cleared',
      total_amount: '500.00', payment_number: 'PMT-2026-0001',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: USER_ID,
      approved_at: '2026-03-28T01:00:00Z',
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };
    const allocations = [{ ap_invoice_id: AP_ID, allocated_amount: '500.00' }];
    const voidedPayment = { ...clearedPayment, status: 'void' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [clearedPayment], rowCount: 1 }) // fetch payment
      .mockResolvedValueOnce({ rows: allocations, rowCount: 1 }) // fetch allocations
      // updateAPBalance: lock AP row
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '500.00', amount_due: '500.00', status: 'partial', invoice_amount: '1000.00', vendor_id: VENDOR_ID }], rowCount: 1 })
      // updateAPBalance: UPDATE
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '0.00', amount_due: '1000.00', status: 'open', invoice_amount: '1000.00' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance restore
      .mockResolvedValueOnce({ rows: [voidedPayment], rowCount: 1 }) // UPDATE payment void
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/void`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('void');
  });

  it('should return 400 when payment is already void', async () => {
    const voidedPayment = {
      id: PAYMENT_ID, status: 'void', vendor_id: VENDOR_ID,
      payment_number: 'PMT-2026-0001', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [voidedPayment], rowCount: 1 }); // fetch — already void

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/void`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/payment cannot be voided/i);
  });
});

describe('GET /api/v1/vendor-payments', () => {
  it('should list payments with pagination', async () => {
    const payments = [{
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      payment_date: '2026-03-28', payment_method: 'check',
      total_amount: '500.00', status: 'pending',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    }];

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // count query
      .mockResolvedValueOnce({ rows: payments, rowCount: 1 }); // data query

    const res = await request(app).get('/api/v1/vendor-payments?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payments).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
  });

  it('should filter by vendorId', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/vendor-payments?vendor_id=${VENDOR_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.payments).toHaveLength(0);
  });

  it('should filter by status', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get('/api/v1/vendor-payments?status=cleared');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/vendor-payments/:id', () => {
  it('should return payment with allocations', async () => {
    const rows = [{
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      payment_date: '2026-03-28', payment_method: 'check',
      total_amount: '500.00', status: 'pending',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
      vendor_number: 'VEND-000001', business_name: 'Test Vendor',
      alloc_id: 'alloc-1', ap_invoice_id: AP_ID, ap_number: 'AP-2026-0001',
      invoice_number: null, allocated_amount: '500.00', discount_taken: '0.00',
    }];

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows, rowCount: 1 });

    const res = await request(app).get(`/api/v1/vendor-payments/${PAYMENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PAYMENT_ID);
    expect(res.body.data.allocations).toBeDefined();
    expect(res.body.data.allocations).toHaveLength(1);
  });

  it('should return 404 when not found', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get(`/api/v1/vendor-payments/${PAYMENT_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/vendor-payments/:id', () => {
  it('should update editable fields', async () => {
    const existing = {
      id: PAYMENT_ID, status: 'pending', vendor_id: VENDOR_ID,
      payment_number: 'PMT-2026-0001', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };
    const updated = { ...existing, memo: 'Invoice batch March', reference_number: 'CHK-1001' };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [existing], rowCount: 1 }) // fetch
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 }); // UPDATE

    const res = await request(app)
      .put(`/api/v1/vendor-payments/${PAYMENT_ID}`)
      .send({ memo: 'Invoice batch March', reference_number: 'CHK-1001' });

    expect(res.status).toBe(200);
    expect(res.body.data.memo).toBe('Invoice batch March');
  });

  it('should return 400 with empty body', async () => {
    const res = await request(app).put(`/api/v1/vendor-payments/${PAYMENT_ID}`).send({});
    expect(res.status).toBe(400);
  });
});
