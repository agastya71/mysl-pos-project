# Inventory Receiving Design

**Date:** 2026-03-28
**Status:** Approved
**Backlog item:** B1

---

## Overview

Add the Inventory Receiving backend module — the system that records what physically arrives at the store from vendors, purchase orders, donations, and other sources. When a receiving is completed, it creates audit-trail `inventory_adjustments` records, updates product quantities, and (if linked to a PO) updates the purchase order's fulfillment status.

The database tables (`inventory_receiving`, `receiving_items`) already exist. This spec covers the service, controller, routes, and integration tests only.

---

## Architecture

Four new/modified files following the established module pattern:

- `backend/src/routes/receiving.routes.ts`
- `backend/src/controllers/receiving.controller.ts`
- `backend/src/services/receiving.service.ts`
- `backend/src/__tests__/integration/receiving.api.test.ts`

Registered in `backend/src/routes/index.ts` under `/api/v1/receiving`.

**One migration required:** The `inventory_adjustments.adjustment_type` CHECK constraint currently only allows `damage|theft|found|correction|initial`. A migration must extend it to include `receiving`:

```sql
ALTER TABLE inventory_adjustments
  DROP CONSTRAINT IF EXISTS inventory_adjustments_adjustment_type_check,
  ADD CONSTRAINT inventory_adjustments_adjustment_type_check
    CHECK (adjustment_type IN ('damage','theft','found','correction','initial','receiving'));
```

This migration lives in `backend/src/database/migrations/` following the existing timestamped naming convention.

---

## Endpoints

All routes require authentication (`authenticateToken`). Permissions follow the existing `requirePermission` pattern.

| Method | Path | Description | Permission |
|---|---|---|---|
| `GET` | `/api/v1/receiving` | List receivings | `receiving:read` |
| `GET` | `/api/v1/receiving/:id` | Get receiving with items | `receiving:read` |
| `POST` | `/api/v1/receiving` | Create receiving | `receiving:create` |
| `PUT` | `/api/v1/receiving/:id` | Update receiving metadata | `receiving:update` |
| `POST` | `/api/v1/receiving/:id/complete` | Complete receiving | `receiving:complete` |
| `POST` | `/api/v1/receiving/:id/cancel` | Cancel receiving | `receiving:cancel` |
| `POST` | `/api/v1/receiving/:id/items` | Add item to receiving | `receiving:update` |
| `PUT` | `/api/v1/receiving/items/:id` | Update a receiving item | `receiving:update` |
| `DELETE` | `/api/v1/receiving/items/:id` | Delete a receiving item | `receiving:update` |

**Route ordering note:** `/items/:id` routes and `/receiving/:id/complete` etc. must be registered before `/:id` to avoid Express treating `items` as an ID param.

---

## Request / Response Shapes

### Create Receiving (`POST /api/v1/receiving`)

```typescript
{
  vendor_id: string;           // UUID, required
  purchase_order_id?: string;  // UUID
  receiving_type: 'purchase' | 'donation' | 'consignment' | 'transfer' | 'adjustment';
  received_date?: string;      // ISO date, defaults to today
  shipping_carrier?: string;
  tracking_number?: string;
  packing_slip_number?: string;
  condition_notes?: string;
  internal_notes?: string;
  is_donation?: boolean;       // default false
}
```

### Update Receiving (`PUT /api/v1/receiving/:id`)

Same optional fields as create (all optional). Returns 400 if status is not `in_progress`.

### Add Item (`POST /api/v1/receiving/:id/items`)

```typescript
{
  product_id?: string;         // UUID — if known
  sku?: string;
  product_name: string;        // required
  category_id?: string;        // UUID
  quantity_received: number;   // positive integer, required
  accepted_quantity?: number;  // defaults to quantity_received
  rejected_quantity?: number;  // defaults to 0
  rejection_reason?: string;   // required if rejected_quantity > 0
  unit_cost?: number;
  fair_market_value?: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'damaged'; // required
  add_to_inventory?: boolean;  // default true
  notes?: string;
}
```

### Update Item (`PUT /api/v1/receiving/items/:id`)

Same fields as add item, all optional.

### Cancel (`POST /api/v1/receiving/:id/cancel`)

```typescript
{ reason: string; } // required
```

### Response shape (all endpoints)

```typescript
// Success
{ "success": true, "data": { ...receiving, items: [...] } }
{ "success": true, "data": { ...item } }  // for item endpoints

// Error
{ "success": false, "error": { "message": "...", "code": "SCREAMING_SNAKE" } }
```

### List response

```typescript
{
  "success": true,
  "data": {
    "receivings": [...],
    "total": 42,
    "page": 1,
    "pages": 3
  }
}
```

### List filters (query params)

