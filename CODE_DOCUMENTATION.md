# POS System - Technical Documentation

**Version**: 1.0
**Last Updated**: February 8, 2026
**Phases Documented**: 1B, 1D, 2, 3A, 3B
**Next Phase**: 3C - Inventory Reports

---

## Table of Contents

1. [Inline Code Documentation](#inline-code-documentation) ⭐ **NEW**
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Backend API Reference](#backend-api-reference)
6. [Frontend Architecture](#frontend-architecture)
7. [Authentication & Security](#authentication--security)
8. [Testing Guide](#testing-guide)
9. [Development Setup](#development-setup)
10. [Deployment Guide](#deployment-guide)

---

## Inline Code Documentation

### Overview

**All 63 core files in the POS system codebase now have comprehensive inline JSDoc documentation.** This documentation is embedded directly in the source code and provides IDE tooltips, IntelliSense, and type information.

### Documentation Coverage (100%)

| Category | Files | Status |
|----------|-------|--------|
| Backend Services | 5 | ✅ Complete |
| Backend Controllers | 7 | ✅ Complete |
| Frontend Redux Slices | 9 | ✅ Complete |
| Frontend API Services | 7 | ✅ Complete |
| React Components | 29 | ✅ Complete |
| Type Definitions | 6 | ✅ Complete |
| **Total** | **63** | **✅ 100%** |

### What's Documented

Every documented file includes:

- **File-level documentation**: `@fileoverview` and `@module` tags describing the file's purpose
- **Interface/Type documentation**: Complete `@interface`, `@property`, and `@typedef` tags
- **Function/Method documentation**: `@param`, `@returns`, `@throws`, and `@async` tags
- **Usage examples**: Multiple `@example` tags showing real-world usage patterns
- **Cross-references**: `@see` tags linking related components
- **Field constraints**: Validation rules, max lengths, and default values
- **Metadata**: `@author`, `@created`, and `@updated` timestamps

### How to Use Inline Documentation

**In VS Code / JetBrains IDEs:**
1. Hover over any function, class, interface, or component name
2. See comprehensive documentation tooltip with examples
3. Use "Go to Definition" (F12) to read full documentation
4. IntelliSense shows parameter types and descriptions as you type

**Example - Hovering over a function:**
```typescript
// Hover over 'createTransaction' to see:
/**
 * Create new transaction
 *
 * Creates completed transaction with items and payments atomically.
 * Deducts inventory automatically via database trigger.
 *
 * @async
 * @param cashierId - User ID of cashier creating transaction
 * @param data - Transaction data with items and payments
 * @returns Created transaction with generated transaction_number
 * @throws {Error} If product not found, insufficient inventory, or database error
 *
 * @example
 * const result = await createTransaction('user-123', {
 *   terminal_id: 'term-456',
 *   items: [{ product_id: 'prod-789', quantity: 2 }],
 *   payments: [{ payment_method: 'cash', amount: 10.00 }]
 * });
 */
```

### Documented File Categories

#### Backend Services (`backend/src/services/`)
- `transaction.service.ts` - Transaction business logic with atomic operations
- `customer.service.ts` - Customer CRUD operations with search
- `category.service.ts` - Category management with tree building
- `inventory.service.ts` - Inventory adjustments with validation
- `product.service.ts` - Product management and inventory tracking

#### Backend Controllers (`backend/src/controllers/`)
- `transaction.controller.ts` - Transaction API endpoints (4 endpoints)
- `customer.controller.ts` - Customer API endpoints (6 endpoints)
- `category.controller.ts` - Category API endpoints (5 endpoints)
- `inventory.controller.ts` - Inventory API endpoints (9 endpoints)
- `product.controller.ts` - Product API endpoints (7 endpoints)
- `auth.controller.ts` - Authentication endpoints (3 endpoints)
- `health.controller.ts` - Health check endpoint

#### Frontend Redux Slices (`pos-client/src/store/slices/`)
- `auth.slice.ts` - Authentication state management
- `products.slice.ts` - Product catalog state
- `cart.slice.ts` - Shopping cart state with calculations
- `checkout.slice.ts` - Checkout flow state
- `customers.slice.ts` - Customer management state
- `categories.slice.ts` - Category tree state
- `inventory.slice.ts` - Inventory adjustment state
- `inventory-reports.slice.ts` - Inventory reports state
- `transactions.slice.ts` - Transaction history state

#### Frontend API Services (`pos-client/src/services/api/`)
- `auth.api.ts` - Authentication API client (2 methods)
- `product.api.ts` - Product API client (3 methods)
- `transaction.api.ts` - Transaction API client (4 methods)
- `customer.api.ts` - Customer API client (6 methods)
- `category.api.ts` - Category API client (5 methods)
- `inventory.api.ts` - Inventory API client (4 methods)
- `inventory-reports.api.ts` - Inventory reports API client (5 functions)

#### React Components (`pos-client/src/components/`)
All 29 React components documented including:
- **Product**: SearchBar, ProductCard, ProductGrid, ProductPanel
- **Cart**: CartItem, CartSummary, CartActions, CartPanel
- **Checkout**: CheckoutModal, CashPaymentInput, PaymentList, PaymentMethodSelector
- **Transaction**: FilterBar, TransactionRow, TransactionList, TransactionDetailsModal, VoidTransactionModal
- **Customer**: CustomerFormModal, CustomerList, CustomerSelector
- **Category**: CategoryForm, CategoryTree
- **Inventory**: AdjustmentForm, LowStockReport, OutOfStockReport, MovementReport, CategorySummaryReport, ValuationReport
- **Common**: Pagination

#### Type Definitions (`pos-client/src/types/`)
- `api.types.ts` - Standard API response wrapper
- `product.types.ts` - Product entity and query types
- `transaction.types.ts` - Transaction, payment, and item types
- `customer.types.ts` - Customer entity and query types
- `category.types.ts` - Category entity with tree structure
- `inventory.types.ts` - Inventory adjustment types

### Documentation Progress Tracking

See `INLINE_DOCUMENTATION_PROGRESS.md` for detailed progress tracking and file-by-file status.

### Best Practices for New Code

When adding new files to the codebase, follow the established documentation pattern:

1. **File-level documentation** at the top:
   ```typescript
   /**
    * @fileoverview Brief description of file purpose
    *
    * Detailed explanation of what this file does and how it fits
    * into the overall system architecture.
    *
    * @module path/to/module
    * @author Your Name <email@example.com>
    * @created YYYY-MM-DD (Phase X)
    * @updated YYYY-MM-DD (Last change)
    */
   ```

2. **Interface/Type documentation** with property tags:
   ```typescript
   /**
    * Brief interface description
    *
    * Detailed explanation of purpose and usage.
    *
    * @interface InterfaceName
    * @property {Type} propertyName - Description with constraints
    *
    * @example
    * const example: InterfaceName = { ... };
    */
   ```

3. **Function documentation** with full tags:
   ```typescript
   /**
    * Brief function description
    *
    * Detailed explanation of what the function does.
    *
    * @async
    * @param {Type} paramName - Parameter description
    * @returns {ReturnType} Description of return value
    * @throws {ErrorType} When this error occurs
    *
    * @example
    * const result = await functionName(param);
    */
   ```

---

## Architecture Overview

### System Design

The POS System follows a modern three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - React 18 + TypeScript                                   │
│  - Redux Toolkit (state management)                        │
│  - React Router (navigation)                               │
│  - Webpack Dev Server (port 3001)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Express)                     │
│  - Node.js + Express + TypeScript                          │
│  - JWT Authentication                                       │
│  - Zod Validation                                          │
│  - Service Layer Pattern                                   │
│  - Port 3000                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│                Database Layer (PostgreSQL)                  │
│  - PostgreSQL 13+                                          │
│  - Database Triggers (auto-numbering, inventory updates)   │
│  - Stored Functions (business logic)                       │
│  - Port 5432                                               │
│                                                             │
│                Cache Layer (Redis)                          │
│  - Session storage                                         │
│  - Port 6379                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

**Backend**:
- **Service Layer Pattern**: Business logic separated into service classes
- **Controller Pattern**: Request handling separated from business logic
- **Repository Pattern** (implicit): Services interact with database
- **Middleware Pattern**: Authentication, validation, error handling

**Frontend**:
- **Container/Component Pattern**: Smart (connected) vs presentational components
- **Redux Flux Pattern**: Unidirectional data flow
- **Async Thunk Pattern**: Async operations with Redux Toolkit
- **Modal Pattern**: Dialogs and forms in modal overlays

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime environment |
| Express | 4.x | Web framework |
| TypeScript | 5.x | Type safety |
| PostgreSQL | 13+ | Database |
| Redis | 7.x | Cache/sessions |
| JWT | - | Authentication |
| Zod | 3.x | Validation |
| Jest | 29.x | Testing |
| bcrypt | 5.x | Password hashing |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Redux Toolkit | 2.x | State management |
| React Router | 6.x | Routing |
| Webpack | 5.x | Bundler |
| Jest | 29.x | Testing |
| React Testing Library | 14.x | Component testing |
| Axios | 1.x | HTTP client |

### Development Tools

- ESLint - Code linting
- Prettier - Code formatting
- Git - Version control
- npm - Package management

---

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20) DEFAULT 'cashier', -- 'admin', 'manager', 'cashier'
  assigned_terminal_id UUID REFERENCES terminals(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### terminals
```sql
CREATE TABLE terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_number VARCHAR(50) UNIQUE NOT NULL, -- TERM-XXXXXX
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_number VARCHAR(50) UNIQUE NOT NULL, -- PROD-XXXXXX
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  category_id UUID REFERENCES categories(id),
  base_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  tax_rate DECIMAL(5, 2) DEFAULT 0.00,
  quantity_in_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_number VARCHAR(50) UNIQUE NOT NULL, -- CAT-XXXXXX
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number VARCHAR(50) UNIQUE NOT NULL, -- CUST-XXXXXX
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL, -- TXN-XXXXXX
  terminal_id UUID NOT NULL REFERENCES terminals(id),
  customer_id UUID REFERENCES customers(id),
  cashier_id UUID NOT NULL REFERENCES users(id),
  transaction_date TIMESTAMP DEFAULT NOW(),
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'draft', 'completed', 'voided', 'refunded'
  void_reason TEXT,
  voided_at TIMESTAMP,
  voided_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### transaction_items
```sql
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_snapshot JSONB NOT NULL, -- Stores product details at transaction time
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'credit_card', 'debit_card', etc.
  amount DECIMAL(10, 2) NOT NULL,
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### inventory_adjustments
```sql
CREATE TABLE inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(50) UNIQUE NOT NULL, -- ADJ-XXXXXX
  product_id UUID NOT NULL REFERENCES products(id),
  adjustment_type VARCHAR(50) NOT NULL, -- 'damage', 'theft', 'found', 'correction', 'initial'
  quantity_change INTEGER NOT NULL,
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID NOT NULL REFERENCES users(id),
  adjustment_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inv_adj_product ON inventory_adjustments(product_id);
CREATE INDEX idx_inv_adj_date ON inventory_adjustments(adjustment_date);
CREATE INDEX idx_inv_adj_type ON inventory_adjustments(adjustment_type);
```

### Database Functions

#### generate_transaction_number()
```sql
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM transactions
  WHERE transaction_number IS NOT NULL;

  NEW.transaction_number := 'TXN-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### generate_customer_number()
```sql
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM customers
  WHERE customer_number IS NOT NULL;

  NEW.customer_number := 'CUST-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### generate_category_number()
```sql
CREATE OR REPLACE FUNCTION generate_category_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(category_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM categories
  WHERE category_number IS NOT NULL;

  NEW.category_number := 'CAT-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### generate_adjustment_number()
```sql
CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM inventory_adjustments
  WHERE adjustment_number IS NOT NULL;

  NEW.adjustment_number := 'ADJ-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### apply_inventory_adjustment()
```sql
CREATE OR REPLACE FUNCTION apply_inventory_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  current_qty INTEGER;
  new_qty INTEGER;
BEGIN
  -- Get current quantity
  SELECT quantity_in_stock INTO current_qty
  FROM products WHERE id = NEW.product_id;

  -- Calculate new quantity
  new_qty := current_qty + NEW.quantity_change;

  -- Prevent negative inventory
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative inventory';
  END IF;

  -- Update product quantity
  UPDATE products
  SET quantity_in_stock = new_qty, updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### update_inventory_on_transaction()
```sql
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct quantity for each item in the transaction
  UPDATE products p
  SET quantity_in_stock = quantity_in_stock - ti.quantity,
      updated_at = NOW()
  FROM transaction_items ti
  WHERE ti.transaction_id = NEW.id
    AND ti.product_id = p.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Database Triggers

```sql
-- Auto-generate transaction numbers
CREATE TRIGGER set_transaction_number
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION generate_transaction_number();

-- Auto-generate customer numbers
CREATE TRIGGER set_customer_number
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION generate_customer_number();

-- Auto-generate category numbers
CREATE TRIGGER set_category_number
BEFORE INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION generate_category_number();

-- Auto-generate adjustment numbers
CREATE TRIGGER set_adjustment_number
BEFORE INSERT ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION generate_adjustment_number();

-- Apply inventory adjustment
CREATE TRIGGER apply_adjustment_trigger
AFTER INSERT ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION apply_inventory_adjustment();

-- Update inventory on transaction
CREATE TRIGGER update_inventory_trigger
AFTER INSERT ON transactions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_inventory_on_transaction();
```

---

## Backend API Reference

**Base URL**: `http://localhost:3000/api/v1`
**Authentication**: Bearer token in `Authorization` header

### Authentication

#### POST /auth/login
Login and receive JWT token.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "full_name": "Admin User",
      "role": "admin",
      "assigned_terminal_id": "uuid"
    }
  }
}
```

#### POST /auth/logout
Logout and invalidate token.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer {token}"
```

---

### Products

#### GET /products
Get all products with optional filters.

**Query Parameters**:
- `is_active` (boolean): Filter by active status
- `category_id` (UUID): Filter by category
- `search` (string): Search by name, SKU, or barcode

**Request**:
```bash
curl http://localhost:3000/api/v1/products?is_active=true \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_number": "PROD-000001",
      "name": "Water Bottle",
      "sku": "WTR-001",
      "barcode": "1234567890",
      "category_id": "uuid",
      "base_price": 1.50,
      "quantity_in_stock": 100,
      "is_active": true
    }
  ]
}
```

#### GET /products/:id
Get single product by ID.

#### POST /products
Create new product (admin only).

#### PUT /products/:id
Update product (admin only).

#### DELETE /products/:id
Soft delete product (admin only).

---

### Transactions

#### POST /transactions
Create new transaction.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "terminal_id": "uuid",
    "customer_id": "uuid",
    "items": [
      {
        "product_id": "uuid",
        "quantity": 2,
        "unit_price": 1.50
      }
    ],
    "payments": [
      {
        "payment_method": "cash",
        "amount": 10.00
      }
    ],
    "subtotal": 3.00,
    "tax_amount": 0.24,
    "total_amount": 3.24
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "uuid",
    "transaction_number": "TXN-000123",
    "total_amount": 3.24,
    "status": "completed",
    "change_due": 6.76
  }
}
```

#### GET /transactions
Get all transactions with filters and pagination.

**Query Parameters**:
- `transaction_number` (string): Filter by transaction number
- `status` (string): Filter by status
- `start_date` (ISO date): Filter from date
- `end_date` (ISO date): Filter to date
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Request**:
```bash
curl "http://localhost:3000/api/v1/transactions?status=completed&page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "transaction_number": "TXN-000123",
        "transaction_date": "2026-02-08T00:00:00.000Z",
        "total_amount": 3.24,
        "status": "completed",
        "cashier_name": "John Doe",
        "customer_name": "Jane Smith"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### GET /transactions/:id
