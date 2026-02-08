# Phase 2: Customer Management - Implementation Plan

## Overview
Implement customer management functionality to track customer information, purchase history, and enable customer selection during transactions. This phase builds on the existing transaction system to link transactions to customers.

## Database Schema

### Existing Table: `customers`
Already exists with proper structure:
```sql
- id (UUID, PK)
- customer_number (VARCHAR, UNIQUE) - Will be auto-generated
- first_name (VARCHAR)
- last_name (VARCHAR)
- email (VARCHAR, UNIQUE, nullable)
- phone (VARCHAR, nullable)
- total_spent (DECIMAL, default 0)
- total_transactions (INTEGER, default 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- is_active (BOOLEAN, default true)
```

### Database Functions & Triggers to Create

1. **Customer Number Generator Function**
```sql
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL THEN
    NEW.customer_number := 'CUST-' || LPAD(nextval('customer_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_number();
```

2. **Update Customer Total Spent Trigger**
```sql
CREATE OR REPLACE FUNCTION update_customer_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      total_spent = total_spent + NEW.total_amount,
      total_transactions = total_transactions + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_totals_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_total_spent();
```

## Backend Implementation

### 1. Types (`backend/src/types/customer.types.ts`)
```typescript
export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  total_spent: number;
  total_transactions: number;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### 2. Service Layer (`backend/src/services/customer.service.ts`)
Following the product.service.ts pattern:
- `getCustomers(query)` - List with pagination and search
- `getCustomerById(id)` - Get single customer
- `createCustomer(input)` - Create new customer
- `updateCustomer(id, input)` - Update customer
- `deleteCustomer(id)` - Soft delete (set is_active = false)
- `searchCustomers(query)` - Quick search by name/phone/email (for customer selector)

### 3. Controller Layer (`backend/src/controllers/customer.controller.ts`)
Following the product.controller.ts pattern with Zod validation:
- Validation schemas for create/update
- Error handling with try-catch
- Type-safe request/response handling

### 4. Routes (`backend/src/routes/customer.routes.ts`)
```typescript
GET    /api/customers          - List customers (paginated)
GET    /api/customers/:id      - Get customer by ID
POST   /api/customers          - Create customer
PUT    /api/customers/:id      - Update customer
DELETE /api/customers/:id      - Soft delete customer
GET    /api/customers/search   - Quick search for selector
```

### 5. Integration
- Register routes in `backend/src/index.ts`: `app.use('/api/customers', customerRoutes);`
- Ensure `authenticate` middleware is applied

## Frontend Implementation

### 1. Types (`pos-client/src/types/customer.ts`)
Mirror backend types, plus:
```typescript
export interface CustomerSearchResult {
  id: string;
  customer_number: string;
  name: string; // Combined first_name + last_name
  phone: string | null;
  email: string | null;
}
```

### 2. API Client (`pos-client/src/services/api/customer.api.ts`)
Following product.api.ts pattern:
- `getCustomers(query)` - List with filters
- `getCustomerById(id)` - Get single customer
- `createCustomer(data)` - Create new customer
- `updateCustomer(id, data)` - Update customer
- `deleteCustomer(id)` - Delete customer
- `searchCustomers(query)` - Quick search

### 3. Redux Slice (`pos-client/src/store/slices/customers.slice.ts`)
Following products.slice.ts pattern:
```typescript
State:
- items: Customer[]
- selectedCustomer: Customer | null
- filters: { search: string, isActive: boolean }
- pagination: { page, limit, total, totalPages }
- loading: boolean
- error: string | null

Async Thunks:
- fetchCustomers
- fetchCustomerById
- createCustomer
- updateCustomer
- deleteCustomer
- searchCustomers

