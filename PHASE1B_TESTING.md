# Phase 1B Testing Guide

## Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running with all Phase 1A tables and Phase 1B transaction tables
2. **Seed Data**: Have at least one terminal, one user with assigned_terminal_id, and several active products

## Backend Testing

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

Expected output: Server running on port 3000

### 2. Test Authentication

```bash
# Login to get access token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq

# Save the accessToken for subsequent requests
export TOKEN="<paste_access_token_here>"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "full_name": "Admin User",
      "role": "admin",
      "assigned_terminal_id": "..."
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

### 3. Test Product Search

```bash
curl -X GET "http://localhost:3000/api/v1/products?search=wireless&is_active=true" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: List of products matching "wireless"

### 4. Test Transaction Creation

```bash
# Get terminal_id and product_id from previous responses
export TERMINAL_ID="<paste_terminal_id>"
export PRODUCT_ID="<paste_product_id>"

curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "terminal_id": "'$TERMINAL_ID'",
    "items": [
      {
        "product_id": "'$PRODUCT_ID'",
        "quantity": 2
      }
    ],
    "payments": [
      {
        "payment_method": "cash",
        "amount": 50.00,
        "payment_details": {
          "cash_received": 60.00
        }
      }
    ]
  }' | jq
```

Expected response:
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "...",
    "transaction_number": "1-20260207-0001",
    "status": "completed",
    "total_amount": 50.00,
    "items": [...],
    "payments": [...]
  }
}
```

### 5. Verify Inventory Deduction

```bash
# Check product quantity decreased
curl -X GET "http://localhost:3000/api/v1/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.quantity_in_stock'
```

Expected: Quantity decreased by 2 from original stock

### 6. Test Get Transaction by ID

```bash
export TRANSACTION_ID="<paste_transaction_id>"

curl -X GET "http://localhost:3000/api/v1/transactions/$TRANSACTION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: Complete transaction details with items and payments

### 7. Test List Transactions

