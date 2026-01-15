# Data Model & Database Schema

**Part of:** [POS System Architecture](../ARCHITECTURE.md)
**Version:** 2.0
**Last Updated:** 2026-01-15

## Overview

This document provides an overview of the database schema for the POS system. The system uses PostgreSQL 15+ as the primary database with 30 tables organized into functional areas.

**Note:** Complete SQL table definitions, functions, triggers, and views are located in the `/schema` folder at the project root. See [schema/README.md](../../schema/README.md) for detailed SQL files and deployment instructions.

## Table Categories

The database is organized into the following functional areas:

1. **Core Product & Catalog** (4 tables) - Products, categories, vendors
2. **System & Users** (4 tables) - Users, terminals, customers, sessions
3. **Sales & Transactions** (5 tables) - Transactions, payments, refunds
4. **Procurement** (6 tables) - Purchase orders, receiving, donations, bulk import
5. **Accounts Payable** (3 tables) - Invoices, vendor payments, allocations
6. **Inventory Management** (5 tables) - Counts, reconciliations, adjustments, snapshots
7. **Audit & Administration** (3 tables) - Price history, audit logs, system settings

---

## Table Descriptions

### 1. Core Product & Catalog

#### Categories
**File:** [schema/tables/categories.sql](../../schema/tables/categories.sql)

Hierarchical product categorization with support for nested categories. Includes display ordering and active/inactive status.

**Key Fields:**
- `id` (UUID) - Primary key
- `name` (VARCHAR) - Category name
- `parent_category_id` (UUID) - Self-reference for hierarchy
- `display_order` (INTEGER) - Sort order
- `is_active` (BOOLEAN) - Active status

---

#### Products
**File:** [schema/tables/products.sql](../../schema/tables/products.sql)

Core product catalog with pricing, inventory tracking, and vendor relationships. Supports SKU/barcode lookups, reorder levels, and product images.

**Key Fields:**
- `id` (UUID) - Primary key
- `sku` (VARCHAR) - Unique stock keeping unit
- `barcode` (VARCHAR) - Unique barcode
- `name` (VARCHAR) - Product name
- `category_id` (UUID) - Category reference
- `vendor_id` (UUID) - Primary vendor reference
- `base_price`, `cost_price` (DECIMAL) - Pricing
- `quantity_in_stock` (INTEGER) - Current inventory
- `reorder_level`, `reorder_quantity` (INTEGER) - Auto-reorder thresholds

---

#### Vendors
**File:** [schema/tables/vendors.sql](../../schema/tables/vendors.sql)

Enhanced vendor management supporting suppliers, donors, and consignment partners for non-profit operations. Includes payment terms, banking details (encrypted), and donation tracking.

**Key Fields:**
- `id` (UUID) - Primary key
- `vendor_number` (VARCHAR) - Unique vendor number
- `vendor_type` (VARCHAR) - supplier, consignment, individual_donor, corporate_donor, thrift_partner
- `business_name`, `contact_person`, `email`, `phone` - Contact information
- `payment_terms`, `payment_method` - Payment configuration
- `is_donor` (BOOLEAN) - Donor flag
- `total_donated_value`, `total_donated_items` - Donation tracking
- `tax_id`, `account_number` - Encrypted sensitive fields

**Note:** Legacy `suppliers` view available for backward compatibility ([schema/views/suppliers.sql](../../schema/views/suppliers.sql))

---

### 2. System & Users

#### Terminals
**File:** [schema/tables/terminals.sql](../../schema/tables/terminals.sql)

POS terminal registration and heartbeat tracking. Monitors terminal connectivity and synchronization status.

**Key Fields:**
- `id` (UUID) - Primary key
- `terminal_name` (VARCHAR) - Unique terminal name
- `terminal_number` (INTEGER) - Unique terminal number
- `ip_address`, `mac_address` - Network identification
- `last_sync_at`, `last_heartbeat_at` (TIMESTAMP) - Connectivity monitoring

---

#### Users
**File:** [schema/tables/users.sql](../../schema/tables/users.sql)

User management with role-based access control (cashier, manager, admin). Includes terminal assignment and login tracking.

**Key Fields:**
- `id` (UUID) - Primary key
- `username`, `email` (VARCHAR) - Unique identifiers
- `password_hash` (VARCHAR) - Hashed password
- `role` (VARCHAR) - cashier, manager, admin
- `assigned_terminal_id` (UUID) - Terminal assignment
- `last_login_at` (TIMESTAMP) - Login tracking

---

#### Customers
**File:** [schema/tables/customers.sql](../../schema/tables/customers.sql)

Optional customer tracking for loyalty programs. Tracks points and purchase history.

**Key Fields:**
- `id` (UUID) - Primary key
- `customer_number` (VARCHAR) - Unique customer number
- `email`, `phone` (VARCHAR) - Contact information
- `loyalty_points` (INTEGER) - Loyalty program points
- `total_spent` (DECIMAL) - Lifetime purchase value

