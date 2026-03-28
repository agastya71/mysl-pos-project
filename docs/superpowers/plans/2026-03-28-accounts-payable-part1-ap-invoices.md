# Accounts Payable — Part 1: AP Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 7 AP invoice endpoints (create, list, get, update, cancel, aging report, due-this-week) including RBAC seed updates.

**Architecture:** New `accountsPayable.service.ts` + `accountsPayable.controller.ts` + `accounts_payable.routes.ts` following the exact same pattern as `purchaseOrder.service/controller/routes`. Tests mock the DB layer using `jest.mock('../../config/database')` — same as PO tests. `updateAPBalance` is exported from the service for use by Part 2 (vendor payments).

**Tech Stack:** Node.js 18, TypeScript strict, Express, Zod, pg, Jest + supertest.

---

## Worktree

All work is in: `/Users/u0102180/code/personal-projects/pos-feature-accounts-payable`
Branch: `feature/accounts-payable`
Git identity already set to `agastya71` / `1957442+agastya71@users.noreply.github.com`.

## File Map

| File | Action |
|---|---|
| `backend/src/types/accountsPayable.types.ts` | Create — TypeScript interfaces |
| `backend/src/services/accountsPayable.service.ts` | Create — all service functions + `updateAPBalance` |
| `backend/src/controllers/accountsPayable.controller.ts` | Create — Zod schemas + request handlers |
| `backend/src/routes/accounts_payable.routes.ts` | Create — 7 routes |
| `backend/src/routes/index.ts` | Modify — register AP routes |
| `backend/src/database/seed.ts` | Modify — add AP + VP permissions to `ROLE_PERMISSIONS` |
| `backend/src/__tests__/integration/accountsPayable.api.test.ts` | Create — integration tests |

---

## Task 1: Seed RBAC permissions + register route stub

**Files:**
- Modify: `backend/src/database/seed.ts`
- Modify: `backend/src/routes/index.ts`

These are infrastructure changes — no TDD needed since they're wiring, not logic.

- [ ] **Step 1: Add AP and VP permissions to ROLE_PERMISSIONS in seed.ts**

In `backend/src/database/seed.ts`, find the `ROLE_PERMISSIONS` constant. Add to the `manager` array and `admin` array:

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

- [ ] **Step 2: Register AP routes in index.ts**

In `backend/src/routes/index.ts`, add import and `router.use`:

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

export default router;
```

Note: `accounts_payable.routes.ts` does not exist yet — the app will fail to start until Task 4 creates it. That is expected and will be fixed in Task 4.

- [ ] **Step 3: Verify TypeScript compiles (excluding the missing routes file)**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep -v "accounts_payable.routes"
```

Expected: only error is `Cannot find module './accounts_payable.routes'` — all other files clean.

- [ ] **Step 4: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/database/seed.ts \
  backend/src/routes/index.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add AP/VP permissions to RBAC seed and register AP routes"
```

---

## Task 2: TypeScript types file

**Files:**
- Create: `backend/src/types/accountsPayable.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// backend/src/types/accountsPayable.types.ts

