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