Get single transaction with items and payments.

**Request**:
```bash
curl http://localhost:3000/api/v1/transactions/{id} \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "transaction_number": "TXN-000123",
    "transaction_date": "2026-02-08T00:00:00.000Z",
    "subtotal": 3.00,
    "tax_amount": 0.24,
    "total_amount": 3.24,
    "status": "completed",
    "cashier_name": "John Doe",
    "customer_name": "Jane Smith",
    "items": [
      {
        "product_name": "Water Bottle",
        "quantity": 2,
        "unit_price": 1.50,
        "line_total": 3.00
      }
    ],
    "payments": [
      {
        "payment_method": "cash",
        "amount": 10.00
      }
    ]
  }
}
```

#### PUT /transactions/:id/void
Void a transaction with reason.

**Request**:
```bash
curl -X PUT http://localhost:3000/api/v1/transactions/{id}/void \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer returned items"
  }'
```

---

### Customers

#### POST /customers
Create new customer.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "address_line1": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "postal_code": "62701",
    "country": "USA"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customer_number": "CUST-000001",
    "full_name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### GET /customers
Get all customers with search.

**Query Parameters**:
- `search` (string): Search by name, email, or phone

**Request**:
```bash
curl "http://localhost:3000/api/v1/customers?search=john" \
  -H "Authorization: Bearer {token}"
```