export interface APInvoice {
  id: string;
  ap_number: string;
  vendor_id: string;
  purchase_order_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string;
  status: 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  invoice_amount: string; // pg returns DECIMAL as string
  amount_paid: string;
  amount_due: string; // GENERATED ALWAYS AS (invoice_amount - amount_paid)
  discount_available: string;
  discount_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface APInvoiceWithDetails extends APInvoice {
  vendor: { id: string; business_name: string };
  purchase_order: { id: string; po_number: string } | null;
  payments: APPaymentSummary[];
}

export interface APPaymentSummary {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_method: string;
  payment_amount: string;
  status: string;
  allocated_amount: string;
  allocation_date: string;
}

export interface CreateInvoiceInput {
  vendor_id: string;
  purchase_order_id?: string;
  invoice_number?: string;
  invoice_date: string; // YYYY-MM-DD
  due_date: string;     // YYYY-MM-DD
  invoice_amount: number;
  discount_available?: number;
  discount_date?: string;
  payment_terms?: string;
  notes?: string;
  internal_notes?: string;
}

export interface UpdateInvoiceInput {
  due_date?: string;
  payment_terms?: string;
  discount_available?: number;
  discount_date?: string;
  notes?: string;
  internal_notes?: string;
}

export interface APListQuery {
  vendor_id?: string;
  status?: string;
  overdue?: string; // 'true' | 'false' from query string
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface APListResult {
  invoices: APInvoice[];
  total: number;
  total_due: number;
  overdue_total: number;
  page: number;
  pages: number;
}

export interface AgingBucket {
  vendor_id: string;
  vendor_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
}

export interface AgingReport {
  as_of_date: string;
  vendors: AgingBucket[];
  totals: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
    grand_total: number;
  };
}
```

- [ ] **Step 2: Verify TypeScript accepts the types**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep "accountsPayable.types"
```

Expected: no output (no errors in types file).

- [ ] **Step 3: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add backend/src/types/accountsPayable.types.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add AccountsPayable TypeScript types"
```

---

## Task 3: AP service — createInvoice + updateAPBalance

**Files:**
- Create: `backend/src/services/accountsPayable.service.ts` (partial — only createInvoice and updateAPBalance)

TDD: tests are written in Task 6. This task implements only. Later tasks will add more functions to the same file.

- [ ] **Step 1: Create the service file with createInvoice and updateAPBalance**

```typescript
// backend/src/services/accountsPayable.service.ts
import { PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  APInvoice,
  APInvoiceWithDetails,
  APListResult,
  APListQuery,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  AgingReport,
} from '../types/accountsPayable.types';

async function generateAPNumber(client: PoolClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ next_seq: string }>(
    `SELECT COUNT(*) + 1 AS next_seq
     FROM accounts_payable
     WHERE EXTRACT(year FROM created_at) = $1
     FOR UPDATE`,
    [year],
  );
  const seq = parseInt(result.rows[0].next_seq, 10);
  return `AP-${year}-${seq.toString().padStart(4, '0')}`;
}

/**
 * Updates amount_paid on an AP invoice and recalculates status.
 * delta is positive when applying a payment, negative when reversing.
 * Exported for use by vendorPayments.service.ts.
 */
