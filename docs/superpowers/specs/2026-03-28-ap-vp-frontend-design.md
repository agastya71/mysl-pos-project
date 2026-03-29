# Accounts Payable + Vendor Payments Frontend Design

**Date:** 2026-03-28
**Status:** Approved
**Backend:** PR #60 (14 endpoints, 36 integration tests — fully implemented)

---

## Overview

Build the frontend layer for Accounts Payable (AP) and Vendor Payments (VP) across both apps. The backend is complete; this spec covers all UI, Redux state, API services, and tests.

**Split responsibility:**
- **pos-client** (Electron): read/approve workflow for managers and admins
- **admin-dashboard** (React/Vite): full CRUD for administrators

---

## Navigation

Both apps get a **Finance** collapsible group in their sidebar containing two links: **Accounts Payable** and **Vendor Payments**.

- pos-client: Finance group added to existing sidebar nav (between Purchase Orders and Employees)
- admin-dashboard: Finance group added to `AppLayout.tsx` sidebar

**RBAC:** Both Finance pages are restricted to `manager` and `admin` roles. Cashiers are redirected away.

---

## pos-client — Pages and Components

### Accounts Payable (`/finance/accounts-payable`)

**`AccountsPayablePage.tsx`** — vendor summary list, read-only.

Columns: Vendor name, Outstanding balance, Oldest invoice date.

Clicking a vendor row opens `APVendorDetailModal.tsx` — shows all AP entries for that vendor: Invoice #, Amount, Due date, Status (open / paid / overdue). No actions in this modal.

### Vendor Payments (`/finance/vendor-payments`)

**`VendorPaymentsPage.tsx`** — paginated payment list.

Columns: Vendor, Amount, Payment method, Status (pending / cleared / voided), Date.

Action buttons per row (visible only when status is applicable):
- **Approve** (pending only) → opens `ApprovePaymentModal.tsx`: confirmation dialog, dispatches `POST /api/v1/vendor-payments/:id/approve`, refreshes list on success.
- **Void** (pending or cleared) → opens `VoidPaymentModal.tsx`: requires a reason field (text input, required), dispatches `POST /api/v1/vendor-payments/:id/void`, refreshes list on success.

### Redux + API (pos-client)

**Slices:**
- `store/accountsPayable.slice.ts` — state: `{ vendors: APSummary[], selectedVendorEntries: AccountsPayable[], loading: boolean, error: string | null }`
- `store/vendorPayments.slice.ts` — state: `{ payments: VendorPayment[], total: number, page: number, limit: number, loading: boolean, error: string | null }`

**API services:**
- `services/accountsPayable.api.ts`
  - `fetchAPSummary()` → `GET /api/v1/accounts-payable` — fetches all entries; the slice `accountsPayable.slice.ts` groups them client-side to produce the `APSummary[]` vendor list
  - `fetchAPByVendor(vendorId)` → `GET /api/v1/accounts-payable?vendor_id={id}`
- `services/vendorPayments.api.ts`
  - `fetchVendorPayments(params)` → `GET /api/v1/vendor-payments`
  - `approvePayment(id)` → `POST /api/v1/vendor-payments/{id}/approve`
  - `voidPayment(id, reason)` → `POST /api/v1/vendor-payments/{id}/void`

**Types:**
- `types/accountsPayable.types.ts` — `AccountsPayable`, `APSummary` (`{ vendor_id: string, vendor_name: string, total_outstanding: number, oldest_invoice_date: string }`), `APListQuery`
- `types/vendorPayments.types.ts` — `VendorPayment`, `VPListQuery`

---

## admin-dashboard — Pages and Components

### Accounts Payable (`/finance/accounts-payable`)

**`pages/AccountsPayable/APListPage.tsx`** — full AP entry list with filters (vendor, status, date range). Columns: Vendor, Reference #, Amount, Due date, Status.

Action buttons per row:
- **Edit** → opens `APFormModal.tsx` in edit mode
- **View** → opens `APDetailModal.tsx`
- **+ New Entry** button at top → opens `APFormModal.tsx` in create mode

**`APFormModal.tsx`** — create or update an AP entry. Fields: vendor (select), amount, due date, reference number (optional), notes (optional). Validates required fields before submit. Used for both create (`POST /api/v1/accounts-payable`) and update (`PUT /api/v1/accounts-payable/:id`).

**`APDetailModal.tsx`** — read-only AP entry detail. Shows all fields plus linked payment allocations (allocation amount, payment reference, payment date).

### Vendor Payments (`/finance/vendor-payments`)

**`pages/VendorPayments/VPListPage.tsx`** — payment list with filters (vendor, status, date range, method). Columns: Vendor, Amount, Method, Reference, Status, Date.