#### GET /customers/:id
Get customer by ID.

#### PUT /customers/:id
Update customer.

#### DELETE /customers/:id
Soft delete customer.

---

### Categories

#### POST /categories
Create new category.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Beverages",
    "description": "All beverages",
    "parent_category_id": null,
    "display_order": 1
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category_number": "CAT-000001",
    "name": "Beverages",
    "description": "All beverages",
    "is_active": true
  }
}
```

#### GET /categories
Get all categories (tree structure).

**Query Parameters**:
- `active_only` (boolean): Filter active categories only

**Request**:
```bash
curl "http://localhost:3000/api/v1/categories?active_only=true" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category_number": "CAT-000001",
      "name": "Beverages",
      "product_count": 15,
      "children": [
        {
          "id": "uuid",
          "category_number": "CAT-000002",
          "name": "Soft Drinks",
          "parent_category_id": "uuid",
          "product_count": 8,
          "children": []
        }
      ]
    }
  ]
}
```

#### GET /categories/:id
Get category by ID with children.

#### PUT /categories/:id
Update category.

#### DELETE /categories/:id
Soft delete category (validates no products or children).

---

### Inventory

#### POST /inventory/adjustments
Create inventory adjustment.

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/inventory/adjustments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid",
    "adjustment_type": "damage",
    "quantity_change": -5,
    "reason": "Water damage during delivery",
    "notes": "5 units damaged, disposed"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "adjustment_number": "ADJ-000001",
    "product_id": "uuid",
    "adjustment_type": "damage",
    "quantity_change": -5,
    "old_quantity": 100,
    "new_quantity": 95,
    "reason": "Water damage during delivery",
    "adjusted_by": "uuid",
    "adjustment_date": "2026-02-08T00:00:00.000Z"
  }
}
```