export async function updateAPBalance(
  client: PoolClient,
  apId: string,
  delta: number,
): Promise<APInvoice> {
  const lockResult = await client.query<APInvoice>(
    'SELECT * FROM accounts_payable WHERE id = $1 FOR UPDATE',
    [apId],
  );
  if (lockResult.rowCount === 0) {
    throw new Error('Invoice not found');
  }
  const invoice = lockResult.rows[0];
  if (invoice.status === 'cancelled') {
    throw new Error('Cannot update balance of a cancelled invoice');
  }

  const newAmountPaid = parseFloat(invoice.amount_paid as unknown as string) + delta;
  const invoiceAmount = parseFloat(invoice.invoice_amount as unknown as string);
  const newStatus: APInvoice['status'] =
    newAmountPaid <= 0 ? 'open'
    : newAmountPaid >= invoiceAmount ? 'paid'
    : 'partial';

  const result = await client.query<APInvoice>(
    `UPDATE accounts_payable
     SET amount_paid = $1, status = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newAmountPaid, newStatus, apId],
  );
  return result.rows[0];
}

export async function createInvoice(
  userId: string,
  data: CreateInvoiceInput,
): Promise<APInvoice> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate vendor exists and is active
    const vendorResult = await client.query(
      'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
      [data.vendor_id],
    );
    if (vendorResult.rowCount === 0) {
      throw new Error('Vendor not found');
    }

    // Validate PO exists if provided
    if (data.purchase_order_id) {
      const poResult = await client.query(
        'SELECT id FROM purchase_orders WHERE id = $1',
        [data.purchase_order_id],
      );
      if (poResult.rowCount === 0) {
        throw new Error('Purchase order not found');
      }
    }

    const apNumber = await generateAPNumber(client);

    const result = await client.query<APInvoice>(
      `INSERT INTO accounts_payable (
        ap_number, vendor_id, purchase_order_id, invoice_number,
        invoice_date, due_date, invoice_amount,
        discount_available, discount_date, payment_terms,
        notes, internal_notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        apNumber,
        data.vendor_id,
        data.purchase_order_id ?? null,
        data.invoice_number ?? null,
        data.invoice_date,
        data.due_date,
        data.invoice_amount,
        data.discount_available ?? 0,
        data.discount_date ?? null,
        data.payment_terms ?? null,
        data.notes ?? null,
        data.internal_notes ?? null,
        userId,
      ],
    );

    // Increment vendor current_balance
    await client.query(
      'UPDATE vendors SET current_balance = current_balance + $1, updated_at = NOW() WHERE id = $2',
      [data.invoice_amount, data.vendor_id],
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep "accountsPayable.service"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add backend/src/services/accountsPayable.service.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): implement createInvoice and updateAPBalance"
```

---

## Task 4: AP service — getInvoice + listInvoices + updateInvoice + cancelInvoice

**Files:**
- Modify: `backend/src/services/accountsPayable.service.ts` (append functions)

- [ ] **Step 1: Append getInvoice to the service file**

```typescript
export async function getInvoice(id: string): Promise<APInvoiceWithDetails> {
  const result = await pool.query<APInvoice & {
    vendor: { id: string; business_name: string };
    purchase_order: { id: string; po_number: string } | null;
  }>(
    `SELECT ap.*,
            json_build_object('id', v.id, 'business_name', v.business_name) AS vendor,
            CASE WHEN ap.purchase_order_id IS NOT NULL
              THEN json_build_object('id', po.id, 'po_number', po.po_number)
              ELSE NULL
            END AS purchase_order
     FROM accounts_payable ap
     JOIN vendors v ON v.id = ap.vendor_id
     LEFT JOIN purchase_orders po ON po.id = ap.purchase_order_id
     WHERE ap.id = $1`,
    [id],
  );
  if (result.rowCount === 0) {
    throw new Error('Invoice not found');
  }

  const payments = await pool.query(
    `SELECT vp.id, vp.payment_number, vp.payment_date, vp.payment_method,
            vp.payment_amount, vp.status, pa.allocated_amount, pa.allocation_date
     FROM payment_allocations pa
     JOIN vendor_payments vp ON vp.id = pa.vendor_payment_id
     WHERE pa.accounts_payable_id = $1
     ORDER BY pa.allocation_date DESC`,
    [id],
  );

  return { ...result.rows[0], payments: payments.rows };
}

export async function listInvoices(query: APListQuery): Promise<APListResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (query.vendor_id) {
    conditions.push(`ap.vendor_id = $${p++}`);
    params.push(query.vendor_id);
  }
  if (query.status) {
    conditions.push(`ap.status = $${p++}`);
    params.push(query.status);
  }
  if (query.overdue === 'true') {
    conditions.push(`ap.due_date < CURRENT_DATE AND ap.status IN ('open','partial')`);
  }
  if (query.start_date) {
    conditions.push(`ap.invoice_date >= $${p++}`);
    params.push(query.start_date);
  }
  if (query.end_date) {
    conditions.push(`ap.invoice_date <= $${p++}`);
    params.push(query.end_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<{ count: string; total_due: string; overdue_total: string }>(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(ap.amount_due::numeric), 0) AS total_due,
            COALESCE(SUM(CASE WHEN ap.due_date < CURRENT_DATE AND ap.status IN ('open','partial') THEN ap.amount_due::numeric ELSE 0 END), 0) AS overdue_total
     FROM accounts_payable ap ${where}`,
    params,
  );

  const dataResult = await pool.query<APInvoice & { vendor_name: string }>(
    `SELECT ap.*, v.business_name AS vendor_name
     FROM accounts_payable ap
     JOIN vendors v ON v.id = ap.vendor_id
     ${where}
     ORDER BY ap.due_date ASC
     LIMIT $${p++} OFFSET $${p++}`,
    [...params, limit, offset],
  );

  const total = parseInt(countResult.rows[0].count, 10);
  return {
    invoices: dataResult.rows,
    total,
    total_due: parseFloat(countResult.rows[0].total_due),
    overdue_total: parseFloat(countResult.rows[0].overdue_total),
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceInput,
): Promise<APInvoice> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (data.due_date !== undefined) { fields.push(`due_date = $${p++}`); params.push(data.due_date); }
  if (data.payment_terms !== undefined) { fields.push(`payment_terms = $${p++}`); params.push(data.payment_terms); }
  if (data.discount_available !== undefined) { fields.push(`discount_available = $${p++}`); params.push(data.discount_available); }
  if (data.discount_date !== undefined) { fields.push(`discount_date = $${p++}`); params.push(data.discount_date); }
  if (data.notes !== undefined) { fields.push(`notes = $${p++}`); params.push(data.notes); }
  if (data.internal_notes !== undefined) { fields.push(`internal_notes = $${p++}`); params.push(data.internal_notes); }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query<APInvoice>(
    `UPDATE accounts_payable SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
    params,
  );
  if (result.rowCount === 0) {
    throw new Error('Invoice not found');
  }
  return result.rows[0];
}

export async function cancelInvoice(id: string, reason: string): Promise<APInvoice> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockResult = await client.query<APInvoice>(
      'SELECT * FROM accounts_payable WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (lockResult.rowCount === 0) {
      throw new Error('Invoice not found');
    }
    const invoice = lockResult.rows[0];
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new Error('Cannot cancel a paid or already cancelled invoice');
    }

    const result = await client.query<APInvoice>(
      `UPDATE accounts_payable
       SET status = 'cancelled',
           notes = COALESCE(notes || E'\\n', '') || $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [`Cancelled: ${reason}`, id],
    );

    // Decrement vendor balance by remaining amount_due
    const amountDue = parseFloat(invoice.amount_due as unknown as string);
    if (amountDue > 0) {
      await client.query(
        'UPDATE vendors SET current_balance = current_balance - $1, updated_at = NOW() WHERE id = $2',
        [amountDue, invoice.vendor_id],
      );
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep "accountsPayable.service"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add backend/src/services/accountsPayable.service.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): implement getInvoice, listInvoices, updateInvoice, cancelInvoice"
```

---

## Task 5: AP service — getAgingReport + getDueThisWeek

**Files:**
- Modify: `backend/src/services/accountsPayable.service.ts` (append)

- [ ] **Step 1: Append getAgingReport and getDueThisWeek**

```typescript
export async function getAgingReport(
  vendorId?: string,
  asOfDate?: string,
): Promise<AgingReport> {
  const dateParam = asOfDate ?? new Date().toISOString().split('T')[0];
  const params: unknown[] = [dateParam];
  const vendorFilter = vendorId ? `AND ap.vendor_id = $2` : '';
  if (vendorId) params.push(vendorId);

  const result = await pool.query<{
    vendor_id: string;
    vendor_name: string;
    current: string;
    days_1_30: string;
    days_31_60: string;
    days_61_90: string;
    days_90_plus: string;
    total: string;
  }>(
    `SELECT
       v.id AS vendor_id,
       v.business_name AS vendor_name,
       COALESCE(SUM(CASE WHEN ap.due_date >= $1::date THEN ap.amount_due::numeric ELSE 0 END), 0) AS current,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $1::date - INTERVAL '30 days' AND $1::date - INTERVAL '1 day' THEN ap.amount_due::numeric ELSE 0 END), 0) AS days_1_30,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $1::date - INTERVAL '60 days' AND $1::date - INTERVAL '31 days' THEN ap.amount_due::numeric ELSE 0 END), 0) AS days_31_60,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $1::date - INTERVAL '90 days' AND $1::date - INTERVAL '61 days' THEN ap.amount_due::numeric ELSE 0 END), 0) AS days_61_90,
       COALESCE(SUM(CASE WHEN ap.due_date < $1::date - INTERVAL '90 days' THEN ap.amount_due::numeric ELSE 0 END), 0) AS days_90_plus,
       COALESCE(SUM(ap.amount_due::numeric), 0) AS total
     FROM accounts_payable ap
     JOIN vendors v ON v.id = ap.vendor_id
     WHERE ap.status IN ('open', 'partial', 'overdue') ${vendorFilter}
     GROUP BY v.id, v.business_name
     ORDER BY v.business_name`,
    params,
  );

  const vendors = result.rows.map((r) => ({
    vendor_id: r.vendor_id,
    vendor_name: r.vendor_name,
    current: parseFloat(r.current),
    days_1_30: parseFloat(r.days_1_30),
    days_31_60: parseFloat(r.days_31_60),
    days_61_90: parseFloat(r.days_61_90),
    days_90_plus: parseFloat(r.days_90_plus),
    total: parseFloat(r.total),
  }));

  const totals = vendors.reduce(
    (acc, v) => ({
      current: acc.current + v.current,
      days_1_30: acc.days_1_30 + v.days_1_30,
      days_31_60: acc.days_31_60 + v.days_31_60,
      days_61_90: acc.days_61_90 + v.days_61_90,
      days_90_plus: acc.days_90_plus + v.days_90_plus,
      grand_total: acc.grand_total + v.total,
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, grand_total: 0 },
  );

  return { as_of_date: dateParam, vendors, totals };
}

export async function getDueThisWeek(): Promise<APInvoice[]> {
  const result = await pool.query<APInvoice>(
    `SELECT ap.*, v.business_name AS vendor_name
     FROM accounts_payable ap
     JOIN vendors v ON v.id = ap.vendor_id
     WHERE ap.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       AND ap.status IN ('open', 'partial', 'overdue')
     ORDER BY ap.due_date ASC`,
  );
  return result.rows;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1 | grep "accountsPayable.service"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add backend/src/services/accountsPayable.service.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): implement getAgingReport and getDueThisWeek"
```