Action buttons:
- **Approve** (pending only) → `ApprovePaymentModal.tsx`
- **Void** → `VoidPaymentModal.tsx` (requires reason)
- **View** → `VPDetailModal.tsx` (read-only, shows allocations)
- **+ New Payment** button → opens `VPCreateModal.tsx`
- **Batch Payment** button → navigates to `/finance/vendor-payments/batch`

**`VPCreateModal.tsx`** — create a single payment. Fields: vendor (select), amount, payment method (check / ach / wire / cash), reference number (optional), memo (optional), AP entry to allocate against (select, optional).

**`VPBatchPage.tsx`** — dedicated page at `/finance/vendor-payments/batch`. Flow:
1. Select vendor (dropdown)
2. AP entries for that vendor load; user checks which to pay
3. Set payment method and reference number
4. Submit → `POST /api/v1/vendor-payments/batch`
5. On success: show summary of payments created, link back to VP list

**`ApprovePaymentModal.tsx`** — confirm approval dialog. Dispatches `POST /api/v1/vendor-payments/:id/approve`.

**`VoidPaymentModal.tsx`** — confirm void with required reason field. Dispatches `POST /api/v1/vendor-payments/:id/void`.

### Redux + API (admin-dashboard)

**Slices:**
- `store/accountsPayable.slice.ts` — state: `{ entries: AccountsPayable[], selected: AccountsPayable | null, total: number, page: number, loading: boolean, error: string | null }`
- `store/vendorPayments.slice.ts` — state: `{ payments: VendorPayment[], total: number, page: number, loading: boolean, error: string | null }`

**API services:**
- `services/ap.service.ts`
  - `fetchAPEntries(params)` → `GET /api/v1/accounts-payable`
  - `fetchAPEntry(id)` → `GET /api/v1/accounts-payable/:id`
  - `createAPEntry(data)` → `POST /api/v1/accounts-payable`
  - `updateAPEntry(id, data)` → `PUT /api/v1/accounts-payable/:id`
- `services/vp.service.ts`
  - `fetchVendorPayments(params)` → `GET /api/v1/vendor-payments`
  - `fetchVendorPayment(id)` → `GET /api/v1/vendor-payments/:id`
  - `createPayment(data)` → `POST /api/v1/vendor-payments`
  - `createBatchPayment(data)` → `POST /api/v1/vendor-payments/batch`
  - `approvePayment(id)` → `POST /api/v1/vendor-payments/:id/approve`
  - `voidPayment(id, reason)` → `POST /api/v1/vendor-payments/:id/void`
  - `updatePayment(id, data)` → `PUT /api/v1/vendor-payments/:id`

**Types:**
- `types/accountsPayable.types.ts` — `AccountsPayable`, `APListQuery`, `CreateAPInput`, `UpdateAPInput`
- `types/vendorPayments.types.ts` — `VendorPayment`, `VPListQuery`, `CreatePaymentInput`, `BatchPaymentInput`

**Navigation:** `AppRoutes.tsx` gets `/finance/accounts-payable` and `/finance/vendor-payments` and `/finance/vendor-payments/batch` routes.

---

## Data Flow

1. Page mounts → dispatches fetch thunk → thunk calls API service → on success updates slice state, on failure sets `error`.
2. Modal action (approve/void/create) → dispatches action thunk → on success dispatches list-refresh thunk + closes modal.
3. Pagination: `page` and `limit` stored in slice state; changing page re-dispatches the fetch thunk with updated params.

**Error handling:**
- List pages: dismissible error banner at top of page on fetch failure.
- Modals: inline error below submit button on action failure; modal stays open for retry.
- Submit buttons: disabled + spinner during pending API call (prevents double-submit).

---

## Testing

Four test files (Jest, unit-level, mocked API service):

- `pos-client/src/__tests__/accountsPayable.slice.test.ts` — reducer + thunks: fetch summary, fetch by vendor, loading/error states
- `pos-client/src/__tests__/vendorPayments.slice.test.ts` — fetch list, approve, void, pagination state
- `admin-dashboard/src/__tests__/accountsPayable.slice.test.ts` — fetch, create, update, loading/error states
- `admin-dashboard/src/__tests__/vendorPayments.slice.test.ts` — fetch, create, batch, approve, void, pagination state

Backend API correctness is covered by the 36 integration tests in PR #60 — no need to re-test here.

---

## Out of Scope

- AP entry deletion (not in backend API)
- Payment print/PDF (`GET /vendor-payments/:id/print-check` — deferred per D1 in BACKLOG.md)
- Real-time balance updates (page refresh is sufficient for local POS)
