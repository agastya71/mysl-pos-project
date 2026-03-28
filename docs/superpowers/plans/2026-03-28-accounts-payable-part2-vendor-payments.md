# Accounts Payable — Part 2: Vendor Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 7 vendor payment endpoints (list, create, get, update, approve, void, batch) including invoice allocation, balance reversal on void, and batch-transaction support.

**Architecture:** New `vendorPayments.service.ts` imports `updateAPBalance` from `accountsPayable.service.ts` to keep AP balance logic in one place. New `vendorPayments.controller.ts` + `vendor_payments.routes.ts` follow the same Zod-validation + thin-controller pattern as the AP invoice files created in Part 1. Tests mock the DB layer via `jest.mock('../../config/database')`. **This plan assumes Part 1 is merged first** — it depends on `accountsPayable.service.ts` existing.

**Tech Stack:** Node.js 18, TypeScript strict, Express, Zod, pg, Jest + supertest.

---

## Worktree

All work is in: `/Users/u0102180/code/personal-projects/pos-feature-accounts-payable`
Branch: `feature/accounts-payable`
Git identity already set to `agastya71` / `1957442+agastya71@users.noreply.github.com`.

## File Map

| File | Action |
|---|---|
| `backend/src/types/vendorPayments.types.ts` | Create — TypeScript interfaces |
| `backend/src/services/vendorPayments.service.ts` | Create — all service functions |
| `backend/src/controllers/vendorPayments.controller.ts` | Create — Zod schemas + request handlers |
| `backend/src/routes/vendor_payments.routes.ts` | Create — 7 routes |
| `backend/src/routes/index.ts` | Modify — register VP routes |
| `backend/src/__tests__/integration/vendorPayments.api.test.ts` | Create — integration tests |

---

## Task 1: TypeScript types

**Files:**
- Create: `backend/src/types/vendorPayments.types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// backend/src/types/vendorPayments.types.ts

export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number: string | null;
  total_amount: string;
  status: 'pending' | 'cleared' | 'void' | 'cancelled';
  memo: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  ap_invoice_id: string;
  allocated_amount: string;
  discount_taken: string;
  created_at: string;
}

export interface VendorPaymentWithAllocations extends VendorPayment {
  vendor: {
    id: string;
    vendor_number: string;
    business_name: string;
  };
  allocations: Array<{
    id: string;
    ap_invoice_id: string;
    ap_number: string;
    invoice_number: string | null;
    allocated_amount: string;
    discount_taken: string;
  }>;
}

export interface InvoiceAllocationInput {
  ap_invoice_id: string;
  allocated_amount: number;
  discount_taken?: number;
}

export interface CreatePaymentInput {
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
  invoice_allocations: InvoiceAllocationInput[];
}

export interface UpdatePaymentInput {
  payment_date?: string;
  payment_method?: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
}

export interface VPListQuery {
  vendor_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface VPListResult {
  payments: VendorPayment[];
  total: number;
  total_amount: number;
  page: number;
  pages: number;
}

export interface BatchPaymentInput {
  payments: CreatePaymentInput[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep -v "Cannot find module"
```

Expected: no errors on the new types file.

- [ ] **Step 3: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/types/vendorPayments.types.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add vendorPayments TypeScript types"
```

---

## Task 2: Vendor Payments service — createPayment + batchPayments

**Files:**
- Create: `backend/src/services/vendorPayments.service.ts` (initial — createPayment and batchPayments only)

- [ ] **Step 1: Write failing test for createPayment**

Create `backend/src/__tests__/integration/vendorPayments.api.test.ts` with only the createPayment tests to start:

```typescript
// backend/src/__tests__/integration/vendorPayments.api.test.ts

import request from 'supertest';
import express from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

