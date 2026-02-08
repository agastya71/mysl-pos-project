# Phase 2: Customer Management - Quick Start Guide

## 🚀 Access the Features

### 1. Customer Management Page
**URL**: http://localhost:3001/customers

**How to Get There:**
- Login to POS
- Click "👥 Customers" button in header

**What You Can Do:**
- View all customers in a table
- Search by name, email, phone, or customer number
- Create new customers (+ New Customer button)
- Edit existing customers (Edit button per row)
- See total spent and transaction count per customer

### 2. Customer in Checkout
**Where**: Checkout modal when processing a sale

**How to Use:**
1. Add items to cart
2. Click "Checkout"
3. See "Customer (Optional)" section at top
4. Type to search for existing customer
5. OR click "+ New" to create customer on-the-fly
6. Complete transaction
7. Receipt shows customer info
8. Customer totals automatically updated!

## 🎯 Quick Test

### Test Customer Creation
```bash
# Login and create a customer
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  jq -r '.data.tokens.accessToken')

curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Alice","last_name":"Smith","email":"alice@example.com","phone":"555-1234"}' \
  http://localhost:3000/api/v1/customers | jq '.'

# Response shows auto-generated customer_number like "CUST-000001"
```

### Test Search
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/customers/search?q=Alice" | jq '.'
```

### Test List with Pagination
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/customers?page=1&limit=10" | jq '.'
```

## 📊 Database Schema

### Customers Table
```sql
customers
├── id (UUID, PK)
├── customer_number (VARCHAR, auto-generated: CUST-000001)
├── first_name (VARCHAR)
├── last_name (VARCHAR)
├── email (VARCHAR, unique, nullable)
├── phone (VARCHAR, nullable)
├── loyalty_points (INTEGER, default 0)
├── total_spent (NUMERIC, default 0) ← Auto-updated!
├── total_transactions (INTEGER, default 0) ← Auto-updated!
├── is_active (BOOLEAN, default true)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### Triggers
- `set_customer_number` - Auto-generates CUST-XXXXXX on INSERT
- `update_customer_totals_on_transaction` - Updates totals when transaction created/voided

## 🎨 UI Components

### CustomersPage
- **Location**: `/customers`
- **Features**: List, search, create, edit
- **Layout**: Header + Search Bar + Table + Pagination

### CustomerFormModal
- **Trigger**: Click "+ New Customer" or "Edit"
- **Fields**: First Name*, Last Name*, Email, Phone
- **Validation**: Required names, valid email format

### CustomerSelector
- **Location**: Inside CheckoutModal
- **Features**: Search, dropdown results, inline create
- **Behavior**: Debounced search (300ms), min 2 characters

## 🔄 Data Flow Examples

### Create Customer Flow
```
User → "+ New Customer" → Form Modal
  → Enter name, email, phone
  → Click "Create"
  → POST /api/v1/customers
  → Database trigger generates customer_number
  → Redux state updated
  → Modal closes
  → List refreshes with new customer
```

### Checkout with Customer Flow
```
POS Page → Add items → "Checkout"
  → CustomerSelector: Type "Alice"
  → Debounced search (300ms wait)
  → GET /api/v1/customers/search?q=Alice
  → Dropdown shows: "Alice Smith (CUST-000001)"
  → Click to select
  → Continue checkout → "Complete Transaction"
  → POST /api/v1/transactions (includes customer_id)
  → Database trigger updates customer totals:
      - total_spent += transaction.total_amount
      - total_transactions += 1
  → Receipt shows: "Customer: Alice Smith (CUST-000001)"
  → Cart cleared → Ready for next transaction
```

## 🧪 Testing Checklist

### Backend API
- [x] Create customer → customer_number auto-generated
- [x] List customers → pagination works
- [x] Search customers → finds by name/email/phone
- [x] Get customer by ID → returns full details
- [x] Update customer → changes saved
- [x] Delete customer → soft delete (is_active = false)
- [x] Duplicate email → validation error

### Frontend UI
- [x] Navigate to /customers page
- [x] Create new customer via form
- [x] Edit existing customer
- [x] Search customers in list
- [x] Pagination navigation
- [x] Customer selector in checkout
- [x] Search in customer selector
- [x] Select customer in checkout
- [x] Create customer from checkout (inline)
- [x] Complete transaction with customer
- [x] Receipt shows customer info

### Integration
- [x] Transaction with customer → totals update
- [x] Void transaction → totals revert
- [x] Customer search is fast (<500ms)
- [x] No duplicate customer numbers

## 🎯 Key Features

### Auto-Generated Customer Numbers
- Format: `CUST-000001`, `CUST-000002`, etc.
- Sequential numbering via database sequence
- Unique identifier for each customer
- Appears immediately after creation

### Smart Search
- Searches: name, email, phone, customer number
- Debounced (waits 300ms after typing stops)
- Minimum 2 characters required
- Case-insensitive
- Shows top 10 results

### Automatic Totals
- `total_spent` updates when transaction completes
- `total_transactions` counts completed transactions
- Reverts when transaction voided
- Works via database trigger (no manual sync needed)

### Optional Customer Link
- Checkout works with or without customer
- Walk-in customers → no customer selected
- Regular customers → search and select
- New customers → create on-the-fly

## 🔐 Security

- All endpoints require JWT authentication
- Input validation with Zod
- Duplicate email prevention
- SQL injection protection (parameterized queries)
- XSS prevention (React auto-escaping)

## 📈 Performance

- Debounced search: 300ms delay
- Search result limit: 10 customers
- Pagination: 20 customers per page
- Database indexes on: customer_number, email, phone
- Soft delete (no data loss, fast queries)

## 🐛 Troubleshooting

### Customer number not generating?
```sql
-- Check sequence exists
SELECT * FROM pg_sequences WHERE sequencename = 'customer_number_seq';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'set_customer_number';
```

### Totals not updating?
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'update_customer_totals_on_transaction';

-- Manually recalculate (if needed)
UPDATE customers SET
  total_spent = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM transactions
    WHERE customer_id = customers.id AND status = 'completed'
  ),
  total_transactions = (
    SELECT COUNT(*)
    FROM transactions
    WHERE customer_id = customers.id AND status = 'completed'
  );
```

### Search not working?
- Check minimum 2 characters typed
- Check backend API is running
- Check browser console for errors
- Verify token is valid

## 📚 Related Documentation

- **PHASE_2_SUMMARY.md** - Complete implementation details
- **DEVELOPMENT.md** - Setup and configuration
- **plans/phase-2-customer-management.md** - Original plan

## 🎉 Next Steps

Phase 2 is complete! Ready for:
- Phase 3: Payment Processing (card integration)
- Phase 4: Inventory Management
- Phase 5: Reports & Analytics

---

**Questions?** Check the full implementation summary in PHASE_2_SUMMARY.md