---

#### Sessions
**File:** [schema/tables/sessions.sql](../../schema/tables/sessions.sql)

Session management for authentication with JWT token storage and activity tracking.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id`, `terminal_id` (UUID) - User and terminal references
- `session_token`, `refresh_token` (VARCHAR) - Authentication tokens
- `expires_at` (TIMESTAMP) - Expiration time
- `is_active` (BOOLEAN) - Active status

---


### 3. Sales & Transactions

For detailed table descriptions and SQL definitions, see [DATA_MODEL_TABLES.md](DATA_MODEL_TABLES.md#sales--transactions-5-tables).

**Tables:**
- **Transactions** ([schema/tables/transactions.sql](../../schema/tables/transactions.sql)) - Main transaction records with offline sync
- **Transaction Items** ([schema/tables/transaction_items.sql](../../schema/tables/transaction_items.sql)) - Line items with product snapshots
- **Payments** ([schema/tables/payments.sql](../../schema/tables/payments.sql)) - Payment processing with multiple processors
- **Payment Details** ([schema/tables/payment_details.sql](../../schema/tables/payment_details.sql)) - Additional payment details (cash/check/card)
- **Refunds** ([schema/tables/refunds.sql](../../schema/tables/refunds.sql)) - Refund processing

---

### 4. Procurement System

For detailed table descriptions and SQL definitions, see [DATA_MODEL_TABLES.md](DATA_MODEL_TABLES.md#procurement-6-tables).

**Tables:**
- **Purchase Orders** ([schema/tables/purchase_orders.sql](../../schema/tables/purchase_orders.sql)) - PO management with approval workflow
- **Purchase Order Items** ([schema/tables/purchase_order_items.sql](../../schema/tables/purchase_order_items.sql)) - PO line items with quantity tracking
- **Inventory Receiving** ([schema/tables/inventory_receiving.sql](../../schema/tables/inventory_receiving.sql)) - Goods receipt with quality control
- **Receiving Items** ([schema/tables/receiving_items.sql](../../schema/tables/receiving_items.sql)) - Receiving line items with condition tracking
- **Donations** ([schema/tables/donations.sql](../../schema/tables/donations.sql)) - Donation tracking with IRS compliance
- **Import Batches & Items** ([schema/tables/import_batches.sql](../../schema/tables/import_batches.sql)) - Bulk import tracking

---

### 5. Accounts Payable

For detailed table descriptions and SQL definitions, see [DATA_MODEL_TABLES.md](DATA_MODEL_TABLES.md#accounts-payable-3-tables).

**Tables:**
- **Accounts Payable** ([schema/tables/accounts_payable.sql](../../schema/tables/accounts_payable.sql)) - Invoice tracking and management
- **Vendor Payments** ([schema/tables/vendor_payments.sql](../../schema/tables/vendor_payments.sql)) - Payments to vendors
- **Payment Allocations** ([schema/tables/payment_allocations.sql](../../schema/tables/payment_allocations.sql)) - Payment-to-invoice allocation

---

### 6. Inventory Management

For detailed table descriptions and SQL definitions, see [DATA_MODEL_TABLES.md](DATA_MODEL_TABLES.md#inventory-management-5-tables).

**Tables:**
- **Inventory Adjustments** ([schema/tables/inventory_adjustments.sql](../../schema/tables/inventory_adjustments.sql)) - Quantity changes with audit trail
- **Inventory Count Sessions** ([schema/tables/inventory_count_sessions.sql](../../schema/tables/inventory_count_sessions.sql)) - Physical count session management
- **Inventory Counts** ([schema/tables/inventory_counts.sql](../../schema/tables/inventory_counts.sql)) - Individual product counts with variance
- **Inventory Reconciliations** ([schema/tables/inventory_reconciliations.sql](../../schema/tables/inventory_reconciliations.sql)) - Reconciliation records with approval
- **Inventory Snapshots** ([schema/tables/inventory_snapshots.sql](../../schema/tables/inventory_snapshots.sql)) - Historical inventory levels

---

### 7. Audit & Administration

For detailed table descriptions and SQL definitions, see [DATA_MODEL_TABLES.md](DATA_MODEL_TABLES.md#audit--administration-3-tables).

**Tables:**
- **Price History** ([schema/tables/price_history.sql](../../schema/tables/price_history.sql)) - Price change audit trail
- **Audit Log** ([schema/tables/audit_log.sql](../../schema/tables/audit_log.sql)) - Comprehensive system audit log
- **System Settings** ([schema/tables/system_settings.sql](../../schema/tables/system_settings.sql)) - System configuration

---

## Database Functions & Triggers

For complete SQL definitions, see:
- [schema/functions/](../../schema/functions/) - Database functions
- [schema/triggers/](../../schema/triggers/) - Database triggers
- [schema/views/](../../schema/views/) - Database views

### Functions

**update_updated_at** ([schema/functions/update_updated_at.sql](../../schema/functions/update_updated_at.sql))
- Automatically updates the `updated_at` timestamp on record updates

**generate_transaction_number** ([schema/functions/generate_transaction_number.sql](../../schema/functions/generate_transaction_number.sql))
- Generates unique transaction numbers per terminal
- Format: `{terminal}-{YYYYMMDD}-{sequence}`

**update_inventory_on_transaction** ([schema/functions/update_inventory_on_transaction.sql](../../schema/functions/update_inventory_on_transaction.sql))
- Automatically deducts inventory when transactions are completed

### Triggers

**update_timestamps** ([schema/triggers/update_timestamps.sql](../../schema/triggers/update_timestamps.sql))
- Applies the `update_updated_at` function to all tables with `updated_at` columns
- Tables: products, transactions, users, vendors, purchase_orders, and 15+ more

**update_inventory** ([schema/triggers/update_inventory.sql](../../schema/triggers/update_inventory.sql))
- Triggers inventory updates when transactions are completed

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  VENDORS    │────────>│  PRODUCTS   │<────────│ CATEGORIES  │
│             │         │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │                        │
      v                        v
┌─────────────┐         ┌─────────────┐
│  PURCHASE   │────────>│   P.O.      │
│  ORDERS     │         │   ITEMS     │
└─────────────┘         └─────────────┘
      │                        │
      v                        v
┌─────────────┐         ┌─────────────┐
│ INVENTORY   │────────>│  RECEIVING  │
│ RECEIVING   │         │   ITEMS     │
└─────────────┘         └─────────────┘
      │
      v
┌─────────────┐         ┌─────────────┐
│ DONATIONS   │         │ ACCOUNTS    │
│             │         │ PAYABLE     │
└─────────────┘         └─────────────┘
                               │
                               v
                        ┌─────────────┐
                        │   VENDOR    │
                        │  PAYMENTS   │
                        └─────────────┘
                               │
                               v
                        ┌─────────────┐
                        │  PAYMENT    │
                        │ ALLOCATIONS │
                        └─────────────┘
```