// Import routes lazily after mocks are set up
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
    // AP lock (for allocation), INSERT allocation, updateAPBalance lock,
    // updateAPBalance UPDATE, vendor balance UPDATE, COMMIT
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
      id: AP_ID, vendor_id: 'different-vendor-id',
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

  it('should return 400 when vendor not found', async () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../../routes/vendor_payments.routes'`

- [ ] **Step 3: Create the service file with createPayment + generatePaymentNumber + batchPayments**

```typescript
// backend/src/services/vendorPayments.service.ts

import { pool } from '../config/database';
import { updateAPBalance } from './accountsPayable.service';
import {
  VendorPayment,
  VendorPaymentWithAllocations,
  CreatePaymentInput,
  UpdatePaymentInput,
  VPListQuery,
  VPListResult,
  BatchPaymentInput,
} from '../types/vendorPayments.types';

async function generatePaymentNumber(client: any): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query(
    `SELECT COUNT(*) + 1 AS next_seq
     FROM vendor_payments
     WHERE EXTRACT(year FROM created_at) = $1
     FOR UPDATE`,
    [year]
  );
  const seq = parseInt(result.rows[0].next_seq, 10);
  return `PMT-${year}-${seq.toString().padStart(4, '0')}`;
}

async function createPaymentWithClient(
  client: any,
  userId: string,
  data: CreatePaymentInput
): Promise<VendorPayment> {
  // Validate vendor exists and is active
  const vendorResult = await client.query(
    'SELECT id, business_name, current_balance FROM vendors WHERE id = $1 AND is_active = true',
    [data.vendor_id]
  );
  if (vendorResult.rowCount === 0) {
    throw new Error('Vendor not found');
  }

  // Generate payment number
  const paymentNumber = await generatePaymentNumber(client);

  // Calculate total from allocations
  const totalAmount = data.invoice_allocations.reduce(
    (sum, alloc) => sum + alloc.allocated_amount,
    0
  );

  // Insert payment record
  const paymentResult = await client.query(
    `INSERT INTO vendor_payments
       (vendor_id, payment_number, payment_date, payment_method, reference_number,
        total_amount, status, memo, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
     RETURNING *`,
    [
      data.vendor_id,
      paymentNumber,
      data.payment_date,
      data.payment_method,
      data.reference_number ?? null,
      totalAmount,
      data.memo ?? null,
      userId,
    ]
  );
  const payment = paymentResult.rows[0] as VendorPayment;

  // Process each allocation
  for (const alloc of data.invoice_allocations) {
    // Lock AP invoice and validate
    const apResult = await client.query(
      `SELECT id, vendor_id, invoice_amount, amount_paid, amount_due, status
       FROM accounts_payable
       WHERE id = $1
       FOR UPDATE`,
      [alloc.ap_invoice_id]
    );

    if (apResult.rowCount === 0) {
      throw new Error('Invoice not found');
    }

    const ap = apResult.rows[0];

    if (ap.vendor_id !== data.vendor_id) {
      throw new Error('Invoice does not belong to this vendor');
    }

    if (parseFloat(alloc.allocated_amount.toString()) > parseFloat(ap.amount_due)) {
      throw new Error('Allocated amount exceeds invoice balance');
    }

    // Insert allocation
    await client.query(
      `INSERT INTO payment_allocations
         (payment_id, ap_invoice_id, allocated_amount, discount_taken)
       VALUES ($1, $2, $3, $4)`,
      [
        payment.id,
        alloc.ap_invoice_id,
        alloc.allocated_amount,
        alloc.discount_taken ?? 0,
      ]
    );

    // Update AP balance
    await updateAPBalance(client, alloc.ap_invoice_id, alloc.allocated_amount);
  }

  // Decrement vendor current_balance by total allocated
  await client.query(
    'UPDATE vendors SET current_balance = current_balance - $1 WHERE id = $2',
    [totalAmount, data.vendor_id]
  );

  return payment;
}

export async function createPayment(
  userId: string,
  data: CreatePaymentInput
): Promise<VendorPayment> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = await createPaymentWithClient(client, userId, data);
    await client.query('COMMIT');
    return payment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function batchPayments(
  userId: string,
  data: BatchPaymentInput
): Promise<VendorPayment[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payments: VendorPayment[] = [];
    for (const paymentData of data.payments) {
      const payment = await createPaymentWithClient(client, userId, paymentData);
      payments.push(payment);
    }
    await client.query('COMMIT');
    return payments;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 4: Create stub controller + routes so the test can load**

Create `backend/src/controllers/vendorPayments.controller.ts` with just the handlers referenced in tests (full implementation in Task 3):

```typescript
// backend/src/controllers/vendorPayments.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import * as vpService from '../services/vendorPayments.service';

const InvoiceAllocationSchema = z.object({
  ap_invoice_id: z.string().uuid('Invalid AP invoice ID'),
  allocated_amount: z.number().positive('Allocated amount must be positive'),
  discount_taken: z.number().nonnegative().optional(),
});

const CreatePaymentSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash', 'other']),
  reference_number: z.string().max(100).optional(),
  memo: z.string().max(1000).optional(),
  invoice_allocations: z.array(InvoiceAllocationSchema).min(1, 'At least one allocation is required'),
});

