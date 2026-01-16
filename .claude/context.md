# POS System - Project Context

This document provides essential context about the POS (Point of Sale) System project, including its purpose, architecture, conventions, and dependencies.

## Project Overview

### Purpose
A comprehensive Point of Sale system designed specifically for **non-profit organizations** (thrift stores, donation centers). The system manages sales transactions, inventory, vendor/donor relationships, purchase orders, accounts payable, and physical inventory reconciliation.

### Key Features
- **Multi-terminal POS operations** with offline support
- **Vendor & donor management** (suppliers, individual donors, corporate donors, consignment partners)
- **Purchase order workflow** with approval processes
- **Inventory receiving** with quality control
- **Donation tracking** with IRS compliance (tax receipts, Form 8283)
- **Accounts payable** and vendor payment tracking
- **Bulk import system** (CSV, Excel, JSON, XML)
- **Integrated payment processing** (Square, Stripe, PayPal)
- **Physical inventory counts** and reconciliation
- **Variance detection** and shrinkage analysis
- **Comprehensive reporting** and analytics

### Target Users
- **Cashiers:** Process transactions at POS terminals
- **Managers:** Oversee operations, approve adjustments, view reports
- **Admins:** Full system access, user management, configuration
- **Donors/Vendors:** External partners providing inventory

## Architecture Overview

### System Architecture
**Three-tier architecture** with local server deployment (no cloud dependencies):
1. **Presentation Layer:** POS terminals (Electron), Admin dashboard (Web), Mobile count app
2. **Application Layer:** API Gateway, services (POS, Admin, Payment, Sync, Import)
3. **Data Layer:** PostgreSQL, Redis, RabbitMQ, local file storage (all self-hosted)

### Deployment Model
- **Local server** (Windows/Mac/Linux) hosts all backend services
- **POS terminals** connect via local network (Electron desktop apps)
- **Admin dashboard** accessed via web browser on local network
- **Internet** required ONLY for payment processing (Square API)
- **All data** stored locally (no cloud dependencies)

### Technology Stack

#### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15+ (self-hosted)
- **Cache:** Redis 7+ (self-hosted)
- **Message Queue:** RabbitMQ (self-hosted)
- **ORM:** TypeORM or Prisma
- **Authentication:** JWT with refresh tokens
- **Validation:** Zod or Joi
- **Testing:** Jest, Supertest

#### Frontend - POS Terminal (Desktop)
- **Framework:** Electron.js (cross-platform desktop)
- **UI Library:** React 18+ with TypeScript
- **UI Components:** Material-UI or Ant Design
- **State Management:** Redux Toolkit
- **Offline Support:** IndexedDB (via Dexie.js)
- **Hardware Integration:** node-usb, node-hid (barcode scanners, printers)

#### Frontend - Admin Dashboard (Web)
- **Framework:** React 18+ with TypeScript
- **UI Components:** Material-UI or Ant Design
- **State Management:** Redux Toolkit
- **Charts:** Chart.js, Recharts, or D3.js
- **Data Grid:** AG Grid or React Table

#### DevOps
- **Containerization:** Docker (optional, for easier deployment)
- **Orchestration:** Docker Compose
- **Monitoring:** Prometheus + Grafana (self-hosted)
- **Logging:** Winston or Pino (file-based)
- **Backup:** Automated local backups (NAS, external drives)

## Project Structure