---

## Task 6: AP controller + routes file

**Files:**
- Create: `backend/src/controllers/accountsPayable.controller.ts`
- Create: `backend/src/routes/accounts_payable.routes.ts`

- [ ] **Step 1: Create the controller file**

```typescript
// backend/src/controllers/accountsPayable.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import * as apService from '../services/accountsPayable.service';
import { ApiResponse } from '../types/api.types';

const CreateInvoiceSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  purchase_order_id: z.string().uuid('Invalid PO ID').optional(),
  invoice_number: z.string().max(100).optional(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  invoice_amount: z.number().positive('Invoice amount must be positive'),
  discount_available: z.number().nonnegative().optional(),
  discount_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_terms: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
});

const UpdateInvoiceSchema = z.object({
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_terms: z.string().max(50).optional(),
  discount_available: z.number().nonnegative().optional(),
  discount_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
});

const CancelInvoiceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export async function createInvoice(req: Request, res: Response): Promise<Response> {
  try {
    const data = CreateInvoiceSchema.parse(req.body);
    const invoice = await apService.createInvoice(req.user!.userId, data);
    return res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
}

export async function getInvoice(req: Request, res: Response): Promise<Response> {
  try {
    const invoice = await apService.getInvoice(req.params.id);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to get invoice' });
  }
}

export async function listInvoices(req: Request, res: Response): Promise<Response> {
  try {
    const query = {
      vendor_id: req.query.vendor_id as string | undefined,
      status: req.query.status as string | undefined,
      overdue: req.query.overdue as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };
    const result = await apService.listInvoices(query);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to list invoices' });
  }
}

export async function updateInvoice(req: Request, res: Response): Promise<Response> {
  try {
    const data = UpdateInvoiceSchema.parse(req.body);
    const invoice = await apService.updateInvoice(req.params.id, data);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error) {
      const status = error.message === 'Invoice not found' ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
}

export async function cancelInvoice(req: Request, res: Response): Promise<Response> {
  try {
    const { reason } = CancelInvoiceSchema.parse(req.body);
    const invoice = await apService.cancelInvoice(req.params.id, reason);
    return res.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    if (error instanceof Error) {
      const status = error.message === 'Invoice not found' ? 404 : 400;
      return res.status(status).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to cancel invoice' });
  }
}

export async function getAgingReport(req: Request, res: Response): Promise<Response> {
  try {
    const report = await apService.getAgingReport(
      req.query.vendor_id as string | undefined,
      req.query.as_of_date as string | undefined,
    );
    return res.json({ success: true, data: report });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate aging report' });
  }
}

export async function getDueThisWeek(req: Request, res: Response): Promise<Response> {
  try {
    const invoices = await apService.getDueThisWeek();
    return res.json({ success: true, data: invoices });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get due invoices' });
  }
}
```

