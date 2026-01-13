# Data Model & Database Schema

**Part of:** [POS System Architecture](../ARCHITECTURE.md)
**Version:** 2.0
**Last Updated:** 2026-01-13

## Overview

This document contains the complete database schema for the POS system, including all tables, indexes, constraints, triggers, and functions. The system uses PostgreSQL 15+ as the primary database.

## Table Categories

The database is organized into the following functional areas:

1. **Core Product & Catalog** - Products, categories, vendors
2. **Sales & Transactions** - Transactions, payments, refunds
3. **Procurement** - Purchase orders, receiving, donations
4. **Accounts Payable** - Invoices, vendor payments
5. **Inventory Management** - Counts, reconciliations, adjustments, snapshots
6. **User & System** - Users, terminals, sessions, settings, audit logs

---

## Core Database Schema

### 1. Core Product & Catalog

#### Categories Table

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Hierarchical product categorization with support for nested categories.

#### Products Table

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    base_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    vendor_id UUID REFERENCES vendors(id), -- Primary vendor/supplier for this product
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_price CHECK (base_price >= 0),
    CONSTRAINT positive_stock CHECK (quantity_in_stock >= 0)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
```

**Purpose:** Core product catalog with pricing, inventory tracking, and vendor relationships.

#### Vendors Table

```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_type VARCHAR(50) NOT NULL,
    -- Types: supplier, consignment, individual_donor, corporate_donor, thrift_partner
    business_name VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- Tax and Payment Information
    tax_id VARCHAR(50), -- EIN or SSN (encrypted)
    payment_terms VARCHAR(50), -- net_30, net_60, cod, prepaid, donation
    payment_method VARCHAR(50), -- check, ach, wire, paypal, venmo, cash

    -- Banking Details (for payments)
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    routing_number VARCHAR(20),
    account_number VARCHAR(100), -- encrypted

    -- Donation-specific fields
    is_donor BOOLEAN DEFAULT false,
    donor_category VARCHAR(50), -- individual, corporate, foundation, estate
    tax_exempt BOOLEAN DEFAULT false,
    receives_receipts BOOLEAN DEFAULT true,
    total_donated_value DECIMAL(12,2) DEFAULT 0,
    total_donated_items INTEGER DEFAULT 0,

    -- General vendor fields
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    internal_notes TEXT, -- Private notes not shown to vendor
    preferred_vendor BOOLEAN DEFAULT false,
    vendor_rating INTEGER, -- 1-5 stars
    is_active BOOLEAN DEFAULT true,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_vendor_type CHECK (vendor_type IN ('supplier', 'consignment', 'individual_donor', 'corporate_donor', 'thrift_partner')),
    CONSTRAINT valid_payment_terms CHECK (payment_terms IN ('net_15', 'net_30', 'net_60', 'net_90', 'cod', 'prepaid', 'donation', 'consignment')),
    CONSTRAINT valid_rating CHECK (vendor_rating IS NULL OR (vendor_rating >= 1 AND vendor_rating <= 5))
);

CREATE INDEX idx_vendors_number ON vendors(vendor_number);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_is_donor ON vendors(is_donor);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_business_name ON vendors(business_name);

-- Legacy suppliers view for backwards compatibility
CREATE VIEW suppliers AS
SELECT
    id,
    business_name as name,
    contact_person,
    email,
    phone,
    CONCAT_WS(', ', address_line1, address_line2, city, state, zip_code) as address,
    is_active,
    created_at
FROM vendors;
```

**Purpose:** Enhanced vendor management supporting suppliers, donors, and consignment partners for non-profit operations.

---

### 2. System & Users

#### Terminals Table

```sql
CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_name VARCHAR(100) NOT NULL UNIQUE,
    terminal_number INTEGER NOT NULL UNIQUE,
    location VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    last_heartbeat_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** POS terminal registration and heartbeat tracking.

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- cashier, manager, admin
    assigned_terminal_id UUID REFERENCES terminals(id),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('cashier', 'manager', 'admin'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

**Purpose:** User management with role-based access control.

#### Customers Table

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
```

**Purpose:** Optional customer tracking for loyalty programs.

---

### 3. Sales & Transactions

#### Transactions Table

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    terminal_id UUID REFERENCES terminals(id) NOT NULL,
    cashier_id UUID REFERENCES users(id) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Status: draft, completed, voided, refunded, partially_refunded
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    voided_at TIMESTAMP,
    void_reason TEXT,
    voided_by UUID REFERENCES users(id),
    is_synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('draft', 'completed', 'voided', 'refunded', 'partially_refunded'))
);

CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_terminal ON transactions(terminal_id);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_sync ON transactions(is_synced);
```

**Purpose:** Main transaction records with multi-terminal support and offline sync capabilities.

#### Transaction Items Table

```sql
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_snapshot JSONB, -- Store product details at time of sale
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price >= 0)
);

CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);
```

**Purpose:** Line items for transactions with historical product snapshots.

#### Payments Table

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    -- Payment methods: cash, check, credit_card, debit_card, gift_card, digital_wallet
    amount DECIMAL(10, 2) NOT NULL,
    payment_processor VARCHAR(50), -- square, stripe, manual
    processor_transaction_id VARCHAR(255),
    processor_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, completed, failed, refunded, partially_refunded
    payment_date TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    metadata JSONB, -- Store processor-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'gift_card', 'digital_wallet')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded'))
);

CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_processor_id ON payments(processor_transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

**Purpose:** Payment processing with support for multiple processors and split payments.

#### Payment Details Table

```sql
CREATE TABLE payment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    check_number VARCHAR(50), -- For check payments
    cash_received DECIMAL(10, 2), -- For cash payments
    cash_change DECIMAL(10, 2), -- For cash payments
    card_last_four VARCHAR(4), -- For card payments
    card_type VARCHAR(20), -- visa, mastercard, amex, discover
    authorization_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Additional payment details for cash, check, and card transactions.

#### Refunds Table

```sql
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID REFERENCES transactions(id),
    refund_transaction_id UUID REFERENCES transactions(id),
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_reason TEXT,
    refunded_by UUID REFERENCES users(id),
    refund_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    processor_refund_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_refund_amount CHECK (refund_amount > 0)
);

CREATE INDEX idx_refunds_original_transaction ON refunds(original_transaction_id);
CREATE INDEX idx_refunds_date ON refunds(refund_date);
```

**Purpose:** Refund processing linked to original transactions.

---

### 4. Procurement System

#### Purchase Orders Table

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    -- Types: purchase, donation, consignment, transfer
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Status: draft, submitted, approved, partially_received, received, closed, cancelled

    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_date DATE,

    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    other_charges DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,

    shipping_address TEXT,
    billing_address TEXT,

    payment_terms VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    -- Status: unpaid, partial, paid, donation

    notes TEXT,
    internal_notes TEXT,

    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_po_order_type CHECK (order_type IN ('purchase', 'donation', 'consignment', 'transfer')),
    CONSTRAINT valid_po_status CHECK (status IN ('draft', 'submitted', 'approved', 'partially_received', 'received', 'closed', 'cancelled')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'donation', 'na'))
);

CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_type ON purchase_orders(order_type);
```

**Purpose:** Purchase order management with approval workflow.

#### Purchase Order Items Table

```sql
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

    -- Product details (for new items not yet in catalog)
    sku VARCHAR(100),
    product_name VARCHAR(255),
    product_description TEXT,

    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    quantity_pending INTEGER GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

    unit_cost DECIMAL(10,2) DEFAULT 0, -- Cost per unit (0 for donations)
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) DEFAULT 0,

    expected_delivery_date DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_quantity_ordered CHECK (quantity_ordered > 0),
    CONSTRAINT positive_unit_cost CHECK (unit_cost >= 0)
);

CREATE INDEX idx_po_items_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);
```

**Purpose:** Line items for purchase orders with received quantity tracking.

#### Inventory Receiving Table

```sql
CREATE TABLE inventory_receiving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    receiving_type VARCHAR(50) NOT NULL,
    -- Types: purchase, donation, consignment, transfer, adjustment

    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    -- Status: in_progress, completed, cancelled

    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users(id) NOT NULL,

    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0, -- 0 for donations

    shipping_carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    packing_slip_number VARCHAR(100),

    condition_notes TEXT, -- Condition of received items
    discrepancy_notes TEXT, -- Any discrepancies from PO
    internal_notes TEXT,

    -- Donation-specific fields
    is_donation BOOLEAN DEFAULT false,
    donation_receipt_sent BOOLEAN DEFAULT false,
    donation_receipt_number VARCHAR(50),
    donation_date DATE,
    fair_market_value DECIMAL(12,2), -- For donation receipts

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_receiving_type CHECK (receiving_type IN ('purchase', 'donation', 'consignment', 'transfer', 'adjustment')),
    CONSTRAINT valid_receiving_status CHECK (status IN ('in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_receiving_number ON inventory_receiving(receiving_number);
CREATE INDEX idx_receiving_purchase_order ON inventory_receiving(purchase_order_id);
CREATE INDEX idx_receiving_vendor ON inventory_receiving(vendor_id);
CREATE INDEX idx_receiving_date ON inventory_receiving(received_date);
CREATE INDEX idx_receiving_type ON inventory_receiving(receiving_type);
CREATE INDEX idx_receiving_is_donation ON inventory_receiving(is_donation);
```