#### GET /inventory/adjustments
Get all adjustments with filters.

**Query Parameters**:
- `product_id` (UUID): Filter by product
- `adjustment_type` (string): Filter by type
- `start_date` (ISO date): Filter from date
- `end_date` (ISO date): Filter to date
- `page` (number): Page number
- `limit` (number): Items per page

**Request**:
```bash
curl "http://localhost:3000/api/v1/inventory/adjustments?adjustment_type=damage&page=1" \
  -H "Authorization: Bearer {token}"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "adjustment_number": "ADJ-000001",
        "product_name": "Water Bottle",
        "product_sku": "WTR-001",
        "adjustment_type": "damage",
        "quantity_change": -5,
        "old_quantity": 100,
        "new_quantity": 95,
        "reason": "Water damage",
        "adjuster_name": "Admin User",
        "adjustment_date": "2026-02-08T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### GET /inventory/adjustments/:id
Get adjustment by ID.

#### GET /inventory/products/:productId/history
Get adjustment history for a specific product.

**Request**:
```bash
curl http://localhost:3000/api/v1/inventory/products/{productId}/history \
  -H "Authorization: Bearer {token}"
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── Routes
│   ├── LoginPage
│   ├── POSPage
│   │   ├── ProductPanel
│   │   │   ├── SearchBar
│   │   │   └── ProductGrid
│   │   │       └── ProductCard
│   │   ├── CartPanel
│   │   │   ├── CartItem
│   │   │   ├── CartSummary
│   │   │   └── CartActions
│   │   └── CheckoutModal
│   │       ├── PaymentMethodSelector
│   │       ├── CashPaymentInput
│   │       └── PaymentList
│   ├── TransactionHistoryPage
│   │   ├── FilterBar
│   │   ├── TransactionList
│   │   │   └── TransactionRow
│   │   ├── TransactionDetailsModal
│   │   └── VoidTransactionModal
│   ├── CustomersPage
│   │   ├── CustomerSearchBar
│   │   ├── CustomerList
│   │   │   └── CustomerCard
│   │   └── CustomerForm
│   ├── CategoriesPage
│   │   ├── CategoryTree
│   │   └── CategoryForm
│   └── InventoryPage
│       ├── AdjustmentForm
│       └── InventoryHistoryPage
└── Common Components
    ├── Pagination
    ├── LoadingSpinner
    └── ErrorMessage
