# Donations Design

**Date:** 2026-03-29
**Status:** Approved
**Backlog item:** B2

---

## Overview

Add the Donations backend module — the system that records charitable donations received from vendors/donors, tracks IRS compliance (tax receipts, acknowledgments, appraisals), and provides annual summary reporting. Donations optionally link to `inventory_receiving` records so that donated goods flow through the standard receiving workflow.

The database table (`donations`) already exists. This spec covers the service, controller, routes, integration tests, a trigger for donation number generation, and seed permissions.

---

## Architecture

Four new files following the established module pattern:

- `backend/src/routes/donations.routes.ts`
- `backend/src/controllers/donations.controller.ts`
- `backend/src/services/donations.service.ts`
- `backend/src/__tests__/integration/donations.api.test.ts`

Registered in `backend/src/routes/index.ts` under `/api/v1/donations`.

**One schema addition required:** A trigger to auto-generate `donation_number` in `DON-YYYYMMDD-NNNN` format (same pattern as `RCV-` numbers), stored in:

- `schema/functions/generate_donation_number.sql`
- `schema/triggers/set_donation_number.sql`

---

## Endpoints

All routes require authentication (`authenticateToken`). Permissions follow the existing `requirePermission` pattern.

| Method | Path | Description | Permission |
|---|---|---|---|
| `GET` | `/api/v1/donations` | List donations | `donations:read` |
| `GET` | `/api/v1/donations/annual-summary/:vendorId/:year` | Annual summary for a donor | `donations:read` |
| `GET` | `/api/v1/donations/receipts/:donationNumber` | Get receipt info by donation number | `donations:read` |
| `GET` | `/api/v1/donations/:id` | Get donation with items | `donations:read` |
| `POST` | `/api/v1/donations` | Create donation | `donations:create` |
| `PUT` | `/api/v1/donations/:id` | Update donation metadata | `donations:update` |
| `POST` | `/api/v1/donations/:id/generate-receipt` | Generate receipt number, mark receipt sent | `donations:receipt` |
| `POST` | `/api/v1/donations/:id/send-receipt` | Record receipt delivery | `donations:receipt` |
| `POST` | `/api/v1/donations/:id/generate-acknowledgment` | Mark acknowledgment sent (IRS $250+ rule) | `donations:receipt` |

**Route ordering note:** `annual-summary/:vendorId/:year` and `receipts/:donationNumber` must be registered before `/:id` to prevent Express treating `annual-summary` or `receipts` as an ID param.

---

## Request / Response Shapes

### Create Donation (`POST /api/v1/donations`)

```typescript
{
  vendor_id: string;            // UUID, required — the donor
  donor_name: string;           // required
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;       // ISO date, defaults to today
  donation_type: 'goods' | 'cash' | 'mixed';  // required
  fair_market_value: number;    // required, >= 0
  cash_amount?: number;         // default 0
  tax_receipt_required?: boolean; // default true
  goods_services_provided?: boolean; // default false
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean; // default false
  notes?: string;
  internal_notes?: string;
  // Optional items — if provided, auto-creates linked inventory_receiving
  items?: Array<{
    product_id?: string;        // UUID
    sku?: string;
    product_name: string;       // required
    category_id?: string;
    quantity_received: number;  // positive integer
    fair_market_value?: number;
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'damaged';
    notes?: string;
  }>;
}
```

When `items` is provided:
1. Create `inventory_receiving` (type = `'donation'`, vendor_id, received_by, is_donation = true)
2. Insert each item into `receiving_items`
3. Set `donations.receiving_id` to the new receiving's ID
4. Set receiving status = `'completed'` and insert `inventory_adjustments` for each item where `product_id IS NOT NULL` (trigger auto-updates product quantity and generates adjustment_number — do NOT include those columns in the INSERT)

### Update Donation (`PUT /api/v1/donations/:id`)

All fields optional except cannot change `vendor_id`. Returns 400 if `tax_receipt_sent = true` (receipted donations are locked).

```typescript
{
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;
  donation_type?: 'goods' | 'cash' | 'mixed';
  fair_market_value?: number;
  cash_amount?: number;
  tax_receipt_required?: boolean;
  goods_services_provided?: boolean;
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean;
  appraiser_name?: string;
  appraisal_date?: string;
  notes?: string;
  internal_notes?: string;
}
```

### Generate Receipt (`POST /api/v1/donations/:id/generate-receipt`)

No request body required.

Generates a receipt number (`RCPT-YYYYMMDD-NNNN`), sets `tax_receipt_sent = true`, `tax_receipt_date = today`, stores `tax_receipt_number`. Returns the updated donation.

### Send Receipt (`POST /api/v1/donations/:id/send-receipt`)

```typescript
{ email?: string; method?: string; }  // both optional, just recorded for audit
```

Sets `tax_receipt_sent = true`, `tax_receipt_date = today` (if not already set). Records delivery metadata in `internal_notes`. Returns the updated donation.