- [ ] **Step 2: Create the routes file**

```typescript
// backend/src/routes/accounts_payable.routes.ts
import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as apController from '../controllers/accountsPayable.controller';

const router = Router();

router.use(authenticateToken);

// Static routes MUST come before /:id to avoid Express matching them as path params
router.get('/aging-report', requirePermission('accounts_payable', 'read'), apController.getAgingReport);
router.get('/due-this-week', requirePermission('accounts_payable', 'read'), apController.getDueThisWeek);

router.get('/', requirePermission('accounts_payable', 'read'), apController.listInvoices);
router.post('/', requirePermission('accounts_payable', 'create'), apController.createInvoice);
router.get('/:id', requirePermission('accounts_payable', 'read'), apController.getInvoice);
router.put('/:id', requirePermission('accounts_payable', 'update'), apController.updateInvoice);
router.post('/:id/cancel', requirePermission('accounts_payable', 'update'), apController.cancelInvoice);

export default router;
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/controllers/accountsPayable.controller.ts \
  backend/src/routes/accounts_payable.routes.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "feat(ap): add AP controller and routes (7 endpoints)"
```

---

## Task 7: AP integration tests

**Files:**
- Create: `backend/src/__tests__/integration/accountsPayable.api.test.ts`

Pattern: same as `purchaseOrder.api.test.ts` — mock `../../config/database` and `../../middleware/auth.middleware`, mount routes on express app, use supertest.