const UpdatePaymentSchema = z.object({
  payment_date: z.string().optional(),
  payment_method: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash', 'other']).optional(),
  reference_number: z.string().max(100).optional(),
  memo: z.string().max(1000).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const BatchPaymentSchema = z.object({
  payments: z.array(CreatePaymentSchema).min(1, 'At least one payment is required'),
});

export async function createPayment(req: Request, res: Response): Promise<void> {
  const parsed = CreatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payment = await vpService.createPayment(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function batchPayments(req: Request, res: Response): Promise<void> {
  const parsed = BatchPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payments = await vpService.batchPayments(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, data: payments });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

// Stubs for remaining handlers (implemented in Tasks 3 and 4)
export async function listPayments(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}

export async function approvePayment(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}

export async function voidPayment(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
```

Create `backend/src/routes/vendor_payments.routes.ts`:

```typescript
// backend/src/routes/vendor_payments.routes.ts
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as vpController from '../controllers/vendorPayments.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('vendor_payments', 'read'), vpController.listPayments);
router.post('/batch', requirePermission('vendor_payments', 'create'), vpController.batchPayments);
router.post('/', requirePermission('vendor_payments', 'create'), vpController.createPayment);
router.get('/:id', requirePermission('vendor_payments', 'read'), vpController.getPayment);
router.put('/:id', requirePermission('vendor_payments', 'update'), vpController.updatePayment);
router.post('/:id/approve', requirePermission('vendor_payments', 'approve'), vpController.approvePayment);
router.post('/:id/void', requirePermission('vendor_payments', 'update'), vpController.voidPayment);

export default router;
```

- [ ] **Step 5: Run the createPayment tests to verify they pass**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -30
```

Expected: The 5 createPayment tests pass.

- [ ] **Step 6: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/services/vendorPayments.service.ts \
  backend/src/controllers/vendorPayments.controller.ts \
  backend/src/routes/vendor_payments.routes.ts \
  backend/src/__tests__/integration/vendorPayments.api.test.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add createPayment and batchPayments service + stub controller + routes"
```

---

## Task 3: approvePayment + voidPayment

**Files:**
- Modify: `backend/src/services/vendorPayments.service.ts` (add approvePayment, voidPayment)
- Modify: `backend/src/controllers/vendorPayments.controller.ts` (replace approvePayment + voidPayment stubs with real implementations)
- Modify: `backend/src/__tests__/integration/vendorPayments.api.test.ts` (add approve + void tests)

- [ ] **Step 1: Add approve + void tests to the test file**

Append to `backend/src/__tests__/integration/vendorPayments.api.test.ts`:

```typescript
describe('POST /api/v1/vendor-payments/:id/approve', () => {
  it('should approve a pending payment', async () => {
    const pendingPayment = {
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      status: 'pending', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };
    const approvedPayment = { ...pendingPayment, status: 'cleared', approved_by: USER_ID, approved_at: '2026-03-28T01:00:00Z' };

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
      reference_number: null, memo: null, approved_by: USER_ID, approved_at: '2026-03-28T01:00:00Z',
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };

    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [clearedPayment], rowCount: 1 }); // fetch payment

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/approve`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/only pending payments can be approved/i);
  });

  it('should return 404 when payment not found', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // fetch payment — not found

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
      reference_number: null, memo: null, approved_by: USER_ID, approved_at: '2026-03-28T01:00:00Z',
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };
    const allocations = [{ ap_invoice_id: AP_ID, allocated_amount: '500.00' }];
    const voidedPayment = { ...clearedPayment, status: 'void' };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [clearedPayment], rowCount: 1 }) // fetch payment
      .mockResolvedValueOnce({ rows: allocations, rowCount: 1 }) // fetch allocations
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '500.00', amount_due: '500.00', status: 'partial', invoice_amount: '1000.00', vendor_id: VENDOR_ID }], rowCount: 1 }) // updateAPBalance lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '0.00', amount_due: '1000.00', status: 'open', invoice_amount: '1000.00' }], rowCount: 1 }) // updateAPBalance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance restore
      .mockResolvedValueOnce({ rows: [voidedPayment], rowCount: 1 }) // UPDATE payment status
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/void`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('void');
  });

  it('should return 400 when payment is already void', async () => {
    const voidPaymentData = {
      id: PAYMENT_ID, status: 'void', vendor_id: VENDOR_ID,
      payment_number: 'PMT-2026-0001', total_amount: '500.00',
      payment_date: '2026-03-28', payment_method: 'check',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
    };

    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [voidPaymentData], rowCount: 1 }); // fetch payment — already void

    const res = await request(app)
      .post(`/api/v1/vendor-payments/${PAYMENT_ID}/void`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/payment cannot be voided/i);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -20
```

Expected: The approve/void tests fail with 501 (stub); createPayment tests still pass.

- [ ] **Step 3: Add approvePayment + voidPayment to the service**

Append to `backend/src/services/vendorPayments.service.ts`:

```typescript
export async function approvePayment(
  paymentId: string,
  userId: string
): Promise<VendorPayment> {
  // approvePayment is read-then-write but does not need to touch AP invoices,
  // so use pool.query for the fetch and pool.connect for the update
  const fetchResult = await pool.query(
    'SELECT * FROM vendor_payments WHERE id = $1',
    [paymentId]
  );
  if (fetchResult.rowCount === 0) {
    throw new Error('Payment not found');
  }
  const payment = fetchResult.rows[0] as VendorPayment;
  if (payment.status !== 'pending') {
    throw new Error('Only pending payments can be approved');
  }

  const updateResult = await pool.query(
    `UPDATE vendor_payments
     SET status = 'cleared', approved_by = $1, approved_at = NOW(), updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [userId, paymentId]
  );
  return updateResult.rows[0] as VendorPayment;
}

export async function voidPayment(paymentId: string): Promise<VendorPayment> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM vendor_payments WHERE id = $1',
      [paymentId]
    );
    if (fetchResult.rowCount === 0) {
      throw new Error('Payment not found');
    }
    const payment = fetchResult.rows[0] as VendorPayment;
    if (payment.status === 'void' || payment.status === 'cancelled') {
      throw new Error('Payment cannot be voided');
    }

    // Fetch allocations to reverse
    const allocResult = await client.query(
      'SELECT ap_invoice_id, allocated_amount FROM payment_allocations WHERE payment_id = $1',
      [paymentId]
    );

    let totalReversed = 0;
    for (const alloc of allocResult.rows) {
      const amount = parseFloat(alloc.allocated_amount);
      await updateAPBalance(client, alloc.ap_invoice_id, -amount);
      totalReversed += amount;
    }

    // Restore vendor balance
    if (totalReversed > 0) {
      await client.query(
        'UPDATE vendors SET current_balance = current_balance + $1 WHERE id = $2',
        [totalReversed, payment.vendor_id]
      );
    }

    // Mark payment void
    const updateResult = await client.query(
      `UPDATE vendor_payments SET status = 'void', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [paymentId]
    );

    await client.query('COMMIT');
    return updateResult.rows[0] as VendorPayment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 4: Replace approvePayment + voidPayment stubs in the controller**

In `backend/src/controllers/vendorPayments.controller.ts`, replace the two stub functions:

```typescript
export async function approvePayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const payment = await vpService.approvePayment(id, req.user!.userId);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function voidPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const payment = await vpService.voidPayment(id);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}
```

- [ ] **Step 5: Run all vendor payment tests to verify they pass**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -30
```

Expected: All tests pass (createPayment × 5, approve × 3, void × 2).

- [ ] **Step 6: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/services/vendorPayments.service.ts \
  backend/src/controllers/vendorPayments.controller.ts \
  backend/src/__tests__/integration/vendorPayments.api.test.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add approvePayment and voidPayment service + controller handlers"
```

---

## Task 4: listPayments + getPayment + updatePayment

**Files:**
- Modify: `backend/src/services/vendorPayments.service.ts` (add listPayments, getPayment, updatePayment)
- Modify: `backend/src/controllers/vendorPayments.controller.ts` (replace stubs)
- Modify: `backend/src/__tests__/integration/vendorPayments.api.test.ts` (add list/get/update tests)

- [ ] **Step 1: Add list/get/update tests**

Append to `backend/src/__tests__/integration/vendorPayments.api.test.ts`:

```typescript
describe('GET /api/v1/vendor-payments', () => {
  it('should list payments with pagination', async () => {
    const payments = [
      {
        id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
        payment_date: '2026-03-28', payment_method: 'check',
        total_amount: '500.00', status: 'pending',
        reference_number: null, memo: null, approved_by: null, approved_at: null,
        created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
      },
    ];

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
    const payment = {
      id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID,
      payment_date: '2026-03-28', payment_method: 'check',
      total_amount: '500.00', status: 'pending',
      reference_number: null, memo: null, approved_by: null, approved_at: null,
      created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z',
      vendor_number: 'VEND-000001', business_name: 'Test Vendor',
      alloc_id: 'alloc-1', ap_invoice_id: AP_ID, ap_number: 'AP-2026-0001',
      invoice_number: null, allocated_amount: '500.00', discount_taken: '0.00',
    };

    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [payment], rowCount: 1 });

    const res = await request(app).get(`/api/v1/vendor-payments/${PAYMENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PAYMENT_ID);
    expect(res.body.data.allocations).toBeDefined();
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

  it('should return 400 with no fields', async () => {
    const res = await request(app).put(`/api/v1/vendor-payments/${PAYMENT_ID}`).send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | grep -E "(PASS|FAIL|✓|✗|×)" | head -30
```

Expected: list/get/update tests fail with 501.

- [ ] **Step 3: Add listPayments, getPayment, updatePayment to the service**

Append to `backend/src/services/vendorPayments.service.ts`:

```typescript
export async function listPayments(query: VPListQuery): Promise<VPListResult> {
  const {
    vendor_id,
    status,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = query;

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendor_id) { conditions.push(`vendor_id = $${i++}`); params.push(vendor_id); }
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }
  if (start_date) { conditions.push(`payment_date >= $${i++}`); params.push(start_date); }
  if (end_date) { conditions.push(`payment_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM vendor_payments ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM vendor_payments ${where}
     ORDER BY payment_date DESC, created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  const totalAmount = dataResult.rows.reduce(
    (sum: number, p: any) => sum + parseFloat(p.total_amount || '0'),
    0
  );

  return {
    payments: dataResult.rows as VendorPayment[],
    total,
    total_amount: totalAmount,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getPayment(paymentId: string): Promise<VendorPaymentWithAllocations> {
  const result = await pool.query(
    `SELECT
       vp.*,
       v.vendor_number, v.business_name,
       pa.id AS alloc_id,
       pa.ap_invoice_id,
       ap.ap_number,
       ap.invoice_number,
       pa.allocated_amount,
       pa.discount_taken
     FROM vendor_payments vp
     JOIN vendors v ON v.id = vp.vendor_id
     LEFT JOIN payment_allocations pa ON pa.payment_id = vp.id
     LEFT JOIN accounts_payable ap ON ap.id = pa.ap_invoice_id
     WHERE vp.id = $1`,
    [paymentId]
  );

  if (result.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const first = result.rows[0];
  const payment: VendorPaymentWithAllocations = {
    id: first.id,
    payment_number: first.payment_number,
    vendor_id: first.vendor_id,
    payment_date: first.payment_date,
    payment_method: first.payment_method,
    reference_number: first.reference_number,
    total_amount: first.total_amount,
    status: first.status,
    memo: first.memo,
    approved_by: first.approved_by,
    approved_at: first.approved_at,
    created_by: first.created_by,
    created_at: first.created_at,
    updated_at: first.updated_at,
    vendor: {
      id: first.vendor_id,
      vendor_number: first.vendor_number,
      business_name: first.business_name,
    },
    allocations: result.rows
      .filter((r: any) => r.alloc_id !== null)
      .map((r: any) => ({
        id: r.alloc_id,
        ap_invoice_id: r.ap_invoice_id,
        ap_number: r.ap_number,
        invoice_number: r.invoice_number,
        allocated_amount: r.allocated_amount,
        discount_taken: r.discount_taken,
      })),
  };

  return payment;
}

export async function updatePayment(
  paymentId: string,
  data: UpdatePaymentInput
): Promise<VendorPayment> {
  const existing = await pool.query(
    'SELECT * FROM vendor_payments WHERE id = $1',
    [paymentId]
  );
  if (existing.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (data.payment_date !== undefined) { setClauses.push(`payment_date = $${i++}`); params.push(data.payment_date); }
  if (data.payment_method !== undefined) { setClauses.push(`payment_method = $${i++}`); params.push(data.payment_method); }
  if (data.reference_number !== undefined) { setClauses.push(`reference_number = $${i++}`); params.push(data.reference_number); }
  if (data.memo !== undefined) { setClauses.push(`memo = $${i++}`); params.push(data.memo); }

  setClauses.push(`updated_at = NOW()`);
  params.push(paymentId);

  const result = await pool.query(
    `UPDATE vendor_payments SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return result.rows[0] as VendorPayment;
}
```

- [ ] **Step 4: Replace the three stubs in the controller**

In `backend/src/controllers/vendorPayments.controller.ts`, replace the three stub functions with:

```typescript
export async function listPayments(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      vendor_id: req.query.vendor_id as string | undefined,
      status: req.query.status as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await vpService.listPayments(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  try {
    const payment = await vpService.getPayment(req.params.id);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  const parsed = UpdatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payment = await vpService.updatePayment(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}
```

- [ ] **Step 5: Run all vendor payment tests to verify they pass**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -30
```

Expected: All tests pass (createPayment × 5, approve × 3, void × 2, list × 3, get × 2, update × 2).

- [ ] **Step 6: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/services/vendorPayments.service.ts \
  backend/src/controllers/vendorPayments.controller.ts \
  backend/src/__tests__/integration/vendorPayments.api.test.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add listPayments, getPayment, updatePayment service + controller handlers"
```

---

## Task 5: Register VP routes + batch payment test + full test run

**Files:**
- Modify: `backend/src/routes/index.ts` (register VP routes)
- Modify: `backend/src/__tests__/integration/vendorPayments.api.test.ts` (add batch tests)

- [ ] **Step 1: Register vendor_payments routes in index.ts**

In `backend/src/routes/index.ts`, add the import and registration:

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

export default router;
```

- [ ] **Step 2: Add batch payment tests**

Append to `backend/src/__tests__/integration/vendorPayments.api.test.ts`:

```typescript
describe('POST /api/v1/vendor-payments/batch', () => {
  it('should create multiple payments in one transaction', async () => {
    const AP_ID_2 = '550e8400-e29b-41d4-a716-446655440401';

    // All DB calls within a single transaction for both payments
    mockClient.query
      // Payment 1: BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      // Payment 1: vendor check
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '2000.00' }], rowCount: 1 })
      // Payment 1: PMT number count
      .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 })
      // Payment 1: INSERT payment
      .mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID, payment_date: '2026-03-28', payment_method: 'check', total_amount: '300.00', status: 'pending', reference_number: null, memo: null, approved_by: null, approved_at: null, created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z' }], rowCount: 1 })
      // Payment 1 allocation: AP lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, vendor_id: VENDOR_ID, invoice_amount: '500.00', amount_paid: '0.00', amount_due: '500.00', status: 'open' }], rowCount: 1 })
      // Payment 1 allocation: INSERT allocation
      .mockResolvedValueOnce({ rows: [{ id: 'alloc-1' }], rowCount: 1 })
      // Payment 1 allocation: updateAPBalance lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '0.00', amount_due: '500.00', status: 'open', invoice_amount: '500.00', vendor_id: VENDOR_ID }], rowCount: 1 })
      // Payment 1 allocation: updateAPBalance UPDATE
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '300.00', amount_due: '200.00', status: 'partial' }], rowCount: 1 })
      // Payment 1: vendor balance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // Payment 2: vendor check
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '1700.00' }], rowCount: 1 })
      // Payment 2: PMT number count
      .mockResolvedValueOnce({ rows: [{ next_seq: 2 }], rowCount: 1 })
      // Payment 2: INSERT payment
      .mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440501', payment_number: 'PMT-2026-0002', vendor_id: VENDOR_ID, payment_date: '2026-03-28', payment_method: 'ach', total_amount: '200.00', status: 'pending', reference_number: null, memo: null, approved_by: null, approved_at: null, created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z' }], rowCount: 1 })
      // Payment 2 allocation: AP lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID_2, vendor_id: VENDOR_ID, invoice_amount: '400.00', amount_paid: '0.00', amount_due: '400.00', status: 'open' }], rowCount: 1 })
      // Payment 2 allocation: INSERT allocation
      .mockResolvedValueOnce({ rows: [{ id: 'alloc-2' }], rowCount: 1 })
      // Payment 2 allocation: updateAPBalance lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID_2, amount_paid: '0.00', amount_due: '400.00', status: 'open', invoice_amount: '400.00', vendor_id: VENDOR_ID }], rowCount: 1 })
      // Payment 2 allocation: updateAPBalance UPDATE
      .mockResolvedValueOnce({ rows: [{ id: AP_ID_2, amount_paid: '200.00', amount_due: '200.00', status: 'partial' }], rowCount: 1 })
      // Payment 2: vendor balance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // COMMIT
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/v1/vendor-payments/batch')
      .send({
        payments: [
          {
            vendor_id: VENDOR_ID,
            payment_date: '2026-03-28',
            payment_method: 'check',
            invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 300 }],
          },
          {
            vendor_id: VENDOR_ID,
            payment_date: '2026-03-28',
            payment_method: 'ach',
            invoice_allocations: [{ ap_invoice_id: AP_ID_2, allocated_amount: 200 }],
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].payment_number).toBe('PMT-2026-0001');
    expect(res.body.data[1].payment_number).toBe('PMT-2026-0002');
  });

  it('should rollback all payments when one fails', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: VENDOR_ID, business_name: 'Test Vendor', current_balance: '2000.00' }], rowCount: 1 }) // Payment 1: vendor check
      .mockResolvedValueOnce({ rows: [{ next_seq: 1 }], rowCount: 1 }) // Payment 1: PMT count
      .mockResolvedValueOnce({ rows: [{ id: PAYMENT_ID, payment_number: 'PMT-2026-0001', vendor_id: VENDOR_ID, payment_date: '2026-03-28', payment_method: 'check', total_amount: '300.00', status: 'pending', reference_number: null, memo: null, approved_by: null, approved_at: null, created_by: USER_ID, created_at: '2026-03-28T00:00:00Z', updated_at: '2026-03-28T00:00:00Z' }], rowCount: 1 }) // Payment 1: INSERT
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, vendor_id: VENDOR_ID, invoice_amount: '500.00', amount_paid: '0.00', amount_due: '500.00', status: 'open' }], rowCount: 1 }) // Payment 1: AP lock
      .mockResolvedValueOnce({ rows: [{ id: 'alloc-1' }], rowCount: 1 }) // Payment 1: INSERT alloc
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '0.00', amount_due: '500.00', status: 'open', invoice_amount: '500.00', vendor_id: VENDOR_ID }], rowCount: 1 }) // updateAPBalance lock
      .mockResolvedValueOnce({ rows: [{ id: AP_ID, amount_paid: '300.00', amount_due: '200.00', status: 'partial' }], rowCount: 1 }) // updateAPBalance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // vendor balance UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Payment 2: vendor check — not found
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    const res = await request(app)
      .post('/api/v1/vendor-payments/batch')
      .send({
        payments: [
          {
            vendor_id: VENDOR_ID,
            payment_date: '2026-03-28',
            payment_method: 'check',
            invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 300 }],
          },
          {
            vendor_id: 'nonexistent-vendor-id-0000',
            payment_date: '2026-03-28',
            payment_method: 'check',
            invoice_allocations: [{ ap_invoice_id: AP_ID, allocated_amount: 100 }],
          },
        ],
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/vendor not found/i);
  });
});
```

- [ ] **Step 3: Run all vendor payment tests**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --testPathPatterns="vendorPayments.api" --no-coverage 2>&1 | tail -30
```

Expected: All 19 tests pass.

- [ ] **Step 4: Run the full test suite to check for regressions**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx jest --no-coverage 2>&1 | tail -20
```

Expected: All existing tests still pass; no new failures in other test files.

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && \
  npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/routes/index.ts \
  backend/src/__tests__/integration/vendorPayments.api.test.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): register vendor-payments routes and add batch payment tests"
```

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Plan task |
|---|---|
| `POST /vendor-payments` — create with allocations, validate vendor + AP | Task 2 |
| `POST /vendor-payments/batch` — all-or-nothing transaction | Task 2 (batchPayments) + Task 5 |
| `GET /vendor-payments` — list with filters | Task 4 |
| `GET /vendor-payments/:id` — with vendor + allocations | Task 4 |
| `PUT /vendor-payments/:id` — editable fields only | Task 4 |
| `POST /vendor-payments/:id/approve` — pending → cleared | Task 3 |
| `POST /vendor-payments/:id/void` — reverse allocations, restore vendor balance | Task 3 |
| VP routes registered in `index.ts` | Task 5 |
| `generatePaymentNumber` → `PMT-YYYY-NNNN` | Task 2 |
| `updateAPBalance` imported from AP service | Task 2 |
| Error: vendor not found → 404 | Tasks 2–4 |
| Error: allocation exceeds amount_due → 400 | Task 2 |
| Error: invoice belongs to different vendor → 400 | Task 2 |
| Error: approve non-pending → 400 | Task 3 |
| Error: void already void/cancelled → 400 | Task 3 |

All 14 VP spec items covered. No gaps found.

**Placeholder scan:** No TBD, TODO, or incomplete sections.

**Type consistency:** `VendorPayment`, `VendorPaymentWithAllocations`, `CreatePaymentInput`, `UpdatePaymentInput`, `VPListQuery`, `VPListResult`, `BatchPaymentInput` — all defined in Task 1 types file and used consistently in Tasks 2–5. `updateAPBalance` signature `(client, apId, delta)` matches Part 1 definition.