`status`, `vendor_id`, `receiving_type`, `purchase_order_id`, `start_date`, `end_date`, `page` (default 1), `limit` (default 20)

---

## Business Logic

### Receiving number generation

Auto-generated on create: `RCV-YYYYMMDD-NNNN` (sequential within the day, zero-padded to 4 digits). Query `MAX(receiving_number)` filtered to today to get the next sequence number.

### Complete action (`POST /api/v1/receiving/:id/complete`)

Runs in a single database transaction:

1. Verify receiving exists and status is `in_progress`. Return 400 if already `completed` or `cancelled`.
2. Verify receiving has at least one item. Return 400 if no items.
3. For each item where `add_to_inventory = true` and `accepted_quantity > 0` and `product_id IS NOT NULL`:
   - Fetch current `products.quantity` (needed for `old_quantity`/`new_quantity`)
   - Update `products` SET `quantity = quantity + accepted_quantity`
   - Insert into `inventory_adjustments`: `adjustment_type = 'receiving'`, `quantity_change = accepted_quantity`, `old_quantity = (fetched)`, `new_quantity = old_quantity + accepted_quantity`, `reason = 'Inventory receiving: ' + receiving_number`, `adjusted_by = req.user.userId`, `adjustment_number = 'ADJ-' + uuid_prefix`, `product_id = item.product_id`
   - Set `receiving_items.inventory_added = true`
   - Items without a `product_id` still have `inventory_added` set to `false` — they are recorded as received but require manual product matching before inventory is updated.
4. Set `inventory_receiving.status = 'completed'`
5. If `purchase_order_id` is set, recalculate PO fulfillment:
   - Sum `accepted_quantity` across all completed receivings for this PO, grouped by `purchase_order_item_id`
   - Compare against each PO item's `quantity_ordered`
   - If all items fully received → set PO `status = 'received'`
   - If any items partially received → set PO `status = 'partially_received'`

### Cancel action (`POST /api/v1/receiving/:id/cancel`)

1. Verify status is `in_progress`. Return 400 if already `completed` or `cancelled`.
2. Set `status = 'cancelled'`, store reason in `internal_notes` (append, don't overwrite).

### Inventory update guard

Only update `products.quantity` and create an `inventory_adjustments` record when `product_id` is not null. Items received without a matched product (e.g., new items being catalogued) are recorded in `receiving_items` with `inventory_added = false` and require manual product matching after the fact.

---

## Permissions

Add these permissions to the seed data (role_permissions table):

| Permission | cashier | manager | admin |
|---|---|---|---|
| `receiving:read` | — | ✓ | ✓ |
| `receiving:create` | — | ✓ | ✓ |
| `receiving:update` | — | ✓ | ✓ |
| `receiving:complete` | — | ✓ | ✓ |
| `receiving:cancel` | — | ✓ | ✓ |

---

## Error Codes

| Code | HTTP | Condition |
|---|---|---|
| `RECEIVING_NOT_FOUND` | 404 | No receiving with that ID |
| `RECEIVING_ITEM_NOT_FOUND` | 404 | No item with that ID |
| `RECEIVING_ALREADY_COMPLETED` | 400 | Complete/update/cancel on completed receiving |
| `RECEIVING_ALREADY_CANCELLED` | 400 | Complete/update on cancelled receiving |
| `RECEIVING_NO_ITEMS` | 400 | Complete with zero items |
| `VENDOR_NOT_FOUND` | 400 | vendor_id does not exist |
| `PO_NOT_FOUND` | 400 | purchase_order_id does not exist |

---

## Testing

One integration test file: `backend/src/__tests__/integration/receiving.api.test.ts`

~25 tests following the established mock-database pattern (supertest + mocked pool):

**GET / list:** returns paginated list; empty result; filters applied to query.

**GET /:id:** returns receiving with items; 404 for unknown ID.

**POST / create:** success with all fields; success with minimal fields (vendor_id + receiving_type only); 400 missing vendor_id; 400 invalid receiving_type.

**PUT /:id update:** success; 400 when status is not `in_progress`.

**POST /:id/complete:** success (verifies inventory_adjustments insert called, product quantity updated, PO status updated); 400 when already completed; 400 when cancelled; 400 when no items.

**POST /:id/cancel:** success with reason; 400 missing reason; 400 when already completed.

**POST /:id/items:** success; 400 missing product_name; 400 invalid condition.

**PUT /items/:id:** success; 404 unknown item.

**DELETE /items/:id:** success; 404 unknown item.

---

## Out of Scope

- Receipt generation for donation-type receivings (covered by B2 — Donations)
- Frontend UI (covered by F-series backlog items)
- Real-time inventory sync across terminals (existing pattern: terminals poll on demand)