---

## Performance Considerations

### Indexing Strategy

1. **Primary Keys:** All tables use UUID primary keys for distributed system compatibility
2. **Foreign Keys:** Indexed automatically for join performance
3. **Search Fields:** SKU, barcode, email, phone indexed for quick lookups
4. **Date Ranges:** Transaction dates, order dates indexed for reporting
5. **Status Fields:** Indexed for filtering active/pending records

### Partitioning Recommendations

For high-volume tables (>10M rows):

```sql
-- Partition transactions by month
CREATE TABLE transactions_2026_01 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Partition audit_log by quarter
CREATE TABLE audit_log_2026_q1 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

### Query Optimization Tips

1. Use materialized views for complex reporting queries
2. Implement connection pooling (recommended: 20-50 connections)
3. Enable query result caching in Redis for frequently accessed data
4. Use EXPLAIN ANALYZE to identify slow queries
5. Regular VACUUM and ANALYZE maintenance

---

## Security Considerations

### Sensitive Data Encryption

Fields requiring encryption:
- `vendors.tax_id` - EIN/SSN
- `vendors.account_number` - Bank account numbers
- `vendors.routing_number` - Bank routing numbers

Use application-level encryption (AES-256) before storing.

### Row-Level Security

```sql
-- Example: Restrict terminal access to assigned users
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY terminal_access ON transactions
    FOR ALL
    TO authenticated_user
    USING (
        terminal_id IN (
            SELECT assigned_terminal_id
            FROM users
            WHERE id = current_user_id()
        )
    );
```

---

## Backup Strategy

### Daily Backups

```bash
# Full database backup
pg_dump -Fc pos_database > backup_$(date +%Y%m%d).dump

# Transaction log archiving for point-in-time recovery
```

### Replication

- **Primary-Replica Setup:** 1 primary + 2 replicas
- **Synchronous Replication:** For critical transactions
- **Asynchronous Replication:** For read-only reporting queries

---

## Migration Scripts

When deploying schema changes:

```sql
-- migration_v2.0_add_vendor_management.sql
BEGIN;

-- Add new columns
ALTER TABLE products ADD COLUMN vendor_id UUID REFERENCES vendors(id);

-- Create new tables
CREATE TABLE vendors (...);

-- Migrate existing data
INSERT INTO vendors (business_name, ...)
SELECT DISTINCT supplier_name, ...
FROM legacy_suppliers;

COMMIT;
```

---

## Related Documents

- [Main Architecture](../ARCHITECTURE.md) - System overview
- [API Endpoints](API_ENDPOINTS.md) - REST API specifications
- [Bulk Import System](BULK_IMPORT.md) - Vendor data import
- [Security & Deployment](SECURITY_DEPLOYMENT.md) - Security and infrastructure

---

**Document Version:** 2.0
**Last Updated:** 2026-01-13
**Maintained By:** Development Team
