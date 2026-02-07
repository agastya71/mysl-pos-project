# Phase 1D: Transaction Management - Testing Guide

## Overview
Phase 1D implements transaction history viewing, filtering, and void functionality in the POS system.

## Test Preparation

### 1. Verify Services Running
```bash
./verify-services.sh
```

All services should be running:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3000)
- POS Client (port 3001)

### 2. Login Credentials
- Username: `admin`
- Password: `admin123`

## Manual Testing Checklist

### A. Navigation & Basic UI

#### Test 1: Access Transaction History
1. ✅ Open browser to http://localhost:3001
2. ✅ Login with admin credentials
3. ✅ Click "📋 History" button in the POS header
4. ✅ Verify navigation to `/pos/history`
5. ✅ Verify "Transaction History" page loads
6. ✅ Verify "Back to POS" button is visible

**Expected Result:** Successfully navigate to Transaction History page with proper header and back button.

---

### B. Transaction List Display

#### Test 2: View Transaction List
1. ✅ On Transaction History page
2. ✅ Verify transactions are displayed in a table/card format
3. ✅ Check columns: Transaction #, Date, Total, Status
4. ✅ Verify status badges have correct colors:
   - Completed: Green
   - Voided: Red
   - Refunded: Gray
   - Draft: Yellow

**Expected Result:** Transaction list displays with all columns, proper formatting, and colored status badges.

#### Test 3: Empty State
1. ✅ If no transactions exist (test with filters that return no results)
2. ✅ Verify empty state message: "No transactions found"
3. ✅ Verify icon displays (📝)

**Expected Result:** Friendly empty state with icon and message.

---

### C. Filtering & Search

#### Test 4: Search by Transaction Number
1. ✅ Enter a transaction number in the search field (e.g., "1-20260207-0004")
2. ✅ Click "Search" button
3. ✅ Verify only matching transaction is displayed
4. ✅ Click "Clear Filters"
5. ✅ Verify all transactions are displayed again

**Expected Result:** Search filters transactions correctly and clear button resets the list.