```
pos-system/
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # Main architecture overview
│   ├── GETTING_STARTED.md         # Setup guide
│   ├── IMPLEMENTATION_GUIDE.md    # Phase-by-phase development plan
│   ├── PROJECT_STRUCTURE.md       # Directory structure
│   └── architecture/              # Detailed architecture docs
│       ├── README.md              # Navigation hub
│       ├── DATA_MODEL.md          # Database schema overview
│       ├── DATA_MODEL_TABLES.md   # Detailed table definitions
│       ├── API_ENDPOINTS.md       # REST API specifications
│       ├── BULK_IMPORT.md         # Bulk import system
│       ├── SECURITY_DEPLOYMENT.md # Security and deployment
│       ├── IMPLEMENTATION.md      # Roadmap and operations
│       └── UI_UX_DESIGN.md        # UI/UX specifications
├── schema/                        # Database schema (SQL files)
│   ├── README.md                  # Schema documentation
│   ├── tables/                    # Table definitions
│   ├── functions/                 # PostgreSQL functions
│   ├── triggers/                  # Database triggers
│   └── views/                     # Database views
├── backend/                       # Backend API service
│   ├── src/
│   │   ├── controllers/           # Request handlers
│   │   ├── services/              # Business logic
│   │   ├── models/                # Database models
│   │   ├── routes/                # API routes
│   │   ├── middleware/            # Express middleware
│   │   ├── validators/            # Input validation
│   │   ├── utils/                 # Utilities
│   │   └── types/                 # TypeScript types
│   └── tests/                     # Backend tests
├── pos-client/                    # POS terminal (Electron)
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API clients, hardware services
│   │   ├── store/                 # Redux store
│   │   ├── hooks/                 # Custom React hooks
│   │   └── types/                 # TypeScript types
│   └── tests/                     # Frontend tests
├── admin-dashboard/               # Admin web dashboard
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API clients
│   │   ├── store/                 # Redux store
│   │   └── types/                 # TypeScript types
│   └── tests/                     # Dashboard tests
├── scripts/                       # Utility scripts
└── .claude/                       # Claude Code configuration
    ├── rules.md                   # Coding rules
    ├── context.md                 # This file
    └── prompts.md                 # Agent prompts
```

## Database Schema

### 30 Tables Organized by Domain

#### 1. Core Product & Catalog (4 tables)
- `categories` - Hierarchical product categorization
- `products` - Product catalog with pricing and inventory
- `vendors` - Vendors, donors, suppliers, consignment partners
- `price_history` - Price change audit trail

#### 2. System & Users (4 tables)
- `users` - User accounts with RBAC (cashier, manager, admin)
- `terminals` - POS terminal registration and monitoring
- `customers` - Optional customer tracking for loyalty
- `sessions` - Authentication session management

#### 3. Sales & Transactions (5 tables)
- `transactions` - Main transaction records
- `transaction_items` - Line items with product snapshots
- `payments` - Payment processing records
- `payment_details` - Additional payment details (cash/check/card)
- `refunds` - Refund processing

#### 4. Procurement (6 tables)
- `purchase_orders` - PO management with approval workflow
- `purchase_order_items` - PO line items
- `inventory_receiving` - Goods receipt records
- `receiving_items` - Receiving line items
- `donations` - Donation tracking (IRS compliance)
- `import_batches` & `import_items` - Bulk import tracking

#### 5. Accounts Payable (3 tables)
- `accounts_payable` - Invoice tracking
- `vendor_payments` - Payment to vendors
- `payment_allocations` - Payment-to-invoice allocation

#### 6. Inventory Management (5 tables)
- `inventory_adjustments` - Manual quantity adjustments
- `inventory_count_sessions` - Physical count sessions
- `inventory_counts` - Individual product counts
- `inventory_reconciliations` - Reconciliation records
- `inventory_snapshots` - Historical inventory levels

#### 7. Audit & Administration (3 tables)
- `audit_log` - Comprehensive system audit log
- `system_settings` - System configuration

### Key Database Conventions
- **Primary Keys:** UUIDs (not auto-increment)
- **Naming:** snake_case for tables and columns
- **Timestamps:** `created_at`, `updated_at` on all tables
- **Soft Deletes:** `deleted_at` for important records
- **Foreign Keys:** Always defined with ON DELETE/UPDATE rules
- **Indexes:** On all foreign keys and frequently queried columns

## API Structure

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All endpoints except login require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### API Categories
- `/auth` - Authentication (login, logout, refresh)
- `/products` - Product management
- `/categories` - Category management
- `/vendors` - Vendor/donor management
- `/purchase-orders` - Purchase order workflow
- `/receiving` - Inventory receiving
- `/donations` - Donation tracking
- `/accounts-payable` - Invoice management
- `/vendor-payments` - Vendor payment processing
- `/transactions` - Sales transactions
- `/payments` - Payment processing
- `/refunds` - Refund processing
- `/inventory` - Inventory management
- `/inventory-counts` - Physical count sessions
- `/reconciliations` - Inventory reconciliation
- `/users` - User management
- `/terminals` - Terminal management
- `/reports` - Reporting and analytics
- `/sync` - Data synchronization
- `/import` - Bulk import operations