**Purpose:** Goods receipt processing with quality control and donation tracking.

#### Receiving Items Table

```sql
CREATE TABLE receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_id UUID REFERENCES inventory_receiving(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id),
    product_id UUID REFERENCES products(id),

    -- Product details (for new items)
    sku VARCHAR(100),
    product_name VARCHAR(255),
    product_description TEXT,
    category_id UUID REFERENCES categories(id),

    quantity_received INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0, -- 0 for donations
    fair_market_value DECIMAL(10,2), -- Individual item value for donations
    condition VARCHAR(50), -- new, like_new, good, fair, poor
    line_total DECIMAL(10,2) DEFAULT 0,

    -- Quality control
    accepted_quantity INTEGER,
    rejected_quantity INTEGER,
    rejection_reason TEXT,

    add_to_inventory BOOLEAN DEFAULT true,
    inventory_added BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_quantity_received CHECK (quantity_received > 0),
    CONSTRAINT valid_item_condition CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor', 'damaged'))
);

CREATE INDEX idx_receiving_items_receiving ON receiving_items(receiving_id);
CREATE INDEX idx_receiving_items_po_item ON receiving_items(purchase_order_item_id);
CREATE INDEX idx_receiving_items_product ON receiving_items(product_id);
```

**Purpose:** Line-level receiving with condition tracking and quality control.

#### Donations Table

```sql
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL, -- The donor
    receiving_id UUID REFERENCES inventory_receiving(id), -- Link to actual receipt

    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    donation_type VARCHAR(50) NOT NULL,
    -- Types: goods, cash, mixed

    -- Donor information (may differ from vendor record)
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    donor_phone VARCHAR(20),
    donor_address TEXT,

    -- Donation details
    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    fair_market_value DECIMAL(12,2) NOT NULL, -- Total appraised value
    cash_amount DECIMAL(12,2) DEFAULT 0,

    -- Tax receipt information
    tax_receipt_required BOOLEAN DEFAULT true,
    tax_receipt_sent BOOLEAN DEFAULT false,
    tax_receipt_number VARCHAR(50),
    tax_receipt_date DATE,

    -- IRS compliance (for donations over $250)
    acknowledgment_sent BOOLEAN DEFAULT false,
    acknowledgment_date DATE,
    goods_services_provided BOOLEAN DEFAULT false, -- Did donor receive anything in return?
    goods_services_description TEXT,
    goods_services_value DECIMAL(12,2) DEFAULT 0,

    -- Appraisal (required for items over $5,000)
    appraisal_required BOOLEAN DEFAULT false,
    appraiser_name VARCHAR(255),
    appraisal_date DATE,
    appraisal_document_url VARCHAR(500),

    notes TEXT,
    internal_notes TEXT,

    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_donation_type CHECK (donation_type IN ('goods', 'cash', 'mixed')),
    CONSTRAINT positive_fmv CHECK (fair_market_value >= 0)
);

CREATE INDEX idx_donations_number ON donations(donation_number);
CREATE INDEX idx_donations_vendor ON donations(vendor_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_donations_receipt_sent ON donations(tax_receipt_sent);
```

**Purpose:** Donation tracking with IRS compliance for non-profit organizations.

---

### 5. Accounts Payable

#### Accounts Payable Table

```sql
CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ap_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    receiving_id UUID REFERENCES inventory_receiving(id),

    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'open',
    -- Status: open, partial, paid, overdue, cancelled, disputed

    invoice_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) GENERATED ALWAYS AS (invoice_amount - amount_paid) STORED,

    discount_available DECIMAL(12,2) DEFAULT 0,
    discount_date DATE, -- Last date to take discount

    payment_terms VARCHAR(50),

    notes TEXT,
    internal_notes TEXT,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_ap_status CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'cancelled', 'disputed')),
    CONSTRAINT positive_invoice_amount CHECK (invoice_amount > 0)
);

CREATE INDEX idx_accounts_payable_number ON accounts_payable(ap_number);
CREATE INDEX idx_accounts_payable_vendor ON accounts_payable(vendor_id);
CREATE INDEX idx_accounts_payable_po ON accounts_payable(purchase_order_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_invoice ON accounts_payable(invoice_number);
```