```bash
curl -X GET "http://localhost:3000/api/v1/transactions?status=completed&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Expected: Paginated list of completed transactions

### 8. Test Void Transaction

```bash
curl -X PUT "http://localhost:3000/api/v1/transactions/$TRANSACTION_ID/void" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer returned items"}' | jq
```

Expected: Transaction status changed to "voided", inventory restored

## Frontend Testing

### 1. Start POS Client

```bash
cd pos-client
npm run dev
```

Expected: Electron app launches and shows login screen

### 2. Manual UI Testing

#### Login Flow
1. Enter username: `admin`
2. Enter password: `admin123`
3. Click "Login"
4. **Expected**: Redirected to POS interface

#### Product Search
1. Click in search bar
2. Type "wireless"
3. Wait 300ms for debounced search
4. **Expected**: Product grid shows matching products

#### Add to Cart
1. Click "Add" button on a product card
2. **Expected**: Product appears in cart panel on right
3. **Expected**: Cart shows quantity, unit price, line total
4. **Expected**: Cart summary shows subtotal, tax, total

#### Adjust Quantity
1. In cart item, click "+" button
2. **Expected**: Quantity increases, line total updates
3. Click "-" button
4. **Expected**: Quantity decreases, line total updates
5. Type quantity directly in input
6. **Expected**: Line total recalculates

#### Remove from Cart
1. Click "X" button on cart item
2. **Expected**: Item removed from cart
3. **Expected**: Totals recalculate

#### Clear Cart
1. Add multiple items to cart
2. Click "Clear Cart"
3. Confirm dialog
4. **Expected**: Cart empties

#### Checkout Flow - Cash Payment
1. Add items to cart (total should be ~$50)
2. Click "Checkout" button
3. **Expected**: Checkout modal opens
4. **Expected**: Shows total, paid: $0, amount due: $50
5. Select "Cash" payment method (default)
6. Enter cash received: `100`
7. **Expected**: Change calculated automatically: $50
8. Click "Add Payment"
9. **Expected**: Payment added to list
10. **Expected**: Amount due: $0
11. Click "Complete Transaction"
12. **Expected**: Processing spinner shows
13. **Expected**: Receipt preview appears with transaction number
14. **Expected**: Shows subtotal, tax, total
15. Click "New Transaction"
16. **Expected**: Modal closes, cart is empty, ready for next customer

#### Error Handling
1. Try checkout with empty cart
2. **Expected**: Checkout button disabled
3. Try to complete transaction without full payment
4. **Expected**: Complete button disabled
5. Try to add out-of-stock product
6. **Expected**: "Out of Stock" button disabled

### 3. Browser DevTools Testing

Open Electron DevTools (View → Toggle Developer Tools):

#### Check Redux State
```javascript
// In console
window.__REDUX_DEVTOOLS_EXTENSION__
```

1. Add product to cart
2. Check "cart" state in Redux DevTools
3. **Expected**: items array has product with calculated totals

#### Check API Calls
1. Open Network tab
2. Search for product
3. **Expected**: GET /api/v1/products?search=...
4. Complete transaction
5. **Expected**: POST /api/v1/transactions with cart items and payments

#### Check Console for Errors
1. Perform full transaction flow
2. **Expected**: No console errors
3. **Expected**: Info logs for actions (optional)

## Database Verification

### 1. Check Transaction Record

```sql
SELECT t.*,
  (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as item_count,
  (SELECT SUM(amount) FROM payments WHERE transaction_id = t.id) as total_paid
FROM transactions t
WHERE transaction_number = '1-20260207-0001';
```

Expected:
- status = 'completed'
- completed_at is set
- item_count matches cart items
- total_paid = total_amount

### 2. Check Transaction Items

```sql
SELECT ti.*, ti.product_snapshot->'name' as product_name
FROM transaction_items ti
WHERE transaction_id = '<transaction_id>';
```

Expected:
- All cart items present
- product_snapshot has historical data
- line_total = (quantity × unit_price - discount) + tax

### 3. Check Payments

```sql
SELECT p.*, pd.*
FROM payments p
LEFT JOIN payment_details pd ON pd.payment_id = p.id
WHERE transaction_id = '<transaction_id>';
```

Expected:
- Payment method = 'cash'
- Amount matches transaction total
- cash_received and cash_change in payment_details

### 4. Verify Inventory Deduction

```sql
SELECT id, name, quantity_in_stock
FROM products
WHERE id IN (
  SELECT product_id FROM transaction_items WHERE transaction_id = '<transaction_id>'
);
```

Expected: Quantities decreased by transaction amounts

### 5. Check Void Restores Inventory

```sql
-- Note original quantities
SELECT id, name, quantity_in_stock FROM products WHERE id = '<product_id>';

-- Void transaction via API (see step 8 above)

-- Check quantities restored
SELECT id, name, quantity_in_stock FROM products WHERE id = '<product_id>';

-- Check transaction status
SELECT status, voided_at, void_reason FROM transactions WHERE id = '<transaction_id>';
```

Expected:
- Quantities restored to original
- Transaction status = 'voided'

## Performance Testing

### 1. Rapid Cart Operations
1. Quickly add 10 products to cart
2. **Expected**: UI remains responsive
3. **Expected**: Totals calculate correctly

### 2. Product Search Performance
1. Type query quickly
2. **Expected**: Only one API call after 300ms debounce
3. **Expected**: Results appear within 500ms

### 3. Transaction Completion Speed
1. Complete transaction with 5 items
2. **Expected**: API response < 2 seconds
3. **Expected**: Receipt shows immediately

## Edge Cases

### 1. Insufficient Stock
1. Add product with quantity > stock
2. **Expected**: Backend returns 400 error "Insufficient stock"
3. **Expected**: Frontend shows error message

### 2. Invalid Payment Amount
1. Add $50 cart, try to complete with $40 payment
2. **Expected**: "Complete Transaction" button disabled
3. **Expected**: Amount due shows $10

### 3. Network Failure
1. Stop backend server
2. Try to search products
3. **Expected**: Error message displayed
4. Restart backend
5. Try again
6. **Expected**: Search works

### 4. Invalid Terminal ID
1. Modify user's assigned_terminal_id to null
2. Try to complete transaction
3. **Expected**: Alert "Terminal ID not found"

## Success Criteria

✅ Backend compiles without errors
✅ Frontend compiles without errors
✅ All API endpoints return expected responses
✅ Product search displays results
✅ Cart operations work (add, update, remove)
✅ Totals calculate correctly (subtotal, tax, total)
✅ Checkout modal opens with correct data
✅ Cash payment calculates change
✅ Transaction completes successfully
✅ Transaction number generated correctly
✅ Receipt shows transaction details
✅ Inventory automatically decreases
✅ Cart clears after transaction
✅ Void transaction restores inventory
✅ Error handling works for edge cases

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Check .env file has correct DATABASE_URL
- Check all migrations ran: `npm run migrate`

### Frontend won't start
- Check node_modules: `npm install`
- Check backend is running and accessible
- Clear Electron cache: `rm -rf ~/.config/Electron`

### Transaction creation fails
- Check user has assigned_terminal_id: `SELECT assigned_terminal_id FROM users WHERE username = 'admin'`
- Check terminal exists: `SELECT * FROM terminals`
- Check products are active: `SELECT is_active FROM products`

### Inventory not deducting
- Check trigger exists: `\df update_inventory_on_transaction` in psql
- Check trigger is attached: `\d+ transactions` in psql
- Check transaction status is 'completed'

### Type errors in frontend
- Check uuid is installed: `npm list uuid`
- Check types installed: `npm list @types/uuid`
- Run: `npm install uuid @types/uuid@^8`