### Response Format
```typescript
// Success response
{
    "success": true,
    "data": { ... },
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 100
    }
}

// Error response
{
    "success": false,
    "error": {
        "message": "Resource not found",
        "code": "NOT_FOUND",
        "details": { ... }
    }
}
```

## Naming Conventions

### Files and Directories
- **React Components:** PascalCase - `ProductCard.tsx`
- **Services:** camelCase - `products.service.ts`
- **Types:** PascalCase with suffix - `product.types.ts`
- **Utils:** camelCase - `formatting.ts`
- **Tests:** Match file being tested - `products.test.ts`
- **CSS Modules:** Match component - `ProductCard.module.css`

### Code
- **Variables/Functions:** camelCase - `calculateTotal`, `itemCount`
- **Classes/Types/Interfaces:** PascalCase - `Product`, `IPaymentService`
- **Constants:** UPPER_SNAKE_CASE - `MAX_RETRY_COUNT`, `API_BASE_URL`
- **Enums:** PascalCase - `PaymentStatus`, `UserRole`
- **Database:** snake_case - `user_id`, `created_at`

### Git Branches
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/what-changed` - Refactoring
- `docs/what-changed` - Documentation

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=development|production
PORT=3000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_db
DB_USER=pos_user
DB_PASSWORD=***

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=***
JWT_REFRESH_SECRET=***
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Square Payment
SQUARE_APPLICATION_ID=***
SQUARE_ACCESS_TOKEN=***
SQUARE_ENVIRONMENT=sandbox|production

# Logging
LOG_LEVEL=debug|info|warn|error
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_NAME=POS Terminal|Admin Dashboard
REACT_APP_VERSION=1.0.0
```

## Development Phases

### Phase 1: Core Functionality (Weeks 1-12)
- Database setup
- Product management
- Basic POS terminal
- Cash transactions
- Receipt generation
- User authentication

### Phase 2: Payment Integration (Weeks 13-18)
- Square integration
- Multiple payment methods
- Refund processing
- Payment reconciliation

### Phase 3: Admin Dashboard (Weeks 19-26)
- Dashboard foundation
- Inventory management UI
- Reporting system
- User & terminal management

### Phase 4: Advanced Features (Weeks 27-34)
- Offline mode
- Data synchronization
- Advanced analytics
- Customer loyalty

### Phase 5: Optimization & Launch (Weeks 35-40)
- Performance optimization
- Security hardening
- Production deployment
- User training

## Key Business Processes

### 1. Sales Transaction Flow
1. Cashier logs in at POS terminal
2. Scans/searches products
3. Adds items to cart
4. Customer provides payment (cash/card/check)
5. Payment processed (Square for cards)
6. Inventory automatically deducted
7. Receipt printed/emailed
8. Transaction logged with audit trail

### 2. Inventory Receiving Flow
1. Create purchase order (PO) with vendor
2. Manager approves PO
3. Goods arrive from vendor
4. Receiving clerk creates receiving record
5. Scan/enter items received
6. Note quantity, condition, damages
7. System updates inventory quantities
8. Create accounts payable record if invoice included

### 3. Donation Processing Flow
1. Donor brings items to organization
2. Staff evaluates items (accept/reject)
3. Create donation record with FMV (Fair Market Value)
4. Add donated items to inventory
5. Generate tax receipt for donor (if >$250)
6. For high-value donations (>$5000), prepare Form 8283
7. Track donor contribution history

### 4. Physical Inventory Count Flow
1. Schedule count session (full, cycle, spot check)
2. Assign counters to locations/categories
3. Counters use mobile app to scan and count
4. System compares physical vs system quantities
5. Flag variances exceeding threshold (e.g., >5%)
6. Require recount for high variances
7. Manager reviews and approves reconciliation
8. System creates inventory adjustments
9. Update inventory quantities
10. Generate variance and shrinkage reports

### 5. Accounts Payable Flow
1. Receive invoice from vendor
2. Match invoice to purchase order
3. Create accounts payable record
4. Approve invoice for payment
5. Process vendor payment (check/ACH/card)
6. Allocate payment to specific invoices
7. Mark invoices as paid
8. Generate payment confirmation

## Payment Processing

### Supported Payment Methods
- **Cash** - Change calculation, drawer tracking
- **Credit/Debit Cards** - Via Square Terminal API
- **Checks** - Check number recording
- **Digital Wallets** - Apple Pay, Google Pay (via Square)
- **Split Payments** - Multiple methods per transaction