#### Test 5: Filter by Date Range
1. ✅ Select a start date (e.g., today's date)
2. ✅ Leave end date empty
3. ✅ Click "Search"
4. ✅ Verify only transactions from start date onwards are displayed
5. ✅ Select both start and end dates
6. ✅ Click "Search"
7. ✅ Verify only transactions within the date range are displayed

**Expected Result:** Date range filtering works correctly.

#### Test 6: Filter by Status
1. ✅ Select "Completed" from status dropdown
2. ✅ Click "Search"
3. ✅ Verify only completed transactions are displayed
4. ✅ Select "Voided" from status dropdown
5. ✅ Click "Search"
6. ✅ Verify only voided transactions are displayed (if any exist)

**Expected Result:** Status filtering works correctly.

#### Test 7: Combined Filters
1. ✅ Enter search text, select date range, and select status
2. ✅ Click "Search"
3. ✅ Verify transactions match all criteria
4. ✅ Click "Clear Filters"
5. ✅ Verify all fields are reset and all transactions are displayed

**Expected Result:** Multiple filters work together correctly.

---

### D. Pagination

#### Test 8: Pagination (if more than 20 transactions exist)
1. ✅ Create enough transactions to span multiple pages (>20)
2. ✅ Verify pagination controls appear at bottom
3. ✅ Click "Next" button
4. ✅ Verify page number updates and new transactions load
5. ✅ Click "Previous" button
6. ✅ Verify returning to previous page
7. ✅ Verify "Previous" is disabled on page 1
8. ✅ Verify "Next" is disabled on last page

**Expected Result:** Pagination works correctly with proper disable states.

---

### E. Transaction Details

#### Test 9: View Transaction Details
1. ✅ Click any transaction row in the list
2. ✅ Verify Transaction Details Modal opens
3. ✅ Verify modal displays:
   - Transaction number and status badge
   - Date, cashier, terminal
   - List of items with quantities and prices
   - Payment information
   - Subtotal, tax, discount (if any), and total

**Expected Result:** Details modal opens with complete transaction information.

#### Test 10: Close Transaction Details
1. ✅ Open transaction details
2. ✅ Click "Close" button
3. ✅ Verify modal closes
4. ✅ Click transaction row again
5. ✅ Click outside the modal (on overlay)
6. ✅ Verify modal closes

**Expected Result:** Modal can be closed via button or clicking outside.

---

### F. Void Transaction

#### Test 11: Void a Completed Transaction
1. ✅ Find a completed transaction (green status badge)
2. ✅ Click to open details
3. ✅ Verify "Void Transaction" button is visible
4. ✅ Click "Void Transaction" button
5. ✅ Verify Void Confirmation Modal opens
6. ✅ Verify reason input field is present and required
7. ✅ Try to submit without reason
8. ✅ Verify button is disabled or shows error
9. ✅ Enter reason: "Customer returned items"
10. ✅ Click "Void Transaction"
11. ✅ Verify success message or modal closes
12. ✅ Verify transaction list refreshes
13. ✅ Verify transaction status is now "Voided" (red badge)

**Expected Result:** Transaction is successfully voided with reason required.

#### Test 12: Verify Inventory Restored After Void
1. ✅ Before voiding, note product quantities
2. ✅ Void a transaction with specific products
3. ✅ Navigate back to POS page
4. ✅ Search for products from voided transaction
5. ✅ Verify product quantities have been restored

**Expected Result:** Inventory quantities are restored after voiding transaction.

#### Test 13: Cannot Void Already-Voided Transaction
1. ✅ Open details of a voided transaction
2. ✅ Verify "Void Transaction" button is NOT visible
3. ✅ Verify void reason is displayed in transaction details

**Expected Result:** Cannot void a transaction that's already voided.

#### Test 14: Cancel Void Operation
1. ✅ Open completed transaction details
2. ✅ Click "Void Transaction"
3. ✅ Enter void reason
4. ✅ Click "Cancel" button
5. ✅ Verify void modal closes
6. ✅ Verify transaction remains completed (not voided)

**Expected Result:** Cancel button aborts void operation.

---

### G. Loading & Error States

#### Test 15: Loading State
1. ✅ Apply filters that take time to load
2. ✅ Verify loading indicator appears
3. ✅ Verify "Loading transactions..." message displays

**Expected Result:** Loading state is visible during data fetch.

#### Test 16: Error Handling - Network Error
1. ✅ Stop backend server: `cd backend && pkill -f "npm run dev"`
2. ✅ Try to search/filter transactions
3. ✅ Verify error message displays
4. ✅ Restart backend: `cd backend && npm run dev`
5. ✅ Refresh page and verify it works again

**Expected Result:** Network errors are handled gracefully with error messages.

---

### H. Integration with POS Flow

#### Test 17: Create Transaction and View in History
1. ✅ Navigate back to POS page
2. ✅ Add products to cart
3. ✅ Complete checkout with cash payment
4. ✅ Note the transaction number from receipt
5. ✅ Navigate to Transaction History
6. ✅ Verify new transaction appears in list (refresh if needed)
7. ✅ Search for the transaction number
8. ✅ Open transaction details
9. ✅ Verify all items and payment match the completed transaction

**Expected Result:** Newly created transactions appear in history immediately.

---

## Backend API Testing

### Test Transaction List Endpoint
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.tokens.accessToken')

# List all transactions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions?page=1&limit=10" | jq

# Filter by status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions?status=completed" | jq

# Filter by date range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions?start_date=2026-02-01&end_date=2026-02-07" | jq
```

### Test Transaction Details Endpoint
```bash
# Get transaction by ID
TRANSACTION_ID="c5ee2192-8d5a-48a4-9763-895d85c3214f"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions/$TRANSACTION_ID" | jq
```

### Test Void Transaction Endpoint
```bash
# Void transaction
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer returned items"}' \
  "http://localhost:3000/api/v1/transactions/$TRANSACTION_ID/void" | jq
```

---

## Browser Console Testing

### Check Redux State
Open browser console (F12) and run:
```javascript
// View transactions state
console.log(window.store.getState().transactions)

// View current filters
console.log(window.store.getState().transactions.filters)

// View pagination
console.log(window.store.getState().transactions.pagination)
```

---

## Performance Testing

### Test with Large Dataset
1. Create 50+ transactions
2. Navigate to Transaction History
3. Verify page loads within 2 seconds
4. Test pagination performance
5. Test filtering with large dataset

---

## Regression Testing

### Verify Phase 1B Still Works
1. ✅ Navigate to POS page
2. ✅ Search for products
3. ✅ Add items to cart
4. ✅ Adjust quantities
5. ✅ Complete checkout with cash payment
6. ✅ Verify transaction is created
7. ✅ Verify inventory is deducted

**Expected Result:** All Phase 1B functionality still works correctly.

---

## Known Issues & Limitations

### Current Limitations:
- Transaction list does not update in real-time (requires manual refresh)
- No cashier name displayed in transaction list (only in details)
- Cannot search by cashier name (only by ID)
- Date filters use browser's date picker (format may vary)
- No export functionality (CSV/Excel)
- No print receipt from history

### Future Enhancements:
- Real-time updates via WebSocket
- Advanced search (by customer, amount range)
- Export transactions to CSV/Excel
- Print receipt from history
- Refund flow (create refund transaction)
- Manager approval for voids
- Audit log viewing
- Daily/weekly sales reports

---

## Success Criteria

Phase 1D is complete when all of the following are verified:

- ✅ Transaction history page accessible from POS
- ✅ Transactions display with proper formatting
- ✅ Search by transaction number works
- ✅ Date range filtering works
- ✅ Status filtering works
- ✅ Pagination works (if applicable)
- ✅ Click transaction opens details modal
- ✅ Transaction details show all information
- ✅ Void transaction flow works end-to-end
- ✅ Void reason is required
- ✅ Inventory restored after void
- ✅ Cannot void already-voided transactions
- ✅ Error handling and loading states work
- ✅ Navigation between POS and History works
- ✅ UI is consistent with existing POS styling
- ✅ Phase 1B functionality still works

---

## Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Access Transaction History | ⏳ | Pending manual test |
| 2 | View Transaction List | ⏳ | Pending manual test |
| 3 | Empty State | ⏳ | Pending manual test |
| 4 | Search by Transaction Number | ⏳ | Pending manual test |
| 5 | Filter by Date Range | ⏳ | Pending manual test |
| 6 | Filter by Status | ⏳ | Pending manual test |
| 7 | Combined Filters | ⏳ | Pending manual test |
| 8 | Pagination | ⏳ | Pending manual test |
| 9 | View Transaction Details | ⏳ | Pending manual test |
| 10 | Close Transaction Details | ⏳ | Pending manual test |
| 11 | Void Completed Transaction | ⏳ | Pending manual test |
| 12 | Verify Inventory Restored | ⏳ | Pending manual test |
| 13 | Cannot Void Already-Voided | ⏳ | Pending manual test |
| 14 | Cancel Void Operation | ⏳ | Pending manual test |
| 15 | Loading State | ⏳ | Pending manual test |
| 16 | Error Handling | ⏳ | Pending manual test |
| 17 | Create Transaction and View | ⏳ | Pending manual test |

**Legend:**
- ✅ Passed
- ❌ Failed
- ⏳ Pending
- ⚠️ Needs investigation

---

## Automated Test Commands

```bash
# Backend API tests
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.tokens.accessToken')

echo "✓ Backend: List transactions"
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions?page=1&limit=5" | jq '.success'

echo "✓ Backend: Get transaction details"
TRANSACTION_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions?page=1&limit=1" | jq -r '.data.transactions[0].id')
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/transactions/$TRANSACTION_ID" | jq '.success'

echo "✅ Backend API tests completed!"
```

---

## Contact

For issues or questions about Phase 1D implementation, refer to:
- Backend: `backend/src/routes/transaction.routes.ts`
- Frontend: `pos-client/src/pages/TransactionHistoryPage.tsx`
- Redux: `pos-client/src/store/slices/transactions.slice.ts`
