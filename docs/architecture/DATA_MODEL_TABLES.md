# Database Tables Reference

This is a comprehensive list of all database tables with descriptions and key fields. For complete SQL definitions, see the [schema/tables](../../schema/tables/) folder.

## Sales & Transactions (5 tables)

### Transactions
**File:** [schema/tables/transactions.sql](../../schema/tables/transactions.sql)

Main transaction records with multi-terminal support and offline sync capabilities. Supports draft, completed, voided, and refunded status.

**Key Fields:** `transaction_number`, `terminal_id`, `cashier_id`, `customer_id`, `subtotal`, `tax_amount`, `total_amount`, `status`, `is_synced`

---

### Transaction Items
**File:** [schema/tables/transaction_items.sql](../../schema/tables/transaction_items.sql)

Line items for transactions with historical product snapshots (JSONB) to preserve product details at time of sale.

**Key Fields:** `transaction_id`, `product_id`, `product_snapshot`, `quantity`, `unit_price`, `line_total`

---

### Payments
**File:** [schema/tables/payments.sql](../../schema/tables/payments.sql)

Payment processing with support for multiple processors (Square, Stripe) and split payments. Includes metadata for processor-specific data.

**Key Fields:** `transaction_id`, `payment_method`, `amount`, `payment_processor`, `processor_transaction_id`, `status`

---

### Payment Details
**File:** [schema/tables/payment_details.sql](../../schema/tables/payment_details.sql)

Additional payment details for cash (received/change), check (number), and card (last four digits, type) transactions.

**Key Fields:** `payment_id`, `check_number`, `cash_received`, `cash_change`, `card_last_four`, `card_type`

---

### Refunds
**File:** [schema/tables/refunds.sql](../../schema/tables/refunds.sql)

Refund processing linked to original transactions with processor integration.

**Key Fields:** `original_transaction_id`, `refund_transaction_id`, `refund_amount`, `refunded_by`, `processor_refund_id`

---

## Procurement (6 tables)

### Purchase Orders
**File:** [schema/tables/purchase_orders.sql](../../schema/tables/purchase_orders.sql)

Purchase order management with approval workflow. Supports purchase, donation, consignment, and transfer types.

**Key Fields:** `po_number`, `vendor_id`, `order_type`, `status`, `total_amount`, `payment_status`, `approved_by`

---

### Purchase Order Items
**File:** [schema/tables/purchase_order_items.sql](../../schema/tables/purchase_order_items.sql)

Line items for purchase orders with received quantity tracking. Includes generated column for pending quantity.

**Key Fields:** `purchase_order_id`, `product_id`, `quantity_ordered`, `quantity_received`, `quantity_pending` (generated), `unit_cost`

---

### Inventory Receiving
**File:** [schema/tables/inventory_receiving.sql](../../schema/tables/inventory_receiving.sql)

Goods receipt processing with quality control and donation tracking. Links to purchase orders for purchased goods.

**Key Fields:** `receiving_number`, `purchase_order_id`, `vendor_id`, `receiving_type`, `status`, `is_donation`, `fair_market_value`

---

### Receiving Items
**File:** [schema/tables/receiving_items.sql](../../schema/tables/receiving_items.sql)

Line-level receiving with condition tracking (new, like_new, good, fair, poor, damaged) and quality control.

**Key Fields:** `receiving_id`, `purchase_order_item_id`, `product_id`, `quantity_received`, `condition`, `accepted_quantity`, `rejected_quantity`

---

### Donations
**File:** [schema/tables/donations.sql](../../schema/tables/donations.sql)

Donation tracking with IRS compliance for non-profit organizations. Supports tax receipts, acknowledgments, and appraisal tracking for items over $5,000.

**Key Fields:** `donation_number`, `vendor_id`, `receiving_id`, `fair_market_value`, `tax_receipt_number`, `appraisal_required`

---

### Import Batches & Items
**Files:** [schema/tables/import_batches.sql](../../schema/tables/import_batches.sql), [schema/tables/import_batch_items.sql](../../schema/tables/import_batch_items.sql)

Track bulk import operations from CSV/Excel/JSON/XML files. Includes error logging and import summary.

**Key Fields:** `batch_number`, `vendor_id`, `import_type`, `total_records`, `successful_records`, `failed_records`, `error_log`

---

## Accounts Payable (3 tables)

### Accounts Payable
**File:** [schema/tables/accounts_payable.sql](../../schema/tables/accounts_payable.sql)

Invoice tracking and accounts payable management. Links to purchase orders and receiving records.