Reducers:
- setFilters
- setSelectedCustomer
- clearSelectedCustomer
- setPage
```

### 4. Customer Management Page (`pos-client/src/pages/CustomersPage.tsx`)
Main interface for customer CRUD:
- Header with "New Customer" button
- Search/filter bar
- Customer list table (number, name, email, phone, total_spent, actions)
- Pagination
- Edit/Delete actions per row
- CustomerFormModal for create/edit

### 5. Customer Form Modal (`pos-client/src/components/Customer/CustomerFormModal.tsx`)
Modal for creating/editing customers:
- Form fields: first_name, last_name, email, phone
- Validation
- Submit to createCustomer or updateCustomer thunk
- Close and refresh list on success

### 6. Customer Selector Component (`pos-client/src/components/Customer/CustomerSelector.tsx`)
Lightweight search component for POS checkout:
- Debounced search input (300ms)
- Dropdown with search results
- Display: customer_number, name, phone
- Select customer callback
- "Create New Customer" quick action
- Clear selection option

### 7. Integration with Checkout
Modify `pos-client/src/components/Checkout/CheckoutModal.tsx`:
- Add CustomerSelector at top of modal
- Store selected customer_id in local state
- Pass customer_id to createTransaction API call
- Display selected customer info in receipt

### 8. Routing
Add route in `pos-client/src/App.tsx`:
```typescript
<Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
```

Add navigation link in POSPage.tsx header:
```typescript
<button onClick={() => navigate('/customers')}>👥 Customers</button>
```

## Implementation Order

### Phase 1: Database Setup (1-3)
1. Create migration file for customer_number sequence and trigger
2. Create migration file for update_customer_total_spent trigger
3. Run migrations and verify in PostgreSQL

### Phase 2: Backend Implementation (4-10)
4. Create customer.types.ts with all interfaces
5. Create customer.service.ts with all CRUD operations
6. Create customer.controller.ts with Zod validation
7. Create customer.routes.ts
8. Register routes in index.ts
9. Test all endpoints with curl/Postman
10. Verify triggers work (create transaction, check customer totals)

### Phase 3: Frontend Types & API (11-13)
11. Create customer.ts types
12. Create customer.api.ts with all methods
13. Create customers.slice.ts with state management

### Phase 4: Customer Management UI (14-20)
14. Create CustomersPage.tsx layout
15. Create CustomerListTable component
16. Create CustomerFormModal component
17. Implement create customer flow
18. Implement edit customer flow
19. Implement delete customer flow
20. Add routing and navigation

### Phase 5: Customer Selector (21-25)
21. Create CustomerSelector component
22. Implement debounced search
23. Implement dropdown with results
24. Implement "Create New Customer" quick action
25. Test selection flow

### Phase 6: Checkout Integration (26-28)
26. Add CustomerSelector to CheckoutModal
27. Update createTransaction to include customer_id
28. Update receipt to show customer info

### Phase 7: Testing & Polish (29-31)
29. End-to-end test: Create customer → Select in checkout → Complete transaction → Verify totals updated
30. Test edge cases: duplicate email, empty search, pagination
31. Polish UI: loading states, error messages, empty states

## Testing Checklist

### Backend Tests
- [ ] Create customer with all fields
- [ ] Create customer with minimal fields (no email/phone)
- [ ] Duplicate email validation fails
- [ ] Customer number auto-generated correctly (CUST-000001, CUST-000002...)
- [ ] List customers with pagination
- [ ] Search customers by name/email/phone
- [ ] Update customer details
- [ ] Soft delete customer (is_active = false)
- [ ] Complete transaction with customer_id → total_spent and total_transactions increase
- [ ] Complete transaction without customer_id → no customer update

### Frontend Tests
- [ ] Navigate to /customers page
- [ ] View customer list with pagination
- [ ] Search customers by name
- [ ] Create new customer via form modal
- [ ] Edit existing customer
- [ ] Delete customer (soft delete)
- [ ] Customer selector in checkout: search and select customer
- [ ] Customer selector: create new customer inline
- [ ] Complete transaction with customer → verify customer info on receipt
- [ ] Complete transaction without customer → works normally
- [ ] View customer in list after transaction → total_spent and total_transactions updated

### Edge Cases
- [ ] Create customer with same email → error
- [ ] Search with no results → "No customers found"
- [ ] Customer selector with no results → show "Create New Customer"
- [ ] Pagination at boundaries (first/last page)
- [ ] Very long customer names → UI handles gracefully
- [ ] Customer with $0 total_spent → displays correctly

## Success Criteria
1. Customers can be created, viewed, edited, and deleted (soft)
2. Customer numbers auto-generate sequentially (CUST-000001, etc.)
3. Customer selector in checkout allows quick search and selection
4. Transactions linked to customers update total_spent and total_transactions automatically
5. Customer management page shows accurate totals
6. All CRUD operations work with proper validation
7. UI is consistent with existing POS design patterns

## Notes
- Follow existing patterns from products and transactions
- Use inline styles consistent with current codebase
- Maintain three-layer backend architecture
- Use Redux Toolkit with async thunks
- Implement proper error handling and loading states
- Customer linking is optional (transactions can still be created without customer)
