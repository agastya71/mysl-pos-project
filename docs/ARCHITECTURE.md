# Point of Sale Application - System Architecture

**Version:** 2.0
**Last Updated:** 2026-01-13
**Status:** Design Phase

**Major Updates in v2.0:**
- Enhanced vendor/donor management for non-profit organizations
- Purchase order and inventory receiving system
- Accounts payable and vendor payment tracking
- Donation tracking with IRS compliance features
- Bulk import system for vendor databases (CSV, Excel, JSON, XML)
- Comprehensive API endpoints for procurement workflow

---

## 📚 Documentation Navigation

This is the main architecture overview document. For detailed specifications, see:

| Document | Description |
|----------|-------------|
| **[architecture/README.md](architecture/README.md)** | 📍 **Navigation hub** - Start here for role-based guidance |
| [architecture/DATA_MODEL.md](architecture/DATA_MODEL.md) | Complete database schema and data structures (20+ tables) |
| [architecture/API_ENDPOINTS.md](architecture/API_ENDPOINTS.md) | REST API specifications for all endpoints |
| [architecture/BULK_IMPORT.md](architecture/BULK_IMPORT.md) | Bulk import system for vendor databases |
| [architecture/SECURITY_DEPLOYMENT.md](architecture/SECURITY_DEPLOYMENT.md) | Security, infrastructure, and deployment guides |
| [architecture/IMPLEMENTATION.md](architecture/IMPLEMENTATION.md) | Implementation roadmap and operations guide |
| [architecture/UI_UX_DESIGN.md](architecture/UI_UX_DESIGN.md) | User interface and user experience specifications |

