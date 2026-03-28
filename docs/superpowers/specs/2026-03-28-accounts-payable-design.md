# Accounts Payable + Vendor Payments — Design Spec

**Date:** 2026-03-28
**Status:** Approved

---

## Goal

Implement the Accounts Payable (AP) and Vendor Payments backend: 14 REST endpoints covering invoice management, payment processing with invoice allocation, aging reports, and batch payments. The database schema and tables already exist; this spec covers the service/controller/route layers only.

---

## Scope

**In scope (14 endpoints):**
- 7 AP invoice endpoints: list, create, get, update, cancel, aging report, due-this-week
- 7 vendor payment endpoints: list, create, get, update, approve, void, batch

**Out of scope (deferred):**
- `GET /vendor-payments/:id/print-check` — PDF generation deferred to a future phase

---

## Architecture

### New files

| File | Responsibility |
|---|---|
| `backend/src/services/accountsPayable.service.ts` | AP CRUD, aging report, due-this-week, `updateAPBalance()` helper |
| `backend/src/services/vendorPayments.service.ts` | Payment CRUD, approve, void, batch — imports `updateAPBalance` |
| `backend/src/controllers/accountsPayable.controller.ts` | Zod validation + AP service calls |
| `backend/src/controllers/vendorPayments.controller.ts` | Zod validation + VP service calls |
| `backend/src/routes/accounts_payable.routes.ts` | 7 routes with `requirePermission` guards |
| `backend/src/routes/vendor_payments.routes.ts` | 7 routes with `requirePermission` guards |

### Modified files

| File | Change |
|---|---|
| `backend/src/routes/index.ts` | Register both new route files |
| `backend/src/database/seed.ts` | Add `accounts_payable` and `vendor_payments` permissions to `ROLE_PERMISSIONS` |

---

## API Endpoints

### Accounts Payable

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/accounts-payable` | `accounts_payable:read` | List invoices (paginated, filterable) |
| POST | `/api/v1/accounts-payable` | `accounts_payable:create` | Create invoice |
| GET | `/api/v1/accounts-payable/aging-report` | `accounts_payable:read` | Aging report |
| GET | `/api/v1/accounts-payable/due-this-week` | `accounts_payable:read` | Invoices due within 7 days |
| GET | `/api/v1/accounts-payable/:id` | `accounts_payable:read` | Get invoice + payments + allocations |
| PUT | `/api/v1/accounts-payable/:id` | `accounts_payable:update` | Update editable fields |
| POST | `/api/v1/accounts-payable/:id/cancel` | `accounts_payable:update` | Cancel invoice |

> Note: `/aging-report` and `/due-this-week` must be registered **before** `/:id` in the router to avoid Express matching them as ID params.

### Vendor Payments

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/vendor-payments` | `vendor_payments:read` | List payments (paginated, filterable) |
| POST | `/api/v1/vendor-payments` | `vendor_payments:create` | Create payment + allocations |
| POST | `/api/v1/vendor-payments/batch` | `vendor_payments:create` | Batch create payments |
| GET | `/api/v1/vendor-payments/:id` | `vendor_payments:read` | Get payment + allocations |
| PUT | `/api/v1/vendor-payments/:id` | `vendor_payments:update` | Update editable fields |
| POST | `/api/v1/vendor-payments/:id/approve` | `vendor_payments:approve` | Approve payment |
| POST | `/api/v1/vendor-payments/:id/void` | `vendor_payments:update` | Void payment + reverse allocations |

---

## Business Logic

### AP number generation

Within each create transaction, generate `AP-YYYY-NNNN`:

```sql
SELECT COUNT(*) + 1 AS next_seq
FROM accounts_payable
WHERE EXTRACT(year FROM created_at) = EXTRACT(year FROM NOW())
FOR UPDATE
```

Format as `AP-${year}-${seq.toString().padStart(4, '0')}`.

Same pattern for `PMT-YYYY-NNNN` in vendor payments.

### AP Invoice lifecycle

- **createInvoice**: validate vendor exists (and is active), validate PO exists if `purchaseOrderId` provided, generate `ap_number`, INSERT into `accounts_payable`, increment `vendors.current_balance += invoiceAmount` — all in one transaction
- **updateInvoice**: partial update of `due_date`, `payment_terms`, `discount_available`, `discount_date`, `notes`, `internal_notes` only — `invoice_amount` and `status` are not directly editable
- **cancelInvoice**: validates status is not already `paid` or `cancelled`, sets `status = 'cancelled'`, decrements `vendors.current_balance -= amount_due` (remaining unpaid balance)
- **getAgingReport**: single SQL query grouping unpaid invoices by vendor, bucketed by days overdue relative to `asOfDate` (defaults to today):
  - Current: `due_date >= asOfDate`
  - 1–30 days: `due_date BETWEEN asOfDate - 30 AND asOfDate - 1`
  - 31–60 days: `due_date BETWEEN asOfDate - 60 AND asOfDate - 31`
  - 61–90 days: `due_date BETWEEN asOfDate - 90 AND asOfDate - 61`
  - 90+ days: `due_date < asOfDate - 90`