**Purpose:** Invoice tracking and accounts payable management.

#### Vendor Payments Table

```sql
CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    accounts_payable_id UUID REFERENCES accounts_payable(id),

    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL,
    -- Methods: check, ach, wire, credit_card, paypal, venmo, cash

    payment_amount DECIMAL(12,2) NOT NULL,
    discount_taken DECIMAL(12,2) DEFAULT 0,

    -- Payment details
    check_number VARCHAR(50),
    transaction_reference VARCHAR(255), -- ACH/Wire confirmation, PayPal transaction ID, etc.
    bank_account VARCHAR(100), -- Which account payment came from

    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, cleared, void, cancelled

    notes TEXT,

    processed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_payment_method CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'paypal', 'venmo', 'cash', 'other')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'cleared', 'void', 'cancelled')),
    CONSTRAINT positive_payment_amount CHECK (payment_amount > 0)
);

CREATE INDEX idx_vendor_payments_number ON vendor_payments(payment_number);
CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_ap ON vendor_payments(accounts_payable_id);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date);
CREATE INDEX idx_vendor_payments_status ON vendor_payments(status);
```

**Purpose:** Track payments made to vendors.

#### Payment Allocations Table

```sql
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_payment_id UUID REFERENCES vendor_payments(id) ON DELETE CASCADE,
    accounts_payable_id UUID REFERENCES accounts_payable(id) NOT NULL,

    allocated_amount DECIMAL(12,2) NOT NULL,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_allocated_amount CHECK (allocated_amount > 0)
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(vendor_payment_id);
CREATE INDEX idx_payment_allocations_ap ON payment_allocations(accounts_payable_id);
```

**Purpose:** Link vendor payments to specific invoices.

---

### 6. Inventory Management

#### Inventory Adjustments Table

```sql
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    adjustment_type VARCHAR(50) NOT NULL,
    -- Types: restock, damage, theft, correction, return, shrinkage, transfer, reconciliation
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    reference_number VARCHAR(100), -- PO number, transfer number, etc.
    reconciliation_id UUID REFERENCES inventory_reconciliations(id),
    adjusted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    adjustment_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_adjustment_type CHECK (adjustment_type IN ('restock', 'damage', 'theft', 'correction', 'return', 'shrinkage', 'transfer', 'reconciliation'))
);

CREATE INDEX idx_inventory_adjustments_product ON inventory_adjustments(product_id);
CREATE INDEX idx_inventory_adjustments_date ON inventory_adjustments(adjustment_date);
CREATE INDEX idx_inventory_adjustments_type ON inventory_adjustments(adjustment_type);
CREATE INDEX idx_inventory_adjustments_reconciliation ON inventory_adjustments(reconciliation_id);
```

**Purpose:** Track all inventory quantity changes with audit trail.

#### Inventory Count Sessions Table

```sql
CREATE TABLE inventory_count_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    count_type VARCHAR(50) NOT NULL,
    -- Types: full_count, cycle_count, spot_check, category_count
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    -- Status: in_progress, completed, cancelled, reconciled
    category_id UUID REFERENCES categories(id), -- For category-specific counts
    scheduled_date DATE,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    started_by UUID REFERENCES users(id),
    notes TEXT,
    is_blind_count BOOLEAN DEFAULT false, -- Hide system quantities from counters
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_count_type CHECK (count_type IN ('full_count', 'cycle_count', 'spot_check', 'category_count')),
    CONSTRAINT valid_session_status CHECK (status IN ('in_progress', 'completed', 'cancelled', 'reconciled'))
);

CREATE INDEX idx_count_sessions_status ON inventory_count_sessions(status);
CREATE INDEX idx_count_sessions_date ON inventory_count_sessions(scheduled_date);
CREATE INDEX idx_count_sessions_type ON inventory_count_sessions(count_type);
```

**Purpose:** Physical inventory count session management.

#### Inventory Counts Table