### PCI Compliance
- Card data NEVER stored in database
- All card processing delegated to Square
- Square handles tokenization
- System stores only payment references/tokens

## Security Considerations

### Authentication & Authorization
- JWT tokens with 15-minute expiration
- Refresh tokens for extended sessions
- Role-based access control (RBAC): cashier, manager, admin
- Terminal assignment restrictions
- Audit logging for all sensitive operations

### Data Protection
- Passwords: bcrypt with 10+ rounds
- Sensitive fields (tax_id, account_number): encrypted at rest (AES-256-GCM)
- TLS 1.3 for all data in transit
- Database connection pooling with SSL

### Audit Trail
- All transactions logged with user, terminal, timestamp
- Inventory adjustments require reason codes
- Price changes tracked in price_history table
- User actions logged in audit_log table
- 7-year retention for compliance

## Performance Targets

### Backend
- API response time: < 200ms (p95)
- Database query time: < 100ms (p95)
- Concurrent requests: 100+
- Uptime: 99.9%

### Frontend
- Initial load: < 2 seconds
- Transaction processing: < 30 seconds end-to-end
- Receipt print: < 3 seconds
- Offline sync: < 10 seconds after reconnection

### Database
- Connection pool: 10-50 connections
- Query timeout: 30 seconds
- Index all foreign keys
- Partition large tables (transactions, audit_log)

## Testing Strategy

### Unit Tests (80%+ coverage)
- Services and business logic
- Utilities and helpers
- React components (with React Testing Library)

### Integration Tests
- API endpoints (with Supertest)
- Database operations
- Payment processing (Square sandbox)

### E2E Tests
- Critical user flows (checkout, refund, count)
- Cross-browser testing (Chromium, Firefox)
- Hardware integration (printers, scanners)

## Common Patterns

### Service Layer Pattern
```typescript
// Service handles business logic
class ProductService {
    async createProduct(data: CreateProductDTO): Promise<Product> {
        // Validate
        // Transform
        // Save to database
        // Return result
    }
}

// Controller handles HTTP
class ProductController {
    async create(req: Request, res: Response) {
        const product = await productService.createProduct(req.body);
        res.status(201).json({ success: true, data: product });
    }
}
```

### Repository Pattern (Optional)
```typescript
class ProductRepository {
    async findById(id: string): Promise<Product | null> {
        // Database query logic
    }

    async save(product: Product): Promise<Product> {
        // Database save logic
    }
}
```

### Error Handling
```typescript
// Custom error classes
class NotFoundError extends Error {
    statusCode = 404;
    code = 'NOT_FOUND';
}

// Global error handler middleware
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR'
        }
    });
});
```

## Important Reminders

### Do's
✅ Follow TypeScript strict mode
✅ Validate all inputs at API boundary
✅ Use parameterized queries (prevent SQL injection)
✅ Implement proper error handling
✅ Write tests for new features
✅ Use transactions for multi-table updates
✅ Log errors with context
✅ Follow REST conventions
✅ Keep functions small and focused
✅ Document complex logic

### Don'ts
❌ Never commit secrets (use .env)
❌ Never use `any` type without justification
❌ Never concatenate strings in SQL queries
❌ Never ignore errors (empty catch blocks)
❌ Never store card data in database
❌ Never log sensitive information
❌ Never mutate state directly (React)
❌ Never use `var` (use `const`/`let`)
❌ Never deploy without running tests
❌ Never skip code review

## Resources

### Documentation
- [Architecture](../docs/ARCHITECTURE.md) - System overview
- [Getting Started](../docs/GETTING_STARTED.md) - Setup guide
- [API Endpoints](../docs/architecture/API_ENDPOINTS.md) - API specs
- [Data Model](../docs/architecture/DATA_MODEL.md) - Database schema
- [Implementation Guide](../docs/IMPLEMENTATION_GUIDE.md) - Development roadmap

### External Dependencies
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [React](https://react.dev/)
- [Electron](https://www.electronjs.org/)
- [Square API](https://developer.squareup.com/)
- [Express.js](https://expressjs.com/)

---

**Last Updated:** 2026-01-16
**Version:** 2.0
**Maintained By:** Development Team
