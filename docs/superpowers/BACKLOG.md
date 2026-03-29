# POS Project Backlog

**Last updated:** 2026-03-29
**Purpose:** Living document tracking all remaining work. Update when a feature is completed or a new one is identified. Reference this before starting any new task.

---

## Completed (recent)

| PR | Feature |
|---|---|
| #57 | Security fixes: httpOnly cookies, RBAC payments, seed permissions |
| #58 | Fix: PO integration test mock setup |
| #59 | Seed full role-permission matrix (44 permissions across cashier/manager/admin) |
| #60 | Accounts payable + vendor payments — 14 backend endpoints, 36 integration tests |
| #61 | AP + VP frontend — Redux slices, API services, pages for pos-client + admin-dashboard |
| #62 | Inventory Receiving (B1) — 9 endpoints, trigger-based receiving numbers, PO fulfillment sync, 32 tests |

---

## Backlog

### Priority 1 — Backend: Major missing modules

These have zero implementation (no routes, service, or controller):

| ID | Feature | Spec reference | Notes |
|---|---|---|---|
| B2 | **Donations** | `docs/architecture/API_ENDPOINTS.md` — Donation Endpoints | Create, list, get, update; generate receipt, send receipt, acknowledgment, annual summary |
| B3 | **Bulk Import** | `docs/architecture/API_ENDPOINTS.md` + `BULK_IMPORT.md` | Import vendor inventory, batches, validate, execute, cancel, error-report, templates |
| B4 | **Shift Management** | Phase 4C employee plan | Clock-in, clock-out, current shift, list shifts (`/api/v1/shifts`) |

---

### Priority 2 — Backend: Missing endpoints on existing modules

| ID | Feature | File to modify | Notes |
|---|---|---|---|
| B5 | Product barcode lookup | `product.routes.ts` / `product.service.ts` | `GET /api/v1/products/barcode/:barcode` |
| B6 | Product SKU lookup | `product.routes.ts` / `product.service.ts` | `GET /api/v1/products/sku/:sku` |
| B7 | PO submit action | `purchaseOrder.routes.ts` / `purchaseOrder.service.ts` | `POST /api/v1/purchase-orders/:id/submit` (draft → submitted); currently only approve/receive/cancel/close exist |
| B8 | Vendor sub-endpoints | `vendor.routes.ts` / `vendor.service.ts` | `GET /vendors/:id/products`, `GET /vendors/:id/purchase-orders`, `GET /vendors/:id/balance` |
| B9 | Employee activity log | `employee.routes.ts` / `employee.service.ts` | `GET /api/v1/employees/:id/activity` — Phase 4B |
| B10 | Employee performance | `employee.routes.ts` / `employee.service.ts` | `GET /api/v1/employees/:id/performance` — Phase 4D |
| B11 | Auth verify token | `auth.routes.ts` / `auth.controller.ts` | `POST /api/v1/auth/verify` |
| B12 | Reconciliation GET caching | `reconciliation.service.ts` | Currently re-runs full calculation on every GET; should serve cached report |

---

### Priority 3 — Frontend: Missing pages/features

| ID | Feature | App | Notes |
|---|---|---|---|
| F3 | Shift management UI | pos-client | `MyShiftPage.tsx`, `ClockInOutButton.tsx`, `ShiftSummary.tsx` — Phase 4C |
| F4 | Employee detail sub-pages | pos-client | `EmployeeDetailsPage.tsx` with performance + activity tabs |
| F5 | Gift card management page | pos-client | Backend exists; no `GiftCardsPage.tsx` |
| F6 | Reconciliation page | pos-client | Backend exists; no frontend UI |
| F7 | Admin dashboard expansion | admin-dashboard | Currently only has Dashboard, Products, Reports, Transactions, Users — missing categories, inventory, vendors, POs, employees, roles, customers, AP/VP |

---

### Priority 4 — Explicitly deferred

These were intentionally deferred in specs; do not start without a new design session:

| ID | Feature | Deferred in |
|---|---|---|
| D1 | `GET /vendor-payments/:id/print-check` — PDF check printing | `2026-03-28-accounts-payable-design.md` |
| D2 | Phase 3E — Physical inventory counts UI | Phase 3 progress doc ("optional, can be deferred") |
| D3 | Donations system | Not yet specced |
| D4 | Mobile count app | `UI_UX_DESIGN.md` |

---

## How to use this document

1. Pick the highest-priority uncompleted item
2. Run `/brainstorm` to design it (or go straight to `/plan` if spec already exists)
3. When complete, move it to the Completed table above and update the date
4. Commit this file with every PR that completes a backlog item