### Generate Acknowledgment (`POST /api/v1/donations/:id/generate-acknowledgment`)

No request body required.

Sets `acknowledgment_sent = true`, `acknowledgment_date = today`. Returns the updated donation.

### List Filters (query params)

`vendor_id`, `donation_type`, `receipt_sent` (boolean), `start_date`, `end_date`, `page` (default 1), `limit` (default 20)

### Annual Summary (`GET /api/v1/donations/annual-summary/:vendorId/:year`)

Returns aggregated data:
```typescript
{
  vendor_id: string;
  year: number;
  total_donations: number;
  total_value: number;
  goods_donations: number;
  cash_donations: number;
  mixed_donations: number;
  receipts_sent: number;
  donations: Array<{ id, donation_number, donation_date, donation_type, fair_market_value, tax_receipt_sent }>;
}
```

### Receipt Lookup (`GET /api/v1/donations/receipts/:donationNumber`)

Returns the donation with receipt fields:
```typescript
{
  donation_number, donor_name, donation_date, fair_market_value,
  tax_receipt_number, tax_receipt_date, goods_services_provided,
  goods_services_value, acknowledgment_sent
}
```

### Response shape (all endpoints)

```typescript
// Success
{ "success": true, "data": { ...donation } }
{ "success": true, "data": { receivings: [...], total, page, pages } }  // list

// Error
{ "success": false, "error": { "message": "...", "code": "SCREAMING_SNAKE" } }
```

---

## Business Logic

### Donation number generation

Auto-generated trigger: `DON-YYYYMMDD-NNNN` (sequential within the day, zero-padded to 4 digits).

### Receipt number generation

Generated by the service at the time of `generate-receipt`: `RCPT-YYYYMMDD-NNNN` (sequential within the day). Query `MAX(tax_receipt_number)` filtered to today.

### Create with items

When `items` is provided in the create request:
1. Insert `inventory_receiving` (type=`'donation'`, `is_donation=true`, `vendor_id`, `received_by=userId`). Trigger auto-sets receiving_number.
2. Insert each item into `receiving_items` (`accepted_quantity = quantity_received`, `add_to_inventory = true`).
3. Update receiving totals (`total_items`, `total_quantity`, `total_value`) on `inventory_receiving`.
4. Set receiving `status = 'completed'`. For each item with `product_id IS NOT NULL`: fetch current `quantity_in_stock`, insert into `inventory_adjustments` (`adjustment_type='receiving'`, `quantity_change`, `old_quantity`, `new_quantity`, `reason='Donation: '+donation_number`, `adjusted_by=userId`). Triggers auto-update product stock and generate adjustment_number.
5. Set `donations.receiving_id = receiving.id` in the same transaction.

### Update guard

Donations with `tax_receipt_sent = true` cannot be updated. Return `DONATION_RECEIPTED` (400).

### Acknowledgment rule

The `generate-acknowledgment` endpoint is for IRS compliance — required for donations ≥ $250. The service does not enforce the $250 threshold (frontend can warn); it just marks `acknowledgment_sent = true`.

---

## Permissions

Add these permissions to the seed data:

| Permission | cashier | manager | admin |
|---|---|---|---|
| `donations:read` | — | ✓ | ✓ |
| `donations:create` | — | ✓ | ✓ |
| `donations:update` | — | ✓ | ✓ |
| `donations:receipt` | — | ✓ | ✓ |

---

## Error Codes

| Code | HTTP | Condition |
|---|---|---|
| `DONATION_NOT_FOUND` | 404 | No donation with that ID or number |
| `DONATION_RECEIPTED` | 400 | Update on receipted donation |
| `VENDOR_NOT_FOUND` | 400 | vendor_id does not exist |
| `RECEIPT_ALREADY_GENERATED` | 400 | generate-receipt on donation that already has a receipt number |

---

## Testing

One integration test file: `backend/src/__tests__/integration/donations.api.test.ts`

~28 tests following the established mock-database pattern (supertest + mocked pool):

**GET / list:** returns paginated list; empty result; filters applied.

**GET /annual-summary/:vendorId/:year:** returns aggregated summary.

**GET /receipts/:donationNumber:** returns receipt fields; 404 for unknown number.

**GET /:id:** returns donation with items; 404 for unknown ID.

**POST / create:** success with items (verifies receiving + items created); success without items; 400 missing vendor_id; 400 missing donor_name; 400 invalid donation_type.

**PUT /:id update:** success; 400 when already receipted.

**POST /:id/generate-receipt:** success; 400 when already has receipt number.

**POST /:id/send-receipt:** success.

**POST /:id/generate-acknowledgment:** success.

---

## Out of Scope

- PDF receipt generation (requires PDF library — deferred to D1 category)
- Email delivery (requires SMTP/email infra)
- Frontend UI