```

### Redux Store Structure

```typescript
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null
  },
  products: {
    items: Product[],
    isLoading: boolean,
    error: string | null
  },
  cart: {
    items: CartItem[],
    subtotal: number,
    taxAmount: number,
    total: number
  },
  checkout: {
    isProcessing: boolean,
    error: string | null,
    lastTransaction: Transaction | null
  },
  transactions: {
    transactions: Transaction[],
    selectedTransaction: Transaction | null,
    pagination: Pagination,
    filters: TransactionFilters,
    loading: boolean,
    error: string | null
  },
  customers: {
    customers: Customer[],
    selectedCustomer: Customer | null,
    loading: boolean,
    error: string | null
  },
  categories: {
    categories: CategoryWithChildren[],
    selectedCategory: Category | null,
    loading: boolean,
    error: string | null
  },
  inventory: {
    adjustments: InventoryAdjustment[],
    selectedAdjustment: InventoryAdjustment | null,
    productHistory: InventoryAdjustment[],
    pagination: Pagination,
    filters: AdjustmentFilters,
    loading: boolean,
    error: string | null
  }
}
```

### Routing

**Public Routes**:
- `/login` - LoginPage

**Private Routes** (require authentication):
- `/` - POSPage (default after login)
- `/pos/history` - TransactionHistoryPage
- `/customers` - CustomersPage
- `/categories` - CategoriesPage
- `/inventory` - InventoryPage
- `/inventory/history` - InventoryHistoryPage

### State Management Patterns

#### Async Thunks (Redux Toolkit)
```typescript
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (query: ProductListQuery) => {
    return await productApi.getProducts(query);
  }
);