- [ ] **Step 1: Write the failing test file**

```typescript
// backend/src/__tests__/integration/accountsPayable.api.test.ts
import request from 'supertest';
import express from 'express';
import accountsPayableRoutes from '../../routes/accounts_payable.routes';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440200';
const TEST_VENDOR_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_INVOICE_ID = '550e8400-e29b-41d4-a716-446655440010';

const mockInvoice = {
  id: TEST_INVOICE_ID,
  ap_number: 'AP-2026-0001',
  vendor_id: TEST_VENDOR_ID,
  purchase_order_id: null,
  invoice_number: 'INV-001',
  invoice_date: '2026-03-28',
  due_date: '2026-04-28',
  status: 'open',
  invoice_amount: '1000.00',
  amount_paid: '0.00',
  amount_due: '1000.00',
  discount_available: '0.00',
  discount_date: null,
  payment_terms: 'net_30',
  notes: null,
  internal_notes: null,
  created_by: TEST_USER_ID,
  created_at: '2026-03-28T00:00:00Z',
  updated_at: '2026-03-28T00:00:00Z',
};

describe('Accounts Payable API', () => {
  let app: express.Application;
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeAll(() => {
    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { userId: TEST_USER_ID, username: 'testuser', role: 'admin' };
      next();
    });
    (requirePermission as jest.Mock).mockImplementation(() => (_req: any, _res: any, next: any) => next());

    app.use('/api/v1/accounts-payable', accountsPayableRoutes);
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    });
  });

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.restoreAllMocks());

  // ── POST /accounts-payable ──────────────────────────────────────────────────

  describe('POST /api/v1/accounts-payable', () => {
    it('creates invoice and returns 201', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })         // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: TEST_VENDOR_ID }], rowCount: 1 }) // vendor check
        .mockResolvedValueOnce({ rows: [{ next_seq: '1' }], rowCount: 1 })      // ap number
        .mockResolvedValueOnce({ rows: [mockInvoice], rowCount: 1 })            // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })         // update vendor balance
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });        // COMMIT

      const res = await request(app)
        .post('/api/v1/accounts-payable')
        .send({
          vendor_id: TEST_VENDOR_ID,
          invoice_date: '2026-03-28',
          due_date: '2026-04-28',
          invoice_amount: 1000,
          payment_terms: 'net_30',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ap_number).toBe('AP-2026-0001');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/accounts-payable')
        .send({ vendor_id: TEST_VENDOR_ID }); // missing invoice_date, due_date, invoice_amount

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
    });

    it('returns 400 for invalid uuid vendor_id', async () => {
      const res = await request(app)
        .post('/api/v1/accounts-payable')
        .send({ vendor_id: 'not-a-uuid', invoice_date: '2026-03-28', due_date: '2026-04-28', invoice_amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('returns 404 when vendor not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // vendor check → not found
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      const res = await request(app)
        .post('/api/v1/accounts-payable')
        .send({ vendor_id: TEST_VENDOR_ID, invoice_date: '2026-03-28', due_date: '2026-04-28', invoice_amount: 100 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Vendor not found');
    });
  });

  // ── GET /accounts-payable/:id ───────────────────────────────────────────────

  describe('GET /api/v1/accounts-payable/:id', () => {
    it('returns invoice with vendor and payments', async () => {
      const invoiceWithVendor = {
        ...mockInvoice,
        vendor: { id: TEST_VENDOR_ID, business_name: 'Test Vendor' },
        purchase_order: null,
      };
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [invoiceWithVendor], rowCount: 1 }) // main query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });                 // payments query

      const res = await request(app).get(`/api/v1/accounts-payable/${TEST_INVOICE_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ap_number).toBe('AP-2026-0001');
      expect(res.body.data.vendor.business_name).toBe('Test Vendor');
    });

    it('returns 404 for missing invoice', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).get(`/api/v1/accounts-payable/${TEST_INVOICE_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invoice not found');
    });
  });

  // ── GET /accounts-payable ───────────────────────────────────────────────────

  describe('GET /api/v1/accounts-payable', () => {
    it('returns paginated list', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1', total_due: '1000.00', overdue_total: '0.00' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockInvoice, vendor_name: 'Test Vendor' }], rowCount: 1 });

      const res = await request(app).get('/api/v1/accounts-payable');

      expect(res.status).toBe(200);
      expect(res.body.data.invoices).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('returns 401 without auth token', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((_req: any, res: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      const res = await request(app).get('/api/v1/accounts-payable');
      expect(res.status).toBe(401);
    });
  });

  // ── PUT /accounts-payable/:id ───────────────────────────────────────────────

  describe('PUT /api/v1/accounts-payable/:id', () => {
    it('updates editable fields', async () => {
      const updated = { ...mockInvoice, payment_terms: 'net_60' };
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const res = await request(app)
        .put(`/api/v1/accounts-payable/${TEST_INVOICE_ID}`)
        .send({ payment_terms: 'net_60' });

      expect(res.status).toBe(200);
      expect(res.body.data.payment_terms).toBe('net_60');
    });

    it('returns 400 when no fields provided', async () => {
      const res = await request(app)
        .put(`/api/v1/accounts-payable/${TEST_INVOICE_ID}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No fields to update');
    });
  });

  // ── POST /accounts-payable/:id/cancel ──────────────────────────────────────

  describe('POST /api/v1/accounts-payable/:id/cancel', () => {
    it('cancels an open invoice', async () => {
      const cancelled = { ...mockInvoice, status: 'cancelled' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })          // BEGIN
        .mockResolvedValueOnce({ rows: [mockInvoice], rowCount: 1 }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [cancelled], rowCount: 1 })  // UPDATE status
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })           // UPDATE vendor balance
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });          // COMMIT

      const res = await request(app)
        .post(`/api/v1/accounts-payable/${TEST_INVOICE_ID}/cancel`)
        .send({ reason: 'Duplicate invoice' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('returns 400 when cancelling a paid invoice', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // BEGIN
        .mockResolvedValueOnce({ rows: [paidInvoice], rowCount: 1 }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });           // ROLLBACK

      const res = await request(app)
        .post(`/api/v1/accounts-payable/${TEST_INVOICE_ID}/cancel`)
        .send({ reason: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot cancel a paid or already cancelled invoice');
    });

    it('returns 400 when reason is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts-payable/${TEST_INVOICE_ID}/cancel`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });
  });

  // ── GET /accounts-payable/aging-report ─────────────────────────────────────

  describe('GET /api/v1/accounts-payable/aging-report', () => {
    it('returns aging buckets grouped by vendor', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          vendor_id: TEST_VENDOR_ID,
          vendor_name: 'Test Vendor',
          current: '500.00',
          days_1_30: '200.00',
          days_31_60: '0.00',
          days_61_90: '0.00',
          days_90_plus: '300.00',
          total: '1000.00',
        }],
        rowCount: 1,
      });

      const res = await request(app).get('/api/v1/accounts-payable/aging-report');

      expect(res.status).toBe(200);
      expect(res.body.data.vendors).toHaveLength(1);
      expect(res.body.data.vendors[0].total).toBe(1000);
      expect(res.body.data.totals.grand_total).toBe(1000);
    });
  });

  // ── GET /accounts-payable/due-this-week ────────────────────────────────────

  describe('GET /api/v1/accounts-payable/due-this-week', () => {
    it('returns invoices due within 7 days', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockInvoice, due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0] }],
        rowCount: 1,
      });

      const res = await request(app).get('/api/v1/accounts-payable/due-this-week');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns empty array when none due', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app).get('/api/v1/accounts-payable/due-this-week');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npx jest --testPathPatterns="accountsPayable.api" 2>&1 | tail -25
```

Expected: all tests PASS. If any fail, check mock call order — `mockClient.query` calls must match the exact number of DB calls in the service function.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
cd /Users/u0102180/code/personal-projects/pos-feature-accounts-payable/backend && npm test 2>&1 | tail -15
```

Expected: all previously-passing tests still pass, plus new AP tests.

- [ ] **Step 4: Commit**

```bash
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable add \
  backend/src/__tests__/integration/accountsPayable.api.test.ts
git -C /Users/u0102180/code/personal-projects/pos-feature-accounts-payable commit -m "test(ap): add integration tests for all 7 AP invoice endpoints"
```