**Key Fields:** `ap_number`, `vendor_id`, `invoice_number`, `invoice_amount`, `amount_paid`, `amount_due` (generated), `due_date`, `status`

---

### Vendor Payments
**File:** [schema/tables/vendor_payments.sql](../../schema/tables/vendor_payments.sql)

Track payments made to vendors with multiple payment methods (check, ACH, wire, PayPal, etc.).

**Key Fields:** `payment_number`, `vendor_id`, `payment_amount`, `payment_method`, `check_number`, `transaction_reference`, `status`

---

### Payment Allocations
**File:** [schema/tables/payment_allocations.sql](../../schema/tables/payment_allocations.sql)

Link vendor payments to specific invoices. Supports split payments across multiple invoices.

**Key Fields:** `vendor_payment_id`, `accounts_payable_id`, `allocated_amount`

---

## Inventory Management (5 tables)

### Inventory Adjustments
**File:** [schema/tables/inventory_adjustments.sql](../../schema/tables/inventory_adjustments.sql)

Track all inventory quantity changes with audit trail. Supports multiple adjustment types: restock, damage, theft, correction, return, shrinkage, transfer, reconciliation.

**Key Fields:** `product_id`, `adjustment_type`, `quantity_change`, `quantity_before`, `quantity_after`, `reconciliation_id`, `adjusted_by`

---

### Inventory Count Sessions
**File:** [schema/tables/inventory_count_sessions.sql](../../schema/tables/inventory_count_sessions.sql)

Physical inventory count session management. Supports full counts, cycle counts, spot checks, and category counts. Includes blind count option.

**Key Fields:** `session_number`, `count_type`, `status`, `category_id`, `is_blind_count`, `started_by`

---

### Inventory Counts
**File:** [schema/tables/inventory_counts.sql](../../schema/tables/inventory_counts.sql)

Individual product counts with variance tracking. Includes recount workflow for discrepancies.

**Key Fields:** `count_session_id`, `product_id`, `system_quantity`, `counted_quantity`, `variance` (generated), `variance_cost`, `recount_required`

---

### Inventory Reconciliations
**File:** [schema/tables/inventory_reconciliations.sql](../../schema/tables/inventory_reconciliations.sql)

Reconciliation records linking counts to adjustments. Requires manager approval for inventory changes.

**Key Fields:** `reconciliation_number`, `count_session_id`, `status`, `items_with_variance`, `total_variance_cost`, `approved_by`

---

### Inventory Snapshots
**File:** [schema/tables/inventory_snapshots.sql](../../schema/tables/inventory_snapshots.sql)

Historical inventory levels for trend analysis. Supports daily, weekly, monthly, end-of-day, and reconciliation snapshots.

**Key Fields:** `product_id`, `quantity`, `value`, `snapshot_date`, `snapshot_type`

---

## Audit & Administration (3 tables)

### Price History
**File:** [schema/tables/price_history.sql](../../schema/tables/price_history.sql)

Audit trail for price changes with reason tracking.

**Key Fields:** `product_id`, `old_price`, `new_price`, `changed_by`, `reason`, `effective_date`

---

### Audit Log
**File:** [schema/tables/audit_log.sql](../../schema/tables/audit_log.sql)

Comprehensive audit trail for compliance and security. Tracks all sensitive operations with old/new values in JSONB format.

**Key Fields:** `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `terminal_id`

---

### System Settings
**File:** [schema/tables/system_settings.sql](../../schema/tables/system_settings.sql)

System configuration management. Supports string, number, boolean, and JSON value types. Optional encryption for sensitive settings.

**Key Fields:** `setting_key`, `setting_value`, `setting_type`, `is_encrypted`, `updated_by`

---

## Functions & Triggers

### Functions
**Location:** [schema/functions/](../../schema/functions/)

- `update_updated_at.sql` - Automatically updates updated_at timestamp
- `generate_transaction_number.sql` - Generates unique transaction numbers per terminal
- `update_inventory_on_transaction.sql` - Automatically deducts inventory on transaction completion

### Triggers
**Location:** [schema/triggers/](../../schema/triggers/)

- `update_timestamps.sql` - Applies update_updated_at to all relevant tables
- `update_inventory.sql` - Triggers inventory updates on transaction completion

### Views
**Location:** [schema/views/](../../schema/views/)

- `suppliers.sql` - Legacy view for backward compatibility with vendor table

---

**For complete SQL definitions and deployment instructions, see** [schema/README.md](../../schema/README.md)