// Usage in component
dispatch(fetchProducts({ is_active: true }));
```

#### Slice Pattern
```typescript
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch products';
      });
  }
});
```

---

## Authentication & Security

### JWT Authentication Flow

1. **Login**:
   - User submits credentials
   - Backend validates, generates JWT token
   - Token includes: `userId`, `username`, `role`, `terminalId`
   - Frontend stores token in Redux + localStorage

2. **Protected Requests**:
   - Frontend includes token in `Authorization: Bearer {token}` header
   - Backend middleware (`authenticateToken`) verifies token
   - Decoded user info attached to `req.user`

3. **Logout**:
   - Frontend clears token from Redux + localStorage
   - Backend can optionally blacklist token (not implemented yet)

### Middleware Stack

```
Request → CORS → JSON Parser → authenticateToken → Route Handler
```

**authenticateToken Middleware**:
```typescript
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

### Security Best Practices

1. **Password Hashing**: bcrypt with salt rounds = 10
2. **SQL Injection Prevention**: Parameterized queries (pg library)
3. **Input Validation**: Zod schemas on all endpoints
4. **XSS Prevention**: React escapes by default, no dangerouslySetInnerHTML
5. **CORS**: Configured for localhost in development
6. **Soft Deletes**: `is_active` flag prevents accidental data loss
7. **Role-Based Access Control**: `role` field in JWT (admin, manager, cashier)

---

## Testing Guide

### Running Tests

**Backend**:
```bash
cd backend
npm test                 # Run all tests
npm run test:coverage    # With coverage report
npm run test:watch       # Watch mode
```

**Frontend**:
```bash
cd pos-client
npm test                 # Run all tests
npm run test:coverage    # With coverage report
npm run test:watch       # Watch mode
```

### Test Structure

**Backend Tests**:
- `backend/src/__tests__/unit/services/` - Service layer unit tests
- `backend/src/__tests__/integration/` - API endpoint integration tests
- `backend/src/__tests__/setup.ts` - Test configuration

**Frontend Tests**:
- `pos-client/src/__tests__/unit/slices/` - Redux slice tests
- `pos-client/src/__tests__/unit/components/` - Component tests
- `pos-client/src/__tests__/setup.ts` - Test configuration

### Writing Tests

**Backend Service Test Example**:
```typescript
describe('TransactionService', () => {
  describe('createTransaction', () => {
    it('should create transaction and return transaction number', async () => {
      const data = {
        terminal_id: 'uuid',
        items: [{ product_id: 'uuid', quantity: 2, unit_price: 1.50 }],
        payments: [{ payment_method: 'cash', amount: 10.00 }],
        subtotal: 3.00,
        tax_amount: 0.24,
        total_amount: 3.24
      };

      const result = await transactionService.createTransaction('user-id', data);

      expect(result.transaction_number).toMatch(/TXN-\d{6}/);
      expect(result.total_amount).toBe(3.24);
    });
  });
});
```