---

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
- [Payment Integration](#payment-integration-architecture)
- [POS Terminal Architecture](#pos-terminal-architecture)
- [Admin Dashboard](#admin-dashboard-features)
- [Detailed Documentation References](#detailed-documentation-references)

---

## System Overview

A distributed POS system designed for non-profit organizations with comprehensive vendor management, donation tracking, and inventory reconciliation capabilities. The system features a central database, multiple client terminals, integrated payment processing, and administrative tools.

**Key System Capabilities:**
- Multi-terminal POS operations with offline support
- Real-time inventory tracking and management
- Vendor and donor management (suppliers, individual donors, corporate donors, consignment partners)
- Purchase order workflow with approval processes
- Inventory receiving with quality control
- Donation tracking with IRS compliance (tax receipts, Form 8283)
- Accounts payable and vendor payment tracking
- Bulk import system (CSV, Excel, JSON, XML)
- Integrated payment processing (Square, Stripe, PayPal)
- Physical inventory counting and reconciliation
- Variance detection and shrinkage analysis
- Automated inventory adjustments with approval workflows
- Comprehensive reporting and analytics
- Role-based access control and audit trails

---

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Dashboard                       │
│         (Web-based - accessed via local network)         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  LOCAL SERVER (Windows/Mac/Linux)        │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Application Server Layer                  │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │   POS API    │  │  Admin API   │               │ │
│  │  │   Service    │  │   Service    │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │               Data Layer                            │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │  PostgreSQL  │  │    Redis     │               │ │
│  │  │   Database   │  │    Cache     │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │  RabbitMQ    │  │ File Storage │               │ │
│  │  │ Message Queue│  │  (Local FS)  │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              ↑                           ↑
              │    LOCAL NETWORK          │
              ↓                           ↓
┌─────────────────────────────────────────────────────────┐
│            POS Terminal Clients (Windows/Mac)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Terminal 1  │  │  Terminal 2  │  │  Terminal N  │  │
│  │ (Win/Mac PC) │  │ (Win/Mac PC) │  │ (Win/Mac PC) │  │
│  │  + Electron  │  │  + Electron  │  │  + Electron  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
                    (Internet required)
                            ↓
┌─────────────────────────────────────────────────────────┐
│              External Payment Services                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Square    │  │    Stripe    │  │    PayPal    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘

Note: Internet connection only required for payment processing.
All other operations work on local network.
```

---

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
   - Mobile Count App (for physical inventory)
   - Customer Display (optional secondary display)

2. **Application Layer**
   - API Gateway (request routing, rate limiting, authentication)
   - POS Service (transaction processing, inventory queries)
   - Admin Service (reporting, management functions)
   - Payment Integration Service (payment processor abstraction)
   - Sync Service (offline transaction synchronization)
   - Import Service (bulk vendor database import)

3. **Data Layer**
   - PostgreSQL (primary relational database - self-hosted on local server)
   - Redis (caching, session management, pub/sub - self-hosted on local server)
   - Message Queue (RabbitMQ for async operations - self-hosted on local server)
   - File Storage (Local file system or NAS for receipts, reports, product images, import files)

---

## Technology Stack Recommendations

### Backend Services
- **API Framework:** Node.js with Express.js or Python with FastAPI/Django REST Framework
- **Database:** PostgreSQL 15+ (self-hosted on local server) for ACID compliance and complex queries
- **Cache:** Redis 7+ (self-hosted on local server) for session management and frequently accessed data
- **Message Queue:** RabbitMQ (self-hosted on local server) for async operations and real-time updates
- **API Gateway:** Nginx with Lua scripting or built-in Express.js routing (running on local server)
- **Authentication:** JWT tokens with refresh token rotation
- **ORM:** TypeORM (Node.js) or SQLAlchemy (Python)
- **File Storage:** Local file system with organized directory structure or NAS (Network Attached Storage)

### Frontend Applications

#### POS Terminal (Desktop)
- **Framework:** Electron.js for cross-platform desktop application
- **UI Library:** React.js or Vue.js
- **UI Components:** Material-UI or Ant Design
- **State Management:** Redux Toolkit or Zustand
- **Offline Support:** IndexedDB (via Dexie.js) or SQLite
- **Barcode Scanner Integration:** Node.js USB libraries (node-usb, node-hid)
- **Printer Integration:** Electron printer APIs, ESC/POS protocol

#### Admin Dashboard (Web)
- **Framework:** React.js or Vue.js
- **UI Components:** Material-UI, Ant Design, or Tailwind CSS
- **State Management:** Redux Toolkit or Zustand
- **Charts/Graphs:** Chart.js, Recharts, or D3.js
- **Data Grid:** AG Grid or React Table

### DevOps & Infrastructure
- **Containerization:** Docker (optional, for easier deployment and isolation)
- **Orchestration:** Docker Compose (for multi-container deployment on local server)
- **CI/CD:** GitHub Actions, GitLab CI, or Jenkins (self-hosted)
- **Monitoring:** Prometheus + Grafana (self-hosted on local server or monitoring machine)
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana) self-hosted or simple file-based logging
- **Error Tracking:** Sentry (self-hosted) or custom error logging
- **Backup:** Automated backups to local NAS, external drives, or dedicated backup server

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
- **Vendor/Supplier management (for-profit and non-profit models)**
- **Donor management and donation tracking**
- **Purchase order creation and management**
- **Inventory receiving and goods receipt**
- **Accounts payable tracking**
- Inventory valuation (FIFO, LIFO, weighted average)
- **Physical inventory counts and tracking**
- **Inventory reconciliation (system vs physical counts)**
- **Shrinkage and variance analysis**
- **Inventory audit trails**
- **Cost of goods sold (COGS) tracking**

**Key Features:**
- Bulk import/export via CSV, Excel, JSON, XML
- **Vendor database bulk import with field mapping**
- Barcode generation
- Image management
- Price history tracking
- Multi-location inventory support
- **Physical count interface with mobile support**
- **Automated reconciliation workflows**
- **Variance threshold alerts**
- **Batch reconciliation processing**
- **Inventory snapshots for historical analysis**
- **Purchase order workflow with approvals**
- **Multi-step receiving process with quality control**
- **Donation receipt generation (IRS compliance)**
- **Accounts payable and vendor payment tracking**
- **Consignment inventory management**

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

## Payment Integration Architecture

### Overview

The system uses Square as the primary payment processor, with abstraction layer support for Stripe as a backup. All payment processing follows PCI DSS compliance standards by delegating card data handling to the payment processor.

### Square Integration

**Setup Requirements:**
1. Square Developer Account
2. Application ID and Access Token
3. OAuth configuration (for multi-location support)
4. Webhook endpoints for payment events

**Supported Square APIs:**
- Payments API (card payments, digital wallets)
- Terminal API (hardware terminal integration)
- Refunds API
- Orders API (for itemized transactions)
- Customer API (optional customer tracking)

### Payment Flow

```
Customer → POS Terminal → Payment Service → Square API → Bank
    ↑                                                       ↓
    └─────────────── Receipt Generation ──────────────────┘
```

**Detailed Flow:**
1. Cashier completes transaction and selects payment method
2. POS creates order in Square with itemized details
3. Square processes payment (card reader, digital wallet, etc.)
4. Square returns payment result (success/failure)
5. POS updates transaction status and inventory
6. Receipt generated and printed/emailed
7. Transaction logged with full audit trail

**For complete payment processing details, see:** [architecture/SECURITY_DEPLOYMENT.md](architecture/SECURITY_DEPLOYMENT.md#payment-security)

---

## POS Terminal Architecture

### Electron Application Structure

```
pos-terminal/
├── main/                   # Main process (Node.js)
│   ├── app.js             # Application lifecycle
│   ├── database.js        # Local SQLite/IndexedDB
│   ├── printer.js         # Printer integration
│   ├── scanner.js         # Barcode scanner
│   └── sync.js            # Background sync
├── renderer/              # Renderer process (React/Vue)
│   ├── components/
│   ├── views/
│   ├── store/            # State management
│   └── api/              # API client
└── shared/                # Shared utilities
```

### Key Features

**Offline-First Architecture:**
- Local database (IndexedDB or SQLite) for product catalog
- Queue transactions when offline
- Automatic sync when connection restored
- Optimistic UI updates

**Hardware Integration:**
- USB barcode scanners (HID mode)
- Receipt printers (ESC/POS protocol)
- Cash drawers (via printer RJ11 port)
- Card readers (Square Terminal SDK)

**For complete terminal specifications, see:** [architecture/IMPLEMENTATION.md](architecture/IMPLEMENTATION.md#hardware-requirements)

---

## Admin Dashboard Features

### Dashboard Structure

```
admin-dashboard/
├── Dashboard              # Real-time overview
├── Inventory
│   ├── Products           # Product catalog management
│   ├── Categories         # Category management
│   ├── Vendors            # Vendor/donor management
│   ├── Purchase Orders    # PO creation and tracking
│   ├── Receiving          # Goods receipt processing
│   ├── Donations          # Donation tracking and receipts
│   ├── Physical Counts    # Count session management
│   └── Reconciliation     # Variance analysis and approval
├── Sales
│   ├── Transactions       # Transaction history
│   ├── Refunds            # Refund management
│   └── Reports            # Sales analytics
├── Accounting
│   ├── Accounts Payable   # Invoice tracking
│   ├── Vendor Payments    # Payment processing
│   └── Reconciliation     # Financial reconciliation
├── Users
│   ├── Employees          # User management
│   └── Permissions        # Role/permission config
├── Terminals
│   ├── Terminal List      # Active terminals
│   └── Configuration      # Terminal settings
└── Reports
    ├── Sales Reports      # Revenue analytics
    ├── Inventory Reports  # Stock and variance
    ├── Financial Reports  # P&L, COGS, AP
    └── Custom Reports     # Report builder
```

### Real-Time Features

- Live transaction feed
- Active terminal status
- Low stock alerts
- Payment processing alerts
- Variance threshold alerts
- System health monitoring

---

## Detailed Documentation References

### Database & Data Model
**📄 [architecture/DATA_MODEL.md](architecture/DATA_MODEL.md)**
- Complete database schema (20+ tables)
- Table relationships and foreign keys
- Indexes and constraints
- Database triggers and functions
- Data integrity rules

**Key Tables:**
- Vendors (suppliers, donors, consignment partners)
- Products, Categories, Inventory
- Purchase Orders, Receiving, Donations
- Transactions, Payments
- Accounts Payable, Vendor Payments
- Inventory Counts, Reconciliations
- Users, Terminals, Audit Logs

---

### API Specifications
**📄 [architecture/API_ENDPOINTS.md](architecture/API_ENDPOINTS.md)**
- Complete REST API documentation
- Authentication endpoints
- Product and inventory endpoints
- Vendor/supplier management APIs
- Purchase order and receiving APIs
- Donation management APIs
- Accounts payable and payment APIs
- Bulk import APIs
- Inventory count and reconciliation APIs
- Transaction and payment processing

**API Categories:**
- Authentication & Authorization
- Products & Inventory
- Vendors & Suppliers
- Purchase Orders
- Inventory Receiving
- Donations
- Accounts Payable
- Vendor Payments
- Bulk Import System
- Inventory Counts & Reconciliation
- Transactions & Payments
- Sync & Admin

---

### Bulk Import System
**📄 [architecture/BULK_IMPORT.md](architecture/BULK_IMPORT.md)**
- Supported file formats (CSV, Excel, TSV, JSON, XML, Fixed-Width)
- Standard vendor import format specification
- Field mapping and validation
- 7-step import workflow
- Error handling and data quality
- Template management
- CSV examples for various scenarios

**Import Capabilities:**
- Vendor/supplier databases
- Donation records
- Purchase order items
- Consignment inventory
- Product catalog updates
- Field mapping templates
- Automatic category creation
- Duplicate detection and merging

---

### Security & Deployment
**📄 [architecture/SECURITY_DEPLOYMENT.md](architecture/SECURITY_DEPLOYMENT.md)**
- Authentication and authorization (JWT, RBAC)
- Data encryption (at rest and in transit)
- PCI DSS compliance guidelines
- API security best practices
- Network security configuration
- Audit logging requirements
- Cloud deployment architecture (AWS)
- On-premise deployment architecture
- Docker containerization
- Kubernetes orchestration
- Infrastructure as Code (Terraform)
- Scalability strategies
- Monitoring and observability
- Disaster recovery procedures

**Security Features:**
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- AES-256-GCM encryption at rest
- TLS 1.3 for data in transit
- PCI DSS compliance via Square tokenization
- Rate limiting and throttling
- Input validation and sanitization
- Audit logging with 7-year retention

---

### Implementation & Operations
**📄 [architecture/IMPLEMENTATION.md](architecture/IMPLEMENTATION.md)**
- Phased implementation roadmap (5 phases, 40 weeks)
- Hardware requirements (POS terminals, servers)
- Monitoring and maintenance procedures
- Backup strategies
- Support and documentation needs
- Training materials
- Go-live checklist
- Disaster recovery plan
- Support channels

**Implementation Phases:**
1. **Phase 1:** Core Functionality (8-12 weeks)
2. **Phase 2:** Payment Integration (4-6 weeks)
3. **Phase 3:** Admin Dashboard (6-8 weeks)
4. **Phase 4:** Advanced Features (6-8 weeks)
5. **Phase 5:** Optimization & Launch (4-6 weeks)

---

## Next Steps

1. **Review Architecture:** Stakeholder review and approval
2. **Read Detailed Docs:** Review [architecture/README.md](architecture/README.md) for role-based navigation
3. **Select Technologies:** Finalize technology stack choices
4. **Form Team:** Assign roles and responsibilities
5. **Setup Environments:** Development, staging, production
6. **Plan Sprints:** Break down Phase 1 into 2-week sprints
7. **Initialize Repository:** Set up Git repository structure
8. **Configure CI/CD:** Automated testing and deployment
9. **Begin Development:** Start with Phase 1, Week 1-2 tasks

---

## Document History

| Version | Date       | Author | Changes                                                                    |
|---------|------------|--------|---------------------------------------------------------------------------|
| 1.0     | 2026-01-12 | Team   | Initial architecture draft                                                 |
| 1.1     | 2026-01-13 | Team   | Added inventory reconciliation features, count sessions, variance analysis, and POS integration |
| 2.0     | 2026-01-13 | Team   | Major update: Enhanced vendor/donor management for non-profits, purchase orders, inventory receiving, accounts payable tracking, donation management with IRS compliance, bulk import system for vendor databases (CSV/Excel/JSON/XML), comprehensive procurement API endpoints, split documentation into focused files |

---

## Glossary

- **SKU:** Stock Keeping Unit - unique identifier for products
- **POS:** Point of Sale
- **RBAC:** Role-Based Access Control
- **ACID:** Atomicity, Consistency, Isolation, Durability
- **PCI DSS:** Payment Card Industry Data Security Standard
- **JWT:** JSON Web Token
- **ESC/POS:** Standard printer command language
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective
- **Reconciliation:** Process of comparing physical inventory counts with system records
- **Variance:** Difference between physical count and system quantity
- **Shrinkage:** Inventory loss due to theft, damage, or miscounting
- **COGS:** Cost of Goods Sold
- **AP:** Accounts Payable
- **PO:** Purchase Order
- **FMV:** Fair Market Value (for donations)
- **IRS Form 8283:** Noncash Charitable Contributions form

---

**Maintained By:** Development Team
**Last Review:** 2026-01-13
**Next Review:** 2026-02-13
