# Point of Sale Application - System Architecture

**Version:** 1.1
**Last Updated:** 2026-01-13
**Status:** Design Phase

## Table of Contents
- [System Overview](#system-overview)
  - [Inventory Reconciliation Flow](#inventory-reconciliation-flow)
- [Architecture Components](#architecture-components)
- [Technology Stack](#technology-stack-recommendations)
- [Core Modules](#core-modules)
  - [Inventory Management Service](#1-inventory-management-service)
  - [Transaction Service](#2-transaction-service)
  - [Payment Integration Service](#3-payment-integration-service)
  - [User & Authentication Service](#4-user--authentication-service)
  - [Reporting & Analytics Service](#5-reporting--analytics-service)
  - [Sync & Offline Service](#6-sync--offline-service)
- [Data Model](#data-model)
  - [Inventory Count & Reconciliation Tables](#inventory-count-sessions)
- [Payment Integration](#payment-integration-architecture)
- [POS Terminal Architecture](#pos-terminal-architecture)
- [Admin Dashboard](#admin-dashboard-features)
  - [Inventory Count & Reconciliation Features](#dashboard-structure)
- [API Endpoints](#api-endpoints)
  - [Inventory Count Endpoints](#inventory-count-endpoints)
  - [Inventory Reconciliation Endpoints](#inventory-reconciliation-endpoints)
  - [Inventory Analysis Endpoints](#inventory-analysis-endpoints)
- [Security](#security-considerations)
- [Deployment](#deployment-architecture)
- [Scalability](#scalability-considerations)
- [Implementation Roadmap](#implementation-roadmap)
- [Hardware Requirements](#hardware-requirements)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## System Overview

A distributed POS system with a central database, multiple client terminals, payment processing integration, administrative capabilities, and comprehensive inventory reconciliation system.

**Key System Capabilities:**
- Multi-terminal POS operations with offline support
- Real-time inventory tracking and management
- Integrated payment processing (Square, Stripe, PayPal)
- Physical inventory counting and reconciliation
- Variance detection and shrinkage analysis
- Automated inventory adjustments with approval workflows
- Comprehensive reporting and analytics
- Role-based access control and audit trails

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Dashboard                       │
│              (Web-based Management Console)              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   API Gateway / Load Balancer            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Server Layer               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   POS API    │  │  Admin API   │  │ Integration  │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │   Message    │  │
│  │   Database   │  │    Cache     │  │    Queue     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│                  POS Terminal Clients                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Terminal 1  │  │  Terminal 2  │  │  Terminal N  │  │
│  │  (Desktop)   │  │  (Desktop)   │  │  (Desktop)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              External Payment Services                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Square    │  │    Stripe    │  │    PayPal    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Inventory Reconciliation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVENTORY RECONCILIATION SYSTEM                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1. INITIATE COUNT SESSION                                        │
│    - Schedule count (full, cycle, spot check)                   │
│    - Assign counters                                             │
│    - Set count parameters (blind count option)                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PHYSICAL COUNT EXECUTION                                      │
│    ┌────────────────┐    ┌────────────────┐                    │
│    │ Mobile/Tablet  │    │ Desktop App    │                    │
│    │ Count App      │    │ Count Interface│                    │
│    │ - Scan barcode │    │ - Manual entry │                    │
│    │ - Enter count  │    │ - Search items │                    │
│    └────────────────┘    └────────────────┘                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. VARIANCE DETECTION                                            │
│    System compares:                                              │
│    - Physical Count vs System Quantity                           │
│    - Calculate variance (over/under)                             │
│    - Flag items exceeding threshold (e.g., >5%)                  │
│    - Calculate cost impact                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RECOUNT WORKFLOW (if needed)                                  │
│    - Items with high variance marked for recount                 │
│    - Different counter performs recount                          │
│    - Compare recount with original count                         │
│    - Resolve discrepancies                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. RECONCILIATION CREATION                                       │
│    Generate reconciliation record:                               │
│    - Summary of all variances                                    │
│    - Total cost impact                                           │
│    - Items requiring adjustment                                  │
│    - Audit trail                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. MANAGER REVIEW & APPROVAL                                     │
│    Manager actions:                                              │
│    - Review variance report                                      │
│    - Investigate significant discrepancies                       │
│    - Approve or reject adjustments                               │
│    - Add notes and reason codes                                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. AUTOMATIC ADJUSTMENT                                          │
│    If approved:                                                  │
│    - Create inventory adjustment records                         │
│    - Update product quantities in database                       │
│    - Log all changes with reason codes                           │
│    - Create inventory snapshot                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. POS INTEGRATION                                               │
│    Reconciliation impacts POS:                                   │
│    - Real-time inventory updates                                 │
│    - Accurate stock levels for sales                             │
│    - Low stock alerts triggered if needed                        │
│    - COGS calculations updated                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. ANALYTICS & REPORTING                                         │
│    Generate insights:                                            │
│    - Variance trends by product/category                         │
│    - Shrinkage analysis                                          │
│    - Inventory accuracy metrics                                  │
│    - High-risk product identification                            │
│    - Recommended count frequencies                               │
└─────────────────────────────────────────────────────────────────┘

CONTINUOUS CYCLE:
┌─────────────────────────────────────────────────────────────────┐
│ Daily POS Transactions                                           │
│ ↓                                                                │
│ Real-time inventory deduction                                    │
│ ↓                                                                │
│ Scheduled reconciliation counts                                  │
│ ↓                                                                │
│ Variance analysis and adjustment                                 │
│ ↓                                                                │
│ Updated inventory accuracy (back to POS)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Components

### Three-Tier Architecture

1. **Presentation Layer**
   - POS Terminal Client Applications (Electron-based desktop apps)
   - Admin Dashboard (Web application)
   - Customer Display (optional secondary display)

2. **Application Layer**
   - API Gateway (request routing, rate limiting, authentication)
   - POS Service (transaction processing, inventory queries)
   - Admin Service (reporting, management functions)
   - Payment Integration Service (payment processor abstraction)
   - Sync Service (offline transaction synchronization)

3. **Data Layer**
   - PostgreSQL (primary relational database)
   - Redis (caching, session management, pub/sub)
   - Message Queue (RabbitMQ/Redis for async operations)
   - Object Storage (S3 for receipts, reports, product images)

---

## Technology Stack Recommendations

### Backend Services
- **API Framework:** Node.js with Express.js or Python with FastAPI/Django REST Framework
- **Database:** PostgreSQL 15+ (primary) for ACID compliance and complex queries
- **Cache:** Redis 7+ for session management and frequently accessed data
- **Message Queue:** RabbitMQ or Redis Pub/Sub for real-time updates
- **API Gateway:** Kong, AWS API Gateway, or Nginx with Lua scripting
- **Authentication:** JWT tokens with refresh token rotation
- **ORM:** TypeORM (Node.js) or SQLAlchemy (Python)

### POS Terminal Client
- **Framework:** Electron (cross-platform desktop application)
- **UI Library:** React 18+ with TypeScript
- **UI Components:** Material-UI or Ant Design
- **State Management:** Redux Toolkit or Zustand
- **Offline Support:** IndexedDB (via Dexie.js) or SQLite
- **Barcode Scanner Integration:** Node.js USB libraries (node-usb, node-hid)
- **Printer Integration:** Electron printer APIs, ESC/POS protocol

### Admin Dashboard
- **Frontend:** React 18+ with TypeScript or Vue 3 with TypeScript
- **UI Framework:** Material-UI, Ant Design, or Vuetify
- **Data Visualization:** Chart.js, Recharts, or Apache ECharts
- **Real-time Updates:** WebSockets (Socket.io) or Server-Sent Events
- **State Management:** Redux Toolkit, Zustand, or Pinia (Vue)
- **Data Tables:** TanStack Table (React Table v8) or AG Grid

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Orchestration:** Kubernetes (production) or Docker Swarm
- **CI/CD:** GitHub Actions, GitLab CI, or Jenkins
- **Monitoring:** Prometheus + Grafana, Datadog, or New Relic
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana) or CloudWatch
- **Error Tracking:** Sentry

---

## Core Modules

### 1. Inventory Management Service

**Responsibilities:**
- Product catalog management (CRUD operations)
- SKU/Barcode management and validation
- Stock level tracking and real-time updates
- Low stock alerts and automated reorder points
- Product categorization and hierarchies
- Pricing management (base price, discounts, promotions)
- Product variants (size, color, etc.)
- Supplier management
- Inventory valuation (FIFO, LIFO, weighted average)
- **Physical inventory counts and tracking**
- **Inventory reconciliation (system vs physical counts)**
- **Shrinkage and variance analysis**
- **Inventory audit trails**
- **Cost of goods sold (COGS) tracking**

**Key Features:**
- Bulk import/export via CSV
- Barcode generation
- Image management
- Price history tracking
- Multi-location inventory support
- **Physical count interface with mobile support**
- **Automated reconciliation workflows**
- **Variance threshold alerts**
- **Batch reconciliation processing**
- **Inventory snapshots for historical analysis**

**Reconciliation Process:**
The inventory reconciliation system ensures accuracy between physical inventory and system records:

1. **Physical Count Initiation:**
   - Schedule counts (daily, weekly, monthly, annual)
   - Cycle counting by category or location
   - Spot checks for high-value items
   - Full inventory audits

2. **Count Execution:**
   - Mobile-friendly count interface
   - Barcode scanning for accuracy
   - Multiple counter assignment
   - Blind counts (hide system quantities)
   - Recount workflows for discrepancies

3. **Reconciliation Analysis:**
   - Automatic variance calculation
   - Threshold-based alerts (e.g., >5% variance)
   - Variance categorization (overage, shortage, damage)
   - Cost impact analysis
   - Trend analysis for recurring issues

4. **Adjustment Workflow:**
   - Manager approval for adjustments
   - Automatic inventory adjustment creation
   - Reason code requirements
   - Multi-level approval for large variances
   - Audit trail for all adjustments

5. **Integration with POS:**
   - Real-time inventory deduction on sale
   - Reserved inventory for pending transactions
   - Automatic restock on refunds/returns
   - Transaction-level inventory tracking
   - Daily reconciliation reports comparing sales to inventory changes

**POS-to-Inventory Data Flow:**

```
POS Transaction → Inventory Deduction → Reconciliation Check
     ↓                    ↓                      ↓
Complete Sale      Update Stock Level    Compare Expected vs Actual
     ↓                    ↓                      ↓
Receipt Generated  Log Transaction      Flag Discrepancies
     ↓                    ↓                      ↓
Customer Checkout  Create Snapshot      Trigger Count (if threshold met)
```

**Daily Reconciliation Process:**
- End-of-day snapshot captures current inventory state
- Compare beginning inventory + receipts - sales = expected ending inventory
- Compare expected inventory vs actual system inventory
- Generate variance report for items with discrepancies
- Recommend cycle counts for high-variance items

**Automated Triggers:**
- Inventory variance > threshold → trigger spot check
- High-value item sold → immediate stock verification
- Negative stock level → alert manager for investigation
- Multiple failed counts → flag for audit review

---

### 2. Transaction Service

**Responsibilities:**
- Transaction processing and validation
- Shopping cart management
- Payment orchestration
- Receipt generation (print and email)
- Transaction history and audit trail
- Refund/return processing
- Void transaction handling
- Split payment support
- Customer information capture

**Key Features:**
- Transaction state machine (draft → processing → completed/failed)
- Idempotent transaction processing
- Rollback mechanisms
- Transaction numbering (sequential, per-terminal)
- Tax calculation engine

---

### 3. Payment Integration Service

**Responsibilities:**
- Square API integration (primary)
- Stripe integration (optional backup)
- Multiple payment method support:
  - Cash (with change calculation)
  - Check (with check number recording)
  - Credit/Debit cards (via Square Terminal)
  - Digital wallets (Apple Pay, Google Pay)
  - Gift cards
  - Split payments
- Payment status tracking and reconciliation
- Settlement reconciliation
- Payment method tokenization
- PCI compliance handling (delegated to Square)
- Refund and chargeback processing

**Key Features:**
- Payment abstraction layer for easy provider switching
- Retry logic for failed payments
- Payment event webhooks
- End-of-day settlement reports

---

### 4. User & Authentication Service

**Responsibilities:**
- User authentication (cashiers, managers, admins)
- Role-based access control (RBAC)
- Permission management (granular permissions)
- Session management and token handling
- Password policies and reset workflows
- Multi-factor authentication (optional)
- User activity tracking
- Audit logging
- Terminal assignment and restrictions

**Roles:**
- **Cashier:** Process transactions, view product catalog
- **Manager:** Cashier permissions + refunds, reports, inventory adjustments
- **Admin:** Full system access, user management, system configuration

---

### 5. Reporting & Analytics Service

**Responsibilities:**
- Sales reports (daily, weekly, monthly, custom date ranges)
- Inventory reports (stock levels, movement, valuation)
- Employee performance metrics
- Payment method analysis
- Product performance analytics
- Revenue and profit analysis
- Tax reports
- Forecasting and trend analysis
- Export capabilities (PDF, Excel, CSV)
- **Inventory reconciliation reports**
- **Variance and shrinkage analysis**
- **Inventory accuracy metrics**
- **Cost of goods sold (COGS) reporting**
- **Inventory turnover analysis**

**Report Types:**
- Dashboard summaries
- Detailed transaction reports
- Inventory movement reports
- Sales by category/product/cashier/terminal
- Hourly sales patterns
- Refund and void reports
- Payment reconciliation reports
- **Physical inventory count reports**
- **Variance analysis reports**
- **Shrinkage reports by category/product**
- **Inventory accuracy scorecards**
- **Reconciliation audit trails**
- **Cost impact analysis**
- **Inventory health dashboards**

**Reconciliation-Specific Analytics:**
- Variance trends over time
- Accuracy rates by counter/category
- High-risk product identification
- Seasonal variance patterns
- Impact of inventory counts on stock accuracy
- Recommended count frequencies
- Automated alert generation for threshold breaches

---

### 6. Sync & Offline Service

**Responsibilities:**
- Offline transaction queuing
- Background data synchronization
- Conflict resolution (timestamp-based or last-write-wins)
- Network status monitoring
- Delta sync for product catalog
- Cache invalidation strategies
- Optimistic UI updates

**Key Features:**
- Automatic reconnection handling
- Progressive sync (prioritize critical data)
- Conflict resolution UI for managers
- Sync status indicators
- Manual sync trigger

---

## Data Model

### Core Database Schema

```sql
-- Categories
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

-- Products
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
    supplier_id UUID REFERENCES suppliers(id),
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

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Terminals
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

-- Users (Cashiers, Managers, Admins)
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

-- Customers (optional for loyalty programs)
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

-- Transactions
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

-- Transaction Items
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

-- Payments
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

-- Payment Details (for cash and check)
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

-- Refunds
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

-- Inventory Adjustments
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

-- Inventory Count Sessions
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

-- Inventory Counts (Individual product counts within a session)
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

-- Inventory Reconciliations
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

-- Inventory Snapshots (Historical inventory levels)
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

-- Price History (for auditing and reporting)
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

-- Audit Log
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

-- System Settings
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

-- Sessions (for tracking active user sessions)
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

### Database Triggers and Functions

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
    WHERE transaction_number LIKE date_part || '-' || LPAD(terminal_num::TEXT, 3, '0') || '-%';

    trans_number := date_part || '-' || LPAD(terminal_num::TEXT, 3, '0') || '-' || LPAD(sequence_part::TEXT, 6, '0');

    RETURN trans_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update inventory after transaction completion
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE products p
        SET quantity_in_stock = p.quantity_in_stock - ti.quantity
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

## Payment Integration Architecture

### Square Integration

#### Setup Requirements
1. **Square Developer Account**
   - Create application in Square Developer Dashboard
   - Obtain Application ID and Access Token
   - Configure OAuth (for multi-location support)
   - Set up webhook endpoints

2. **Square Terminal Setup**
   - Pair Square Terminal devices with application
   - Configure terminal settings (receipt options, tipping, etc.)
   - Test card reader functionality

#### Payment Flow

```javascript
// Payment Service Interface
class SquarePaymentService {
    constructor(accessToken, environment) {
        this.client = new Client({
            accessToken: accessToken,
            environment: environment // 'sandbox' or 'production'
        });
        this.paymentsApi = this.client.paymentsApi;
        this.terminalApi = this.client.terminalApi;
    }

    async processPayment(paymentDetails) {
        /**
         * Payment Flow:
         * 1. Validate payment details
         * 2. Create payment request with idempotency key
         * 3. Submit to Square API
         * 4. Handle response (success/failure)
         * 5. Store transaction reference
         * 6. Return payment status
         */
        try {
            const idempotencyKey = this.generateIdempotencyKey(paymentDetails);

            const payment = {
                sourceId: paymentDetails.sourceId, // From Square Terminal or card
                idempotencyKey: idempotencyKey,
                amountMoney: {
                    amount: Math.round(paymentDetails.amount * 100), // Convert to cents
                    currency: 'USD'
                },
                locationId: paymentDetails.locationId,
                referenceId: paymentDetails.transactionId,
                note: paymentDetails.note || '',
                buyerEmailAddress: paymentDetails.customerEmail
            };

            const response = await this.paymentsApi.createPayment(payment);

            return {
                success: true,
                paymentId: response.result.payment.id,
                status: response.result.payment.status,
                receiptUrl: response.result.payment.receiptUrl,
                cardDetails: response.result.payment.cardDetails
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorCode: error.statusCode
            };
        }
    }

    async processTerminalCheckout(checkoutRequest) {
        /**
         * Terminal Checkout Flow:
         * 1. Create checkout request
         * 2. Send to paired Square Terminal
         * 3. Customer interacts with terminal
         * 4. Poll for checkout completion
         * 5. Return result
         */
        try {
            const checkout = {
                idempotencyKey: this.generateIdempotencyKey(checkoutRequest),
                checkout: {
                    amountMoney: {
                        amount: Math.round(checkoutRequest.amount * 100),
                        currency: 'USD'
                    },
                    deviceOptions: {
                        deviceId: checkoutRequest.terminalId,
                        skipReceiptScreen: false,
                        collectSignature: checkoutRequest.amount >= 25 // Collect signature for amounts >= $25
                    },
                    referenceId: checkoutRequest.transactionId,
                    note: checkoutRequest.note || ''
                }
            };

            const response = await this.terminalApi.createTerminalCheckout(checkout);

            // Poll for completion (implement polling logic)
            const completedCheckout = await this.pollCheckoutStatus(response.result.checkout.id);

            return {
                success: true,
                checkoutId: completedCheckout.id,
                paymentId: completedCheckout.paymentIds[0],
                status: completedCheckout.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorCode: error.statusCode
            };
        }
    }

    async refundPayment(paymentId, amount, reason) {
        /**
         * Refund Flow:
         * 1. Validate refund request
         * 2. Create refund with Square API
         * 3. Return refund status
         */
        try {
            const refund = {
                idempotencyKey: uuidv4(),
                amountMoney: {
                    amount: Math.round(amount * 100),
                    currency: 'USD'
                },
                paymentId: paymentId,
                reason: reason || 'Customer refund'
            };

            const response = await this.client.refundsApi.refundPayment(refund);

            return {
                success: true,
                refundId: response.result.refund.id,
                status: response.result.refund.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyPayment(paymentId) {
        /**
         * Verify payment status with Square
         */
        try {
            const response = await this.paymentsApi.getPayment(paymentId);
            return {
                success: true,
                payment: response.result.payment
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    generateIdempotencyKey(data) {
        // Generate unique idempotency key to prevent duplicate charges
        return uuidv5(JSON.stringify(data), uuidv5.URL);
    }

    async pollCheckoutStatus(checkoutId, maxAttempts = 30) {
        // Poll every 2 seconds for up to 1 minute
        for (let i = 0; i < maxAttempts; i++) {
            const response = await this.terminalApi.getTerminalCheckout(checkoutId);
            const checkout = response.result.checkout;

            if (checkout.status === 'COMPLETED' || checkout.status === 'CANCELED') {
                return checkout;
            }

            await this.sleep(2000);
        }
        throw new Error('Checkout polling timeout');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

#### Webhook Handling

```javascript
class SquareWebhookHandler {
    constructor(webhookSignatureKey) {
        this.signatureKey = webhookSignatureKey;
    }

    async handleWebhook(req, res) {
        // Verify webhook signature
        const isValid = this.verifySignature(
            req.body,
            req.headers['x-square-signature']
        );

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = req.body;

        switch (event.type) {
            case 'payment.created':
                await this.handlePaymentCreated(event.data);
                break;
            case 'payment.updated':
                await this.handlePaymentUpdated(event.data);
                break;
            case 'refund.created':
                await this.handleRefundCreated(event.data);
                break;
            case 'refund.updated':
                await this.handleRefundUpdated(event.data);
                break;
            case 'terminal.checkout.created':
                await this.handleTerminalCheckoutCreated(event.data);
                break;
            case 'terminal.checkout.updated':
                await this.handleTerminalCheckoutUpdated(event.data);
                break;
            default:
                console.log('Unhandled webhook event:', event.type);
        }

        return res.status(200).json({ success: true });
    }

    verifySignature(body, signature) {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', this.signatureKey);
        hmac.update(JSON.stringify(body));
        const hash = hmac.digest('base64');
        return hash === signature;
    }

    // Event handlers...
}
```

#### Payment Method Support

```javascript
// Payment method configurations
const PAYMENT_METHODS = {
    CASH: {
        type: 'cash',
        requiresChangeCalculation: true,
        requiresDrawer: true,
        offline: true
    },
    CHECK: {
        type: 'check',
        requiresCheckNumber: true,
        requiresApproval: true,
        offline: true
    },
    CREDIT_CARD: {
        type: 'credit_card',
        processor: 'square',
        requiresTerminal: true,
        offline: false,
        supportedBrands: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER']
    },
    DEBIT_CARD: {
        type: 'debit_card',
        processor: 'square',
        requiresTerminal: true,
        offline: false
    },
    DIGITAL_WALLET: {
        type: 'digital_wallet',
        processor: 'square',
        supportedTypes: ['APPLE_PAY', 'GOOGLE_PAY'],
        requiresNFC: true,
        offline: false
    },
    GIFT_CARD: {
        type: 'gift_card',
        requiresBalance: true,
        offline: false
    }
};

// Payment processing orchestrator
class PaymentOrchestrator {
    async processTransaction(transaction, paymentMethods) {
        const results = [];

        for (const paymentMethod of paymentMethods) {
            let result;

            switch (paymentMethod.type) {
                case 'cash':
                    result = await this.processCashPayment(paymentMethod);
                    break;
                case 'check':
                    result = await this.processCheckPayment(paymentMethod);
                    break;
                case 'credit_card':
                case 'debit_card':
                case 'digital_wallet':
                    result = await this.processSquarePayment(paymentMethod);
                    break;
                case 'gift_card':
                    result = await this.processGiftCardPayment(paymentMethod);
                    break;
                default:
                    throw new Error(`Unsupported payment method: ${paymentMethod.type}`);
            }

            results.push(result);

            if (!result.success) {
                // Roll back previous successful payments
                await this.rollbackPayments(results.filter(r => r.success));
                throw new Error(`Payment failed: ${result.error}`);
            }
        }

        return results;
    }
}
```

---

## POS Terminal Architecture

### Client Application Structure

```
pos-client/
├── package.json
├── electron.js                    # Electron main process
├── electron-builder.json          # Build configuration
├── public/
│   ├── index.html
│   └── assets/
│       ├── icons/
│       └── sounds/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── index.tsx                  # React entry point
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── Product/
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   └── ProductDetails.tsx
│   │   ├── Cart/
│   │   │   ├── Cart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── CartActions.tsx
│   │   ├── Payment/
│   │   │   ├── PaymentMethod.tsx
│   │   │   ├── CashPayment.tsx
│   │   │   ├── CheckPayment.tsx
│   │   │   ├── CardPayment.tsx
│   │   │   └── SplitPayment.tsx
│   │   ├── Customer/
│   │   │   ├── CustomerLookup.tsx
│   │   │   └── CustomerInfo.tsx
│   │   ├── Receipt/
│   │   │   ├── ReceiptPreview.tsx
│   │   │   └── ReceiptTemplate.tsx
│   │   ├── Scanner/
│   │   │   ├── BarcodeScanner.tsx
│   │   │   └── ManualEntry.tsx
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   └── PinEntry.tsx
│   │   └── Common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── Loading.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── POSPage.tsx           # Main POS interface
│   │   ├── TransactionHistory.tsx
│   │   ├── Settings.tsx
│   │   └── CloseOut.tsx          # End of day close out
│   ├── services/
│   │   ├── api/
│   │   │   ├── api.service.ts    # API communication layer
│   │   │   ├── products.api.ts
│   │   │   ├── transactions.api.ts
│   │   │   ├── payments.api.ts
│   │   │   └── auth.api.ts
│   │   ├── hardware/
│   │   │   ├── barcode.service.ts    # Barcode scanner integration
│   │   │   ├── printer.service.ts    # Receipt printer
│   │   │   ├── cashdrawer.service.ts # Cash drawer control
│   │   │   └── display.service.ts    # Customer display
│   │   ├── offline/
│   │   │   ├── offline.service.ts    # Offline data management
│   │   │   ├── database.service.ts   # IndexedDB wrapper
│   │   │   └── queue.service.ts      # Transaction queue
│   │   ├── sync/
│   │   │   ├── sync.service.ts       # Data synchronization
│   │   │   └── conflict.service.ts   # Conflict resolution
│   │   ├── payment/
│   │   │   ├── square.service.ts     # Square integration
│   │   │   └── payment.service.ts    # Payment abstraction
│   │   └── utils/
│   │       ├── storage.service.ts    # Local storage wrapper
│   │       ├── encryption.service.ts # Data encryption
│   │       └── logger.service.ts     # Logging
│   ├── store/
│   │   ├── index.ts               # Redux store configuration
│   │   ├── slices/
│   │   │   ├── auth.slice.ts
│   │   │   ├── products.slice.ts
│   │   │   ├── cart.slice.ts
│   │   │   ├── transactions.slice.ts
│   │   │   ├── settings.slice.ts
│   │   │   └── sync.slice.ts
│   │   └── middleware/
│   │       ├── offline.middleware.ts
│   │       └── logger.middleware.ts
│   ├── hooks/
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   ├── usePayment.ts
│   │   ├── useScanner.ts
│   │   ├── useOffline.ts
│   │   └── useSync.ts
│   ├── types/
│   │   ├── product.types.ts
│   │   ├── transaction.types.ts
│   │   ├── payment.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── formatting.ts          # Price, date formatting
│   │   ├── validation.ts          # Input validation
│   │   ├── calculations.ts        # Tax, discount calculations
│   │   └── constants.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── api.config.ts
│   │   └── hardware.config.ts
│   └── styles/
│       ├── global.css
│       ├── theme.ts
│       └── components/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── electron-preload.js            # Electron preload script
```

### Key Features Implementation

#### 1. Barcode Scanner Integration

```typescript
// barcode.service.ts
import { EventEmitter } from 'events';

class BarcodeService extends EventEmitter {
    private device: any;
    private isConnected: boolean = false;

    async initialize() {
        try {
            // Initialize USB HID device
            const HID = window.require('node-hid');
            const devices = HID.devices();

            // Find scanner device (vendor ID and product ID specific to scanner)
            const scanner = devices.find(d =>
                d.vendorId === 0x05e0 && d.productId === 0x1200 // Example IDs
            );

            if (!scanner) {
                throw new Error('Barcode scanner not found');
            }

            this.device = new HID.HID(scanner.path);
            this.device.on('data', this.handleScanData.bind(this));
            this.device.on('error', this.handleError.bind(this));

            this.isConnected = true;
            this.emit('connected');

        } catch (error) {
            console.error('Failed to initialize barcode scanner:', error);
            this.emit('error', error);
        }
    }

    private handleScanData(data: Buffer) {
        // Parse barcode data
        const barcode = this.parseBarcode(data);

        if (barcode) {
            this.emit('scan', barcode);
            this.playBeep(); // Provide audio feedback
        }
    }

    private parseBarcode(data: Buffer): string | null {
        // Convert buffer to barcode string
        // Implementation depends on scanner protocol
        const str = data.toString('utf8').trim();
        return str || null;
    }

    private handleError(error: Error) {
        this.isConnected = false;
        this.emit('error', error);
    }

    private playBeep() {
        // Play success sound
        const audio = new Audio('/assets/sounds/beep.mp3');
        audio.play();
    }

    disconnect() {
        if (this.device) {
            this.device.close();
            this.isConnected = false;
            this.emit('disconnected');
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            deviceInfo: this.device ? {
                manufacturer: this.device.manufacturer,
                product: this.device.product
            } : null
        };
    }
}

export default new BarcodeService();
```

#### 2. Offline Support

```typescript
// offline.service.ts
import Dexie from 'dexie';

class OfflineDatabase extends Dexie {
    products: Dexie.Table<IProduct, string>;
    pendingTransactions: Dexie.Table<ITransaction, string>;
    categories: Dexie.Table<ICategory, string>;
    settings: Dexie.Table<ISettings, string>;

    constructor() {
        super('POSDatabase');

        this.version(1).stores({
            products: 'id, sku, barcode, name, categoryId, isActive',
            pendingTransactions: 'id, transactionNumber, terminalId, status, createdAt',
            categories: 'id, name, parentCategoryId',
            settings: 'key'
        });

        this.products = this.table('products');
        this.pendingTransactions = this.table('pendingTransactions');
        this.categories = this.table('categories');
        this.settings = this.table('settings');
    }
}

const db = new OfflineDatabase();

class OfflineService {
    private syncInProgress: boolean = false;

    // Cache product catalog
    async cacheProducts(products: IProduct[]) {
        await db.products.clear();
        await db.products.bulkAdd(products);
    }

    // Get product by barcode (offline-capable)
    async getProductByBarcode(barcode: string): Promise<IProduct | null> {
        const product = await db.products
            .where('barcode')
            .equals(barcode)
            .first();

        return product || null;
    }

    // Queue transaction for later sync
    async queueTransaction(transaction: ITransaction) {
        transaction.status = 'pending_sync';
        await db.pendingTransactions.add(transaction);
    }

    // Get all pending transactions
    async getPendingTransactions(): Promise<ITransaction[]> {
        return await db.pendingTransactions
            .where('status')
            .equals('pending_sync')
            .toArray();
    }

    // Sync pending transactions when online
    async syncPendingTransactions() {
        if (this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;

        try {
            const pending = await this.getPendingTransactions();

            for (const transaction of pending) {
                try {
                    // Upload to server
                    const response = await api.transactions.create(transaction);

                    if (response.success) {
                        // Remove from local queue
                        await db.pendingTransactions.delete(transaction.id);
                    }
                } catch (error) {
                    console.error('Failed to sync transaction:', transaction.id, error);
                    // Keep in queue for retry
                }
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    // Monitor network status
    startNetworkMonitoring() {
        window.addEventListener('online', async () => {
            console.log('Network connection restored');
            await this.syncPendingTransactions();
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost - switching to offline mode');
        });
    }

    // Get offline status
    isOnline(): boolean {
        return navigator.onLine;
    }

    // Get sync status
    async getSyncStatus() {
        const pending = await this.getPendingTransactions();
        return {
            online: this.isOnline(),
            pendingCount: pending.length,
            syncInProgress: this.syncInProgress
        };
    }
}

export default new OfflineService();
```

#### 3. Receipt Printing

```typescript
// printer.service.ts
import { BrowserWindow } from 'electron';

class PrinterService {
    private printerName: string | null = null;

    async initialize(printerName?: string) {
        const printers = await this.getAvailablePrinters();

        if (printerName) {
            this.printerName = printerName;
        } else if (printers.length > 0) {
            // Use default printer
            this.printerName = printers[0].name;
        }
    }

    async getAvailablePrinters() {
        const window = BrowserWindow.getFocusedWindow();
        const printers = await window.webContents.getPrinters();
        return printers;
    }

    async printReceipt(transaction: ITransaction, items: ITransactionItem[]) {
        const receiptHtml = this.generateReceiptHTML(transaction, items);

        // Create hidden window for printing
        const printWindow = new BrowserWindow({
            show: false,
            width: 302, // 80mm thermal printer
            webPreferences: {
                nodeIntegration: true
            }
        });

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);

        printWindow.webContents.on('did-finish-load', async () => {
            try {
                await printWindow.webContents.print({
                    silent: true,
                    printBackground: false,
                    deviceName: this.printerName || undefined,
                    margins: {
                        marginType: 'none'
                    }
                });

                printWindow.close();
            } catch (error) {
                console.error('Print failed:', error);
                printWindow.close();
                throw error;
            }
        });
    }

    private generateReceiptHTML(transaction: ITransaction, items: ITransactionItem[]): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: 80mm;
                        margin: 0;
                        padding: 5mm;
                    }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #000; margin: 5px 0; }
                    .item { display: flex; justify-content: space-between; }
                    .total { font-size: 14px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="center bold">
                    <div>YOUR STORE NAME</div>
                    <div>123 Main Street</div>
                    <div>City, ST 12345</div>
                    <div>(555) 123-4567</div>
                </div>

                <div class="line"></div>

                <div>
                    <div>Transaction: ${transaction.transactionNumber}</div>
                    <div>Date: ${new Date(transaction.transactionDate).toLocaleString()}</div>
                    <div>Cashier: ${transaction.cashierName}</div>
                    <div>Terminal: ${transaction.terminalName}</div>
                </div>

                <div class="line"></div>

                ${items.map(item => `
                    <div class="item">
                        <span>${item.quantity}x ${item.productName}</span>
                        <span>$${item.lineTotal.toFixed(2)}</span>
                    </div>
                    ${item.discountAmount > 0 ? `
                        <div class="item" style="padding-left: 20px;">
                            <span>Discount</span>
                            <span>-$${item.discountAmount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                `).join('')}

                <div class="line"></div>

                <div class="item">
                    <span>Subtotal:</span>
                    <span>$${transaction.subtotal.toFixed(2)}</span>
                </div>
                <div class="item">
                    <span>Tax:</span>
                    <span>$${transaction.taxAmount.toFixed(2)}</span>
                </div>
                ${transaction.discountAmount > 0 ? `
                    <div class="item">
                        <span>Discount:</span>
                        <span>-$${transaction.discountAmount.toFixed(2)}</span>
                    </div>
                ` : ''}

                <div class="line"></div>

                <div class="item total">
                    <span>TOTAL:</span>
                    <span>$${transaction.totalAmount.toFixed(2)}</span>
                </div>

                <div class="line"></div>

                <div class="center">
                    <div>Thank you for your business!</div>
                    <div>Please come again</div>
                </div>

                <div style="margin-top: 20px;"></div>
            </body>
            </html>
        `;
    }

    // ESC/POS command alternative for thermal printers
    async printReceiptESCPOS(transaction: ITransaction, items: ITransactionItem[]) {
        // Direct communication with thermal printer using ESC/POS commands
        // This requires node-thermal-printer or similar library

        const ThermalPrinter = window.require('node-thermal-printer').printer;
        const PrinterTypes = window.require('node-thermal-printer').types;

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: 'tcp://192.168.1.100', // Or USB path
            characterSet: 'SLOVENIA',
            removeSpecialCharacters: false,
            lineCharacter: '-',
            options: {
                timeout: 5000
            }
        });

        printer.alignCenter();
        printer.bold(true);
        printer.println('YOUR STORE NAME');
        printer.bold(false);
        printer.println('123 Main Street');
        printer.println('City, ST 12345');
        printer.println('(555) 123-4567');
        printer.drawLine();

        printer.alignLeft();
        printer.println(`Transaction: ${transaction.transactionNumber}`);
        printer.println(`Date: ${new Date(transaction.transactionDate).toLocaleString()}`);
        printer.println(`Cashier: ${transaction.cashierName}`);
        printer.drawLine();

        items.forEach(item => {
            printer.tableCustom([
                { text: `${item.quantity}x ${item.productName}`, align: 'LEFT', width: 0.7 },
                { text: `$${item.lineTotal.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
            ]);
        });

        printer.drawLine();
        printer.tableCustom([
            { text: 'Subtotal:', align: 'LEFT', width: 0.7 },
            { text: `$${transaction.subtotal.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
        ]);
        printer.tableCustom([
            { text: 'Tax:', align: 'LEFT', width: 0.7 },
            { text: `$${transaction.taxAmount.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
        ]);
        printer.drawLine();

        printer.bold(true);
        printer.tableCustom([
            { text: 'TOTAL:', align: 'LEFT', width: 0.7 },
            { text: `$${transaction.totalAmount.toFixed(2)}`, align: 'RIGHT', width: 0.3 }
        ]);
        printer.bold(false);

        printer.drawLine();
        printer.alignCenter();
        printer.println('Thank you for your business!');
        printer.println('Please come again');

        printer.cut();

        try {
            await printer.execute();
        } catch (error) {
            console.error('Print failed:', error);
            throw error;
        }
    }
}

export default new PrinterService();
```

---

## Admin Dashboard Features

### Dashboard Structure

```
admin-dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   ├── Overview.tsx         # Real-time summary
│   │   │   ├── SalesWidget.tsx
│   │   │   ├── TerminalStatus.tsx
│   │   │   ├── AlertsWidget.tsx
│   │   │   └── InventoryHealthWidget.tsx
│   │   ├── Reports/
│   │   │   ├── SalesReports.tsx
│   │   │   ├── InventoryReports.tsx
│   │   │   ├── EmployeeReports.tsx
│   │   │   ├── FinancialReports.tsx
│   │   │   ├── ReconciliationReports.tsx
│   │   │   └── VarianceAnalysis.tsx
│   │   ├── Inventory/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductEdit.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── StockAdjustments.tsx
│   │   │   ├── BulkImport.tsx
│   │   │   ├── InventoryCounts/
│   │   │   │   ├── CountSessionList.tsx
│   │   │   │   ├── CreateCountSession.tsx
│   │   │   │   ├── CountInterface.tsx
│   │   │   │   ├── MobileCountInterface.tsx
│   │   │   │   └── CountSummary.tsx
│   │   │   ├── Reconciliation/
│   │   │   │   ├── ReconciliationList.tsx
│   │   │   │   ├── ReconciliationDetails.tsx
│   │   │   │   ├── VarianceReview.tsx
│   │   │   │   ├── ApprovalWorkflow.tsx
│   │   │   │   └── AdjustmentCreation.tsx
│   │   │   └── Analytics/
│   │   │       ├── InventoryValue.tsx
│   │   │       ├── TurnoverAnalysis.tsx
│   │   │       ├── ShrinkageReport.tsx
│   │   │       └── InventorySnapshots.tsx
│   │   ├── Users/
│   │   │   ├── UserList.tsx
│   │   │   ├── UserEdit.tsx
│   │   │   └── ActivityLog.tsx
│   │   ├── Terminals/
│   │   │   ├── TerminalList.tsx
│   │   │   ├── TerminalConfig.tsx
│   │   │   └── TerminalMonitor.tsx
│   │   ├── Transactions/
│   │   │   ├── TransactionList.tsx
│   │   │   ├── TransactionDetails.tsx
│   │   │   └── RefundManagement.tsx
│   │   └── Settings/
│   │       ├── GeneralSettings.tsx
│   │       ├── PaymentSettings.tsx
│   │       ├── TaxSettings.tsx
│   │       ├── SecuritySettings.tsx
│   │       └── ReconciliationSettings.tsx
│   └── components/
│       ├── Charts/
│       │   ├── SalesChart.tsx
│       │   ├── InventoryChart.tsx
│       │   ├── VarianceChart.tsx
│       │   └── PerformanceChart.tsx
│       ├── Tables/
│       │   ├── DataTable.tsx
│       │   └── ExportButton.tsx
│       └── Inventory/
│           ├── BarcodeScanner.tsx
│           ├── VarianceIndicator.tsx
│           └── ReconciliationStatus.tsx
```

### Key Metrics and Analytics

#### 1. Real-Time Dashboard

```typescript
// Overview metrics
interface IDashboardMetrics {
    today: {
        sales: number;
        transactions: number;
        averageTicket: number;
        topProducts: IProductSale[];
        salesByHour: IHourlySales[];
        paymentMethodBreakdown: IPaymentBreakdown[];
    };
    terminals: {
        active: number;
        inactive: number;
        lastSync: Date;
        currentTransactions: number;
    };
    alerts: {
        lowStock: IProduct[];
        failedPayments: ITransaction[];
        systemErrors: IError[];
    };
    comparison: {
        yesterdaySales: number;
        lastWeekSales: number;
        percentageChange: number;
    };
}
```

#### 2. Sales Reports

```typescript
interface ISalesReport {
    period: 'day' | 'week' | 'month' | 'year' | 'custom';
    startDate: Date;
    endDate: Date;
    metrics: {
        totalSales: number;
        totalTransactions: number;
        averageTransaction: number;
        topProducts: IProductSale[];
        salesByCategory: ICategorySale[];
        salesByTerminal: ITerminalSale[];
        salesByCashier: ICashierSale[];
        salesByHour: IHourlySales[];
        paymentMethods: IPaymentBreakdown[];
        refunds: {
            count: number;
            amount: number;
            percentage: number;
        };
    };
}
```

#### 3. Inventory Reports

```typescript
interface IInventoryReport {
    summary: {
        totalProducts: number;
        totalValue: number;
        lowStockItems: number;
        outOfStockItems: number;
    };
    products: IInventoryProduct[];
    movements: {
        sales: number;
        adjustments: number;
        returns: number;
    };
    topSellers: IProductSale[];
    slowMoving: IProduct[];
    profitMargins: {
        averageMargin: number;
        topMarginProducts: IProductMargin[];
    };
    reconciliation: {
        lastReconciliationDate: Date;
        pendingReconciliations: number;
        totalVarianceCost: number;
        shrinkageRate: number;
    };
}
```

#### 4. Reconciliation Reports

```typescript
interface IReconciliationReport {
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: {
        totalReconciliations: number;
        totalItemsCounted: number;
        itemsWithVariance: number;
        variancePercentage: number;
        totalVarianceCost: number;
        shrinkageCost: number;
        overageCost: number;
    };
    variancesByCategory: {
        categoryName: string;
        itemsWithVariance: number;
        totalVarianceCost: number;
        variancePercentage: number;
    }[];
    topVariances: {
        productName: string;
        sku: string;
        systemQuantity: number;
        countedQuantity: number;
        variance: number;
        varianceCost: number;
        variancePercentage: number;
    }[];
    trends: {
        date: Date;
        varianceCount: number;
        varianceCost: number;
    }[];
    reconciliationsByStatus: {
        status: string;
        count: number;
    }[];
}

interface IVarianceAnalysis {
    productId: string;
    productName: string;
    sku: string;
    category: string;
    countHistory: {
        date: Date;
        systemQuantity: number;
        countedQuantity: number;
        variance: number;
        varianceCost: number;
    }[];
    patterns: {
        averageVariance: number;
        maxVariance: number;
        minVariance: number;
        varianceFrequency: string; // consistent, occasional, rare
        potentialCauses: string[]; // theft, damage, counting error, etc.
    };
    recommendations: string[];
}

interface IShrinkageReport {
    period: {
        startDate: Date;
        endDate: Date;
    };
    totals: {
        totalShrinkage: number; // units
        shrinkageCost: number;
        shrinkagePercentage: number;
        affectedProducts: number;
    };
    breakdown: {
        byCategory: {
            categoryName: string;
            shrinkage: number;
            cost: number;
            percentage: number;
        }[];
        byReason: {
            reason: string; // theft, damage, expiration, counting error
            count: number;
            cost: number;
            percentage: number;
        }[];
        byProduct: {
            productName: string;
            sku: string;
            shrinkage: number;
            cost: number;
            frequency: number;
        }[];
    };
    trends: {
        date: Date;
        shrinkage: number;
        cost: number;
    }[];
    alerts: {
        highRiskProducts: string[];
        unusualPatterns: string[];
    };
}
```

---

## API Endpoints

### Authentication Endpoints

```
POST   /api/v1/auth/login
Request: { username, password, terminalId }
Response: { token, refreshToken, user, permissions }

POST   /api/v1/auth/refresh
Request: { refreshToken }
Response: { token, refreshToken }

POST   /api/v1/auth/logout
Request: { token }
Response: { success }

POST   /api/v1/auth/verify
Request: { token }
Response: { valid, user }
```

### Product Endpoints

```
GET    /api/v1/products
Query: ?page=1&limit=50&category=uuid&search=term&isActive=true
Response: { products[], total, page, pages }

GET    /api/v1/products/:id
Response: { product }

GET    /api/v1/products/barcode/:barcode
Response: { product }

GET    /api/v1/products/sku/:sku
Response: { product }

POST   /api/v1/products
Request: { product data }
Response: { product }

PUT    /api/v1/products/:id
Request: { product data }
Response: { product }

DELETE /api/v1/products/:id
Response: { success }

POST   /api/v1/products/bulk-import
Request: FormData with CSV file
Response: { imported, failed, errors[] }
```

### Inventory Count Endpoints

```
POST   /api/v1/inventory/count-sessions
Request: { countType, categoryId?, scheduledDate?, isBlindCount, notes }
Response: { countSession }

GET    /api/v1/inventory/count-sessions
Query: ?status=in_progress&startDate=ISO&endDate=ISO
Response: { sessions[], total }

GET    /api/v1/inventory/count-sessions/:id
Response: { session, counts[] }

PUT    /api/v1/inventory/count-sessions/:id
Request: { status, notes }
Response: { session }

DELETE /api/v1/inventory/count-sessions/:id
Response: { success }

POST   /api/v1/inventory/count-sessions/:id/complete
Response: { session }

GET    /api/v1/inventory/count-sessions/:id/counts
Query: ?status=pending&hasVariance=true
Response: { counts[], summary }

POST   /api/v1/inventory/counts
Request: { countSessionId, productId, countedQuantity, notes }
Response: { count }

PUT    /api/v1/inventory/counts/:id
Request: { countedQuantity, notes }
Response: { count }

POST   /api/v1/inventory/counts/:id/recount
Request: { recountQuantity, notes }
Response: { count }

POST   /api/v1/inventory/counts/batch
Request: { countSessionId, counts: [{ productId, countedQuantity }] }
Response: { processed, failed[] }
```

### Inventory Reconciliation Endpoints

```
POST   /api/v1/inventory/reconciliations
Request: { countSessionId, notes }
Response: { reconciliation, variances[] }

GET    /api/v1/inventory/reconciliations
Query: ?status=pending&startDate=ISO&endDate=ISO
Response: { reconciliations[], total }

GET    /api/v1/inventory/reconciliations/:id
Response: { reconciliation, variances[], adjustments[] }

POST   /api/v1/inventory/reconciliations/:id/approve
Request: { notes }
Response: { reconciliation, adjustments[] }

POST   /api/v1/inventory/reconciliations/:id/reject
Request: { reason }
Response: { reconciliation }

GET    /api/v1/inventory/reconciliations/:id/variance-report
Response: { report, charts, summary }

POST   /api/v1/inventory/reconciliations/:id/adjustments
Request: { adjustments: [{ productId, quantityChange, reason }] }
Response: { adjustments[] }
```

### Inventory Analysis Endpoints

```
GET    /api/v1/inventory/snapshots
Query: ?productId=uuid&startDate=ISO&endDate=ISO&type=daily
Response: { snapshots[], trends }

POST   /api/v1/inventory/snapshots/create
Request: { type, date? }
Response: { snapshot, itemsProcessed }

GET    /api/v1/inventory/variance-analysis
Query: ?startDate=ISO&endDate=ISO&threshold=5
Response: { analysis, topVariances[], trends }

GET    /api/v1/inventory/shrinkage-report
Query: ?startDate=ISO&endDate=ISO&categoryId=uuid
Response: { report, totalShrinkage, costImpact, breakdown[] }

GET    /api/v1/inventory/turnover-analysis
Query: ?startDate=ISO&endDate=ISO
Response: { analysis, slowMoving[], fastMoving[] }

GET    /api/v1/inventory/value-report
Query: ?date=ISO
Response: { totalValue, breakdown[], comparison }
```

### Transaction Endpoints

```
POST   /api/v1/transactions
Request: { transaction data, items[], payments[] }
Response: { transaction, receiptUrl }

GET    /api/v1/transactions/:id
Response: { transaction, items[], payments[] }

GET    /api/v1/transactions
Query: ?startDate=ISO&endDate=ISO&terminalId=uuid&status=completed
Response: { transactions[], total }

POST   /api/v1/transactions/:id/void
Request: { reason, voidedBy }
Response: { transaction }

POST   /api/v1/transactions/:id/refund
Request: { amount, reason, items[] }
Response: { refund, refundTransaction }
```

### Payment Endpoints

```
POST   /api/v1/payments/process
Request: { transactionId, paymentMethod, amount, details }
Response: { payment, status, processorResponse }

POST   /api/v1/payments/square/checkout
Request: { transactionId, terminalId, amount }
Response: { checkoutId, status }

GET    /api/v1/payments/:id/status
Response: { payment, status }

POST   /api/v1/payments/:id/refund
Request: { amount, reason }
Response: { refund }

GET    /api/v1/payments/reconciliation
Query: ?date=YYYY-MM-DD
Response: { payments[], totals, discrepancies[] }
```

### Sync Endpoints

```
POST   /api/v1/sync/transactions
Request: { transactions[] }
Response: { synced, failed[] }

GET    /api/v1/sync/products/delta
Query: ?since=ISO_timestamp
Response: { products[], categories[], deletedIds[] }

POST   /api/v1/sync/heartbeat
Request: { terminalId, status }
Response: { acknowledged, serverTime }
```

### Admin Endpoints

```
GET    /api/v1/admin/dashboard/summary
Query: ?date=YYYY-MM-DD
Response: { metrics }

GET    /api/v1/admin/reports/sales
Query: ?startDate=ISO&endDate=ISO&groupBy=day|week|month
Response: { report }

GET    /api/v1/admin/reports/inventory
Response: { report }

GET    /api/v1/admin/reports/employees
Query: ?startDate=ISO&endDate=ISO
Response: { report }

POST   /api/v1/admin/products
PUT    /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id

GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id

GET    /api/v1/admin/users/:id/activity
Query: ?startDate=ISO&endDate=ISO
Response: { activities[] }

GET    /api/v1/admin/terminals
POST   /api/v1/admin/terminals
PUT    /api/v1/admin/terminals/:id
DELETE /api/v1/admin/terminals/:id

GET    /api/v1/admin/audit-log
Query: ?userId=uuid&action=type&startDate=ISO&endDate=ISO
Response: { logs[], total }
```

---

## Security Considerations

### 1. Authentication & Authorization

**JWT Implementation:**
```typescript
// Token structure
{
    userId: 'uuid',
    username: 'string',
    role: 'cashier' | 'manager' | 'admin',
    terminalId: 'uuid',
    permissions: string[],
    iat: timestamp,
    exp: timestamp
}

// Token expiration
- Access Token: 15 minutes
- Refresh Token: 7 days
- Terminal Token: 24 hours
```

**Role-Based Permissions:**
```typescript
const PERMISSIONS = {
    CASHIER: [
        'transaction.create',
        'transaction.view',
        'product.view',
        'customer.view'
    ],
    MANAGER: [
        ...CASHIER,
        'transaction.void',
        'transaction.refund',
        'inventory.adjust',
        'reports.view',
        'user.view'
    ],
    ADMIN: [
        ...MANAGER,
        'product.create',
        'product.edit',
        'product.delete',
        'user.create',
        'user.edit',
        'user.delete',
        'terminal.manage',
        'settings.edit'
    ]
};
```

### 2. Data Security

**Encryption:**
- Database encryption at rest (transparent data encryption)
- TLS 1.3 for all API communications
- Local storage encryption for sensitive data
- Password hashing with bcrypt (10+ rounds)

**PCI DSS Compliance:**
- Never store full credit card numbers
- Tokenize payment methods via Square
- Secure key management
- Regular security audits
- Encrypted logging (no sensitive data in logs)

### 3. API Security

```typescript
// Rate limiting
const rateLimits = {
    login: '5 requests per 15 minutes per IP',
    api: '100 requests per minute per user',
    payment: '10 requests per minute per terminal'
};

// Input validation
- Sanitize all inputs
- Validate data types and formats
- Maximum request size: 10MB
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
```

### 4. Network Security

- IP whitelisting for terminals (optional)
- VPN for remote locations (recommended)
- Firewall rules (allow only necessary ports)
- DDoS protection (CloudFlare or AWS Shield)
- Regular security patches

### 5. Audit Logging

```typescript
// All sensitive operations logged:
- User authentication (success/failure)
- Transaction operations (create, void, refund)
- Inventory adjustments
- User management operations
- Settings changes
- Payment processing
- Database access

// Log retention: 7 years (configurable)
```

---

## Deployment Architecture

### Cloud-Based Deployment (AWS)

```
┌──────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                     │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│            CloudFront (CDN) / WAF                     │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│        Application Load Balancer (ALB)               │
│        - SSL Termination                              │
│        - Health Checks                                │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│           ECS/EKS Cluster (Application Layer)        │
│  ┌────────────────┐  ┌────────────────┐             │
│  │  API Service   │  │ Admin Service  │             │
│  │  (Auto-scaled) │  │  (Auto-scaled) │             │
│  └────────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                   Data Layer                          │
│  ┌────────────────┐  ┌────────────────┐             │
│  │ RDS PostgreSQL │  │ ElastiCache    │             │
│  │ - Multi-AZ     │  │ Redis          │             │
│  │ - Read Replica │  │ - Replication  │             │
│  └────────────────┘  └────────────────┘             │
│  ┌────────────────┐  ┌────────────────┐             │
│  │  S3 Storage    │  │  SQS Queues    │             │
│  │  - Receipts    │  │  - Async Jobs  │             │
│  │  - Reports     │  │                │             │
│  └────────────────┘  └────────────────┘             │
└──────────────────────────────────────────────────────┘
                          ↑
┌──────────────────────────────────────────────────────┐
│              POS Terminal Clients                     │
│  (Multiple locations via secure connection)          │
└──────────────────────────────────────────────────────┘
```

### Infrastructure as Code (Terraform)

```hcl
# Example Terraform structure
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── vpc/
│   ├── alb/
│   ├── ecs/
│   ├── rds/
│   ├── elasticache/
│   └── s3/
└── environments/
    ├── dev/
    ├── staging/
    └── production/
```

### Container Configuration (Docker)

```dockerfile
# API Service Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## Scalability Considerations

### 1. Horizontal Scaling

**Application Layer:**
- Stateless API services (scale horizontally)
- Load balancer distributes traffic
- Auto-scaling based on CPU/memory/request count
- Containerized services (Docker + Kubernetes)

**Database Layer:**
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Query optimization and indexing
- Table partitioning for large tables (transactions)

### 2. Caching Strategy

```typescript
// Multi-level caching
const cacheStrategy = {
    // L1: Application-level cache (in-memory)
    level1: {
        products: '5 minutes TTL',
        categories: '15 minutes TTL',
        settings: '30 minutes TTL'
    },

    // L2: Redis cache
    level2: {
        products: '15 minutes TTL',
        userSessions: '24 hours TTL',
        apiResponses: '1 minute TTL'
    },

    // Cache invalidation
    invalidation: {
        onUpdate: ['products', 'categories'],
        onCreate: ['products'],
        onDelete: ['products']
    }
};
```

### 3. Database Optimization

```sql
-- Essential indexes
CREATE INDEX CONCURRENTLY idx_transactions_date_terminal
    ON transactions(transaction_date, terminal_id)
    WHERE status = 'completed';

CREATE INDEX CONCURRENTLY idx_products_search
    ON products USING gin(to_tsvector('english', name || ' ' || description));

-- Partitioning strategy for transactions (by month)
CREATE TABLE transactions_2026_01 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Materialized views for reports
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    DATE(transaction_date) as sale_date,
    terminal_id,
    COUNT(*) as transaction_count,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as average_ticket
FROM transactions
WHERE status = 'completed'
GROUP BY DATE(transaction_date), terminal_id;

CREATE INDEX idx_daily_sales_summary_date
    ON daily_sales_summary(sale_date);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

### 4. Performance Targets

```
API Response Times:
- Product lookup: < 50ms
- Transaction creation: < 200ms
- Payment processing: < 3s (Square processing time)
- Reports generation: < 5s (simple), < 30s (complex)

System Capacity:
- Transactions per hour per terminal: 100+
- Concurrent terminals: 1000+
- Database connections: 500+ (with pooling)
- API requests per second: 1000+
```

---

## Implementation Roadmap

### Phase 1: Core Functionality (8-12 weeks)

**Week 1-2: Foundation**
- Project setup and repository structure
- Database schema implementation
- API framework setup
- Development environment configuration

**Week 3-4: Product Management**
- Product CRUD operations
- Category management
- Barcode/SKU management
- Basic inventory tracking

**Week 5-6: Basic POS Terminal**
- Electron application setup
- Login/authentication
- Product search and selection
- Shopping cart functionality
- Basic transaction processing (cash only)

**Week 7-8: Receipt Generation**
- Receipt design and templating
- Printer integration
- Email receipt capability
- Transaction history

**Week 9-10: User Management**
- User CRUD operations
- Role-based access control
- Authentication and authorization
- Session management

**Week 11-12: Testing & Refinement**
- Unit tests
- Integration tests
- Bug fixes
- Performance optimization

---

### Phase 2: Payment Integration (4-6 weeks)

**Week 13-14: Square Integration**
- Square developer account setup
- Square SDK integration
- Terminal pairing
- Basic card payment processing

**Week 15-16: Payment Methods**
- Cash payment with change calculation
- Check payment processing
- Credit/debit card processing
- Digital wallet support

**Week 17-18: Payment Features**
- Split payment support
- Refund processing
- Payment reconciliation
- Payment webhooks

---

### Phase 3: Admin Dashboard (6-8 weeks)

**Week 19-20: Dashboard Foundation**
- Admin web application setup
- Authentication and security
- Layout and navigation
- Real-time dashboard

**Week 21-22: Inventory Management**
- Product management UI
- Category management
- Bulk import/export
- Stock adjustments
- Low stock alerts
- **Physical count session management**
- **Count interface (web and mobile)**

**Week 23-24: Reporting**
- Sales reports
- Inventory reports
- Payment reconciliation
- **Inventory reconciliation workflows**
- **Variance analysis and approval**
- Export functionality (PDF, CSV)

**Week 25-26: User & Terminal Management**
- User management UI
- Terminal configuration
- Activity logs
- System settings

---

### Phase 4: Advanced Features (6-8 weeks)

**Week 27-28: Offline Mode**
- Local database implementation (IndexedDB)
- Offline transaction queuing
- Product catalog caching
- Network status monitoring

**Week 29-30: Synchronization**
- Delta sync implementation
- Conflict resolution
- Background sync
- Sync status UI

**Week 31-32: Advanced Analytics & Reconciliation**
- Advanced reporting
- Data visualization
- Predictive analytics
- Custom report builder
- **Automated inventory snapshots**
- **Shrinkage trend analysis**
- **Inventory accuracy scoring**

**Week 33-34: Additional Features**
- Customer management
- Loyalty program
- Discount and promotion engine
- Multi-location support
- **Advanced reconciliation features:**
  - **Automated variance alerts**
  - **Scheduled count sessions**
  - **Mobile count app**
  - **Barcode scanning for counts**
  - **Historical variance analysis**

---

### Phase 5: Optimization & Launch (4-6 weeks)

**Week 35-36: Performance**
- Load testing
- Performance optimization
- Caching implementation
- Database tuning

**Week 37-38: Security**
- Security audit
- Penetration testing
- PCI compliance verification
- SSL/TLS configuration

**Week 39-40: Deployment**
- Production environment setup
- CI/CD pipeline
- Monitoring and alerting
- Documentation
- User training materials
- Soft launch with pilot users

---

## Hardware Requirements

### POS Terminal Station

**Computer:**
- OS: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)
- CPU: Intel Core i3 or equivalent (minimum), i5+ recommended
- RAM: 8GB minimum, 16GB recommended
- Storage: 256GB SSD minimum
- Network: Ethernet (preferred) or WiFi with stable connection
- Display: 1920x1080 minimum resolution
- Ports: USB 3.0 (x3 minimum)

**Barcode Scanner:**
- Type: USB or Bluetooth handheld scanner
- Compatibility: HID compliant
- Scan rate: 200 scans per second minimum
- Supported codes: UPC, EAN, Code 39, Code 128, QR
- Recommended models:
  - Zebra DS2278
  - Honeywell Voyager 1450g
  - Symbol LS2208

**Receipt Printer:**
- Type: Thermal printer (80mm)
- Interface: USB or Network (Ethernet/WiFi)
- Speed: 200mm/s minimum
- Auto-cutter: Required
- Cash drawer port: RJ11 (optional)
- Recommended models:
  - Epson TM-T88VI
  - Star TSP143IIIU
  - Bixolon SRP-350plusIII

**Cash Drawer:**
- Type: Electronic cash drawer
- Interface: RJ11 (connects to printer) or USB
- Size: 16" or 18" standard
- Lock: Key lock required
- Recommended models:
  - APG Vasario 1616
  - Star CD3-1616

**Card Reader (Square):**
- Square Terminal
- Square Reader for contactless and chip
- Square Stand (for tablet-based setup)

**Optional Equipment:**
- Customer-facing display (secondary monitor or tablet)
- Barcode label printer (for printing labels)
- Security camera system
- UPS (Uninterruptible Power Supply)

### Server Requirements

**Cloud Hosting (Recommended):**
- AWS t3.medium or equivalent (minimum for small deployment)
- 2 vCPUs, 4GB RAM (can scale up)
- 100GB SSD storage (database + logs)
- Auto-scaling group for production

**Self-Hosted (Alternative):**
- Server-grade hardware
- Redundant power supply
- RAID storage configuration
- Backup solution
- 24/7 uptime

---

## Monitoring & Maintenance

### Application Monitoring

**Metrics to Track:**
```typescript
// Performance metrics
- API response times (p50, p95, p99)
- Database query performance
- Cache hit rates
- Error rates
- Request throughput

// Business metrics
- Transactions per hour
- Average transaction value
- Payment success rate
- Terminal uptime
- Inventory turnover

// System metrics
- CPU utilization
- Memory usage
- Disk I/O
- Network bandwidth
- Database connections
```

**Monitoring Tools:**
- **APM:** New Relic, Datadog, or AWS CloudWatch
- **Error Tracking:** Sentry
- **Logs:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Uptime:** Pingdom, UptimeRobot
- **Alerting:** PagerDuty, Slack webhooks

### Alerting Rules

```yaml
alerts:
  critical:
    - name: "High Error Rate"
      condition: "error_rate > 5%"
      notification: "PagerDuty + SMS"

    - name: "Database Connection Failure"
      condition: "database_connections = 0"
      notification: "PagerDuty + SMS"

    - name: "Payment Processing Failure"
      condition: "payment_failure_rate > 10%"
      notification: "PagerDuty + Email"

  warning:
    - name: "Slow API Response"
      condition: "response_time_p95 > 1000ms"
      notification: "Email"

    - name: "Terminal Offline"
      condition: "terminal_last_heartbeat > 5min"
      notification: "Email + Slack"

    - name: "Low Stock Alert"
      condition: "product_stock < reorder_level"
      notification: "Email"
```

### Backup Strategy

```yaml
backups:
  database:
    full_backup:
      frequency: "Daily at 2 AM"
      retention: "30 days"
      location: "AWS S3 with versioning"

    incremental_backup:
      frequency: "Every 6 hours"
      retention: "7 days"

    point_in_time_recovery:
      enabled: true
      retention: "7 days"

  application:
    config_backup:
      frequency: "On change"
      versioned: true

    logs:
      retention: "90 days"
      archived: true

  testing:
    restore_test:
      frequency: "Monthly"
      verification: "Automated tests"
```

### Maintenance Schedule

```
Daily:
- Monitor system health
- Review error logs
- Check terminal connectivity
- Verify payment reconciliation

Weekly:
- Review performance metrics
- Check disk space
- Update virus definitions
- Backup verification

Monthly:
- Security patches
- Database optimization
- Log archival
- Restore testing
- User access review

Quarterly:
- Security audit
- Performance review
- Capacity planning
- Hardware inspection
- Software updates

Annually:
- Full system audit
- Disaster recovery test
- Hardware refresh planning
- License renewals
```

---

## Disaster Recovery Plan

### Backup Sites

1. **Primary Site:** Main production environment (AWS us-east-1)
2. **Secondary Site:** Failover environment (AWS us-west-2)
3. **Tertiary:** Local backup server (optional)

### Recovery Time Objectives (RTO)

```
Service Level Agreements:
- Critical services (POS, payments): 1 hour RTO
- Admin dashboard: 4 hours RTO
- Reporting: 24 hours RTO

Recovery Point Objective (RPO): 1 hour
(Maximum acceptable data loss)
```

### Failover Procedures

```yaml
automatic_failover:
  triggers:
    - Primary region unavailability
    - Database failure
    - Network partition

  actions:
    - Route traffic to secondary region
    - Promote read replica to primary
    - Update DNS records
    - Notify operations team

manual_failover:
  scenarios:
    - Planned maintenance
    - Security incident
    - Major outage

  steps:
    1. Assess situation
    2. Notify stakeholders
    3. Execute failover plan
    4. Verify functionality
    5. Monitor closely
    6. Plan failback
```

---

## Support & Documentation

### User Documentation

```
documentation/
├── user-guides/
│   ├── cashier-guide.md
│   ├── manager-guide.md
│   └── admin-guide.md
├── api-documentation/
│   ├── api-reference.md
│   └── integration-guide.md
├── hardware-setup/
│   ├── terminal-setup.md
│   ├── printer-setup.md
│   └── scanner-setup.md
└── troubleshooting/
    ├── common-issues.md
    ├── network-problems.md
    └── payment-issues.md
```

### Training Materials

- Video tutorials for each user role
- Interactive demos
- Quick reference cards
- FAQ documents
- Release notes and changelogs

### Support Channels

- Email support: support@yourpos.com
- Phone support: 24/7 for critical issues
- Knowledge base: help.yourpos.com
- Community forum
- In-app help system

---

## Next Steps

1. **Review and Approve Architecture:** Stakeholder review meeting
2. **Technology Selection:** Finalize technology stack choices
3. **Team Formation:** Assign roles and responsibilities
4. **Environment Setup:** Development, staging, production
5. **Sprint Planning:** Break down Phase 1 into 2-week sprints
6. **Repository Setup:** Initialize Git repository with structure
7. **CI/CD Pipeline:** Set up automated testing and deployment
8. **Begin Development:** Start with Phase 1, Week 1-2 tasks

---

## Document History

| Version | Date       | Author | Changes                                                                    |
|---------|------------|--------|---------------------------------------------------------------------------|
| 1.0     | 2026-01-12 | Team   | Initial architecture draft                                                 |
| 1.1     | 2026-01-13 | Team   | Added inventory reconciliation features, count sessions, variance analysis, and POS integration |

---

## Appendix

### Glossary

- **SKU:** Stock Keeping Unit - unique identifier for products
- **POS:** Point of Sale
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective
- **ACID:** Atomicity, Consistency, Isolation, Durability
- **PCI DSS:** Payment Card Industry Data Security Standard
- **JWT:** JSON Web Token
- **ESC/POS:** Standard printer command language
- **Reconciliation:** Process of comparing physical inventory counts with system records
- **Variance:** Difference between physical count and system quantity (can be positive or negative)
- **Shrinkage:** Inventory loss due to theft, damage, errors, or other factors
- **Cycle Count:** Periodic counting of a subset of inventory items
- **Blind Count:** Physical count performed without showing system quantities to the counter
- **COGS:** Cost of Goods Sold - the direct costs attributable to the production of goods sold
- **Inventory Snapshot:** Point-in-time capture of inventory levels for historical tracking
- **Count Session:** A scheduled or ad-hoc physical inventory counting activity
- **Recount:** Secondary count performed to verify initial count when variance is detected

### References

- Square API Documentation: https://developer.squareup.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Electron Documentation: https://www.electronjs.org/docs
- PCI DSS Standards: https://www.pcisecuritystandards.org/

---

*End of Architecture Document*