**Frontend Redux Test Example**:
```typescript
describe('cart slice', () => {
  it('should add item to cart', () => {
    const initialState = { items: [], subtotal: 0, taxAmount: 0, total: 0 };
    const product = { id: '1', name: 'Water', base_price: 1.50 };

    const state = cartReducer(initialState, addToCart(product));

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(1);
    expect(state.subtotal).toBe(1.50);
  });
});
```

### Test Coverage Goals

- **Target**: 85-90% coverage
- **Critical Paths**: 100% coverage (authentication, payments, inventory updates)
- **UI Components**: Focus on user interactions, not styling

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Redis 7+
- Git

### Initial Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/pos-system.git
   cd pos-system
   ```

2. **Install Dependencies**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../pos-client
   npm install
   ```

3. **Database Setup**:
   ```bash
   # Create database and user
   psql -U postgres
   CREATE DATABASE pos_db;
   CREATE USER pos_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;
   \q

   # Run migrations
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

4. **Environment Variables**:

   **backend/.env**:
   ```
   PORT=3000
   DATABASE_URL=postgresql://pos_user:password@localhost:5432/pos_db
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```

   **pos-client/.env**:
   ```
   REACT_APP_API_URL=http://localhost:3000/api/v1
   ```

5. **Start Services**:
   ```bash
   # Start PostgreSQL
   brew services start postgresql@14  # macOS
   sudo systemctl start postgresql    # Linux

   # Start Redis
   brew services start redis          # macOS
   sudo systemctl start redis         # Linux

   # Start Backend (Terminal 1)
   cd backend
   npm run dev

   # Start Frontend (Terminal 2)
   cd pos-client
   npm run dev:webpack
   ```

6. **Access Application**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Login: username `admin`, password `admin123`

### Development Workflow

1. **Create Feature Branch**:
   ```bash
   ./git-start-feature.sh phase-name
   ```

2. **Run Tests (TDD)**:
   ```bash
   cd backend && npm test
   cd pos-client && npm test
   ```

3. **Implement Feature**

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat: description"
   ```

5. **Merge to Main**:
   ```bash
   git checkout main
   git merge feature/phase-name
   git push origin main
   ```

---

## Deployment Guide

### Production Environment Variables

**backend/.env.production**:
```
PORT=3000
DATABASE_URL=postgresql://user:pass@prod-host:5432/pos_db
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=generate-strong-secret-key
NODE_ENV=production
```

### Build Process

**Backend**:
```bash
cd backend
npm run build  # Compiles TypeScript to dist/
npm start      # Runs compiled code
```

**Frontend**:
```bash
cd pos-client
npm run build  # Creates optimized production build in build/
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Seed data loaded (if needed)
- [ ] SSL/TLS certificates installed
- [ ] CORS configured for production domain
- [ ] JWT secret is strong and unique
- [ ] Passwords changed from defaults
- [ ] Backups configured
- [ ] Monitoring and logging enabled
- [ ] All tests passing

### Docker Deployment (Optional)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: pos_db
      POSTGRES_USER: pos_user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://pos_user:password@postgres:5432/pos_db
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./pos-client
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## Appendix

### Useful Commands

**Database**:
```bash
# Connect to database
psql -U pos_user -d pos_db

# Backup database
pg_dump -U pos_user pos_db > backup.sql

# Restore database
psql -U pos_user pos_db < backup.sql
```

**Git**:
```bash
# Check status
git status

# View logs
git log --oneline --graph --all

# Stash changes
git stash
git stash pop
```

**NPM**:
```bash
# Update dependencies
npm update

# Audit security
npm audit
npm audit fix
```

### Common Issues

**Issue**: Port already in use
**Solution**:
```bash
lsof -ti:3000 | xargs kill -9  # Kill process on port 3000
lsof -ti:3001 | xargs kill -9  # Kill process on port 3001
```

**Issue**: Database connection refused
**Solution**:
```bash
pg_isready -h localhost -p 5432
brew services restart postgresql@14
```

**Issue**: Redis connection error
**Solution**:
```bash
redis-cli ping
brew services restart redis
```

---

**Documentation Version**: 1.1
**Last Updated**: February 8, 2026
**Maintained By**: Development Team
**Major Updates**:
- v1.1 (Feb 8, 2026): Added comprehensive inline JSDoc documentation (63 files, 100% coverage)
- v1.0 (Feb 8, 2026): Initial technical documentation
**Next Update**: After Phase 3C implementation