- **getDueThisWeek**: `WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND status IN ('open', 'partial', 'overdue')`

### `updateAPBalance(client, apId, delta)` helper

Exported from `accountsPayable.service.ts`. Called inside vendor payment transactions.

```
amount_paid += delta  (delta is negative when reversing)
status = amount_paid <= 0      → 'open'
         0 < amount_paid < invoice_amount → 'partial'
         amount_paid >= invoice_amount    → 'paid'
```

Returns the updated AP row. Throws if AP invoice not found or is cancelled.

### Vendor Payment lifecycle

- **createPayment**: validate vendor exists, validate each AP invoice in `invoiceAllocations[]` exists and belongs to the same vendor, validate allocated amount does not exceed `amount_due` for each invoice, generate `payment_number`, INSERT payment with `status = 'pending'`, INSERT one `payment_allocations` row per invoice, call `updateAPBalance(client, apId, allocatedAmount)` for each, decrement `vendors.current_balance` by total allocated amount — all in one transaction
- **approvePayment**: validates `status = 'pending'`, sets `status = 'cleared'`, records `approved_by = userId`
- **voidPayment**: validates `status` is not already `void` or `cancelled`, sets `status = 'void'`, for each allocation calls `updateAPBalance(client, apId, -allocatedAmount)` to reverse, increments `vendors.current_balance` by total reversed amount — all in one transaction
- **batchPayments**: iterates `payments[]`, calls the full `createPayment` logic for each within a single outer transaction — all succeed or all rollback

### List query filters

**AP:** `vendorId`, `status`, `overdue` (boolean: `due_date < NOW() AND status IN ('open','partial')`), `startDate`/`endDate` (on `invoice_date`), `page`/`limit`

**Vendor Payments:** `vendorId`, `status`, `startDate`/`endDate` (on `payment_date`), `page`/`limit`

---

## RBAC — New Permissions

Add to `ROLE_PERMISSIONS` in `seed.ts`:

```
manager (additional):
  accounts_payable:create, accounts_payable:read, accounts_payable:update
  vendor_payments:create, vendor_payments:read, vendor_payments:update

admin (additional):
  vendor_payments:approve
```

Cashier has no access to AP or vendor payments.

---

## Error Handling

| Scenario | HTTP | Message |
|---|---|---|
| Zod validation failure | 400 | `'Validation error'` + details |
| Vendor not found / inactive | 404 | `'Vendor not found'` |
| Invoice not found | 404 | `'Invoice not found'` |
| Payment not found | 404 | `'Payment not found'` |
| Cancel paid/cancelled invoice | 400 | `'Cannot cancel a paid or already cancelled invoice'` |
| Void void/cancelled payment | 400 | `'Payment cannot be voided'` |
| Approve non-pending payment | 400 | `'Only pending payments can be approved'` |
| Allocation exceeds amount_due | 400 | `'Allocated amount exceeds invoice balance'` |
| AP invoice belongs to different vendor | 400 | `'Invoice does not belong to this vendor'` |
| Transaction failure | 500 | `'Internal server error'` |

---

## Testing

Two integration test files, real DB, seed vendor + optional PO in `beforeAll`:

### `accountsPayable.api.test.ts`
- Create invoice (valid, missing vendor, invalid vendorId format)
- Get invoice by ID (found, not found)
- List invoices (no filters, filter by vendorId, filter by status, filter overdue)
- Update invoice (editable fields, cannot update status directly)
- Cancel invoice (valid, already paid error, already cancelled error)
- Aging report (invoices across multiple age buckets)
- Due-this-week (only returns invoices in range)

### `vendorPayments.api.test.ts`
- Create payment with single allocation — verify AP `amount_paid` updated, status `partial` then `paid`
- Create payment with multiple allocations across invoices
- Create payment where allocation exceeds `amount_due` — expect 400
- Approve payment (valid, non-pending error)
- Void payment — verify AP balance reversed, vendor balance restored
- Batch create — all succeed; partial failure rolls back all
- List payments (filter by vendorId, status, date range)

---

## Sequence: AP balance update flow

```
POST /vendor-payments
  → validateVendor()
  → validateAllocations() [check amount_due for each]
  → INSERT vendor_payments (status=pending)
  → for each allocation:
      INSERT payment_allocations
      updateAPBalance(client, apId, amount)  ← imported from AP service
  → UPDATE vendors SET current_balance -= totalAllocated
  → COMMIT
```