```sql
CREATE TABLE inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_session_id UUID REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    system_quantity INTEGER NOT NULL, -- Quantity per system at time of count
    counted_quantity INTEGER, -- Physical count
    variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_percentage DECIMAL(5,2), -- Calculated variance percentage
    variance_cost DECIMAL(10,2), -- Financial impact of variance
    counted_by UUID REFERENCES users(id),
    counted_at TIMESTAMP,
    recount_required BOOLEAN DEFAULT false,
    recount_quantity INTEGER,
    recount_by UUID REFERENCES users(id),
    recount_at TIMESTAMP,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    -- Status: pending, counted, verified, discrepancy
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_count_status CHECK (status IN ('pending', 'counted', 'verified', 'discrepancy'))
);

CREATE INDEX idx_inventory_counts_session ON inventory_counts(count_session_id);
CREATE INDEX idx_inventory_counts_product ON inventory_counts(product_id);
CREATE INDEX idx_inventory_counts_status ON inventory_counts(status);
CREATE INDEX idx_inventory_counts_variance ON inventory_counts(variance);
```

**Purpose:** Individual product counts with variance tracking.

#### Inventory Reconciliations Table

```sql
CREATE TABLE inventory_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_number VARCHAR(50) UNIQUE NOT NULL,
    count_session_id UUID REFERENCES inventory_count_sessions(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, approved, rejected, completed
    total_items_counted INTEGER NOT NULL,
    items_with_variance INTEGER NOT NULL,
    total_variance_cost DECIMAL(12,2) NOT NULL,
    variance_percentage DECIMAL(5,2),
    reconciliation_date TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_reconciliation_status CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))
);

CREATE INDEX idx_reconciliations_session ON inventory_reconciliations(count_session_id);
CREATE INDEX idx_reconciliations_status ON inventory_reconciliations(status);
CREATE INDEX idx_reconciliations_date ON inventory_reconciliations(reconciliation_date);
```

**Purpose:** Reconciliation records linking counts to adjustments.

#### Inventory Snapshots Table

```sql
CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    value DECIMAL(12,2) NOT NULL, -- Total value at snapshot time
    cost_price DECIMAL(10,2),
    snapshot_date TIMESTAMP NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL,
    -- Types: daily, weekly, monthly, end_of_day, reconciliation
    reference_id UUID, -- Reference to reconciliation or count session
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'end_of_day', 'reconciliation'))
);

CREATE INDEX idx_inventory_snapshots_product ON inventory_snapshots(product_id);
CREATE INDEX idx_inventory_snapshots_date ON inventory_snapshots(snapshot_date);
CREATE INDEX idx_inventory_snapshots_type ON inventory_snapshots(snapshot_type);
```

**Purpose:** Historical inventory levels for trend analysis.

---

### 7. Audit & Administration

#### Price History Table

```sql
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2) NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    effective_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_date ON price_history(effective_date);
```

**Purpose:** Audit trail for price changes.

#### Audit Log Table

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- login, logout, create_transaction, void_transaction, etc.
    entity_type VARCHAR(50), -- transaction, product, user, etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    terminal_id UUID REFERENCES terminals(id),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

**Purpose:** Comprehensive audit trail for compliance and security.

#### System Settings Table

```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
```

**Purpose:** System configuration management.

#### Sessions Table

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    terminal_id UUID REFERENCES terminals(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active, expires_at);
```

**Purpose:** Session management for authentication.

---

### 8. Bulk Import System

#### Import Batches Table

```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_format VARCHAR(20),

    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    skipped_records INTEGER,

    status VARCHAR(20) DEFAULT 'processing',
    -- Status: processing, completed, failed, cancelled

    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    imported_by UUID REFERENCES users(id),
    error_log JSONB,
    import_summary JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Track bulk import operations.

#### Import Batch Items Table

```sql
CREATE TABLE import_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER,

    status VARCHAR(20), -- success, error, skipped
    product_id UUID REFERENCES products(id),
    receiving_id UUID REFERENCES inventory_receiving(id),

    source_data JSONB, -- Original row data
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Track individual items within import batches.

---

## Database Triggers and Functions

### Update Timestamp Trigger

```sql
-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Transaction Number Generator

```sql
-- Function to generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number(terminal_num INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    trans_number VARCHAR;
    date_part VARCHAR;
    sequence_part INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');

    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 12) AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM transactions
    WHERE transaction_number LIKE terminal_num || '-' || date_part || '%';

    trans_number := terminal_num || '-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');

    RETURN trans_number;
END;
$$ LANGUAGE plpgsql;
```

### Inventory Update on Transaction Completion

```sql
-- Function to automatically update inventory on transaction completion
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Deduct inventory for each product in the transaction
        UPDATE products p
        SET quantity_in_stock = quantity_in_stock - ti.quantity
        FROM transaction_items ti
        WHERE ti.transaction_id = NEW.id
        AND ti.product_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_trigger AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_transaction();
```

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
