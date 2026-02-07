# Phase 1D: Transaction Management - User Guide

## Quick Start

### Accessing Transaction History

1. **Login** to the POS system at http://localhost:3001
2. Look for the **"📋 History"** button in the top-right header (next to Logout)
3. Click **"📋 History"** to view transaction history

---

## Features Overview

### 1. Viewing Transactions

When you open the Transaction History page, you'll see:

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to POS          Transaction History                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍 Filter Bar                                                   │
│  ┌───────────────┬──────────────┬──────────────┬──────────────┐│
│  │ Transaction # │ Start Date   │ End Date     │ Status       ││
│  │ [Search...]   │ [MM/DD/YYYY] │ [MM/DD/YYYY] │ [All]        ││
│  └───────────────┴──────────────┴──────────────┴──────────────┘│
│  [Clear Filters]  [Search]                                       │
│                                                                  │
│  📋 Transaction List                                             │
│  ┌──────────────┬───────────────────┬──────────┬──────────────┐│
│  │Transaction # │ Date              │ Total    │ Status       ││
│  ├──────────────┼───────────────────┼──────────┼──────────────┤│
│  │1-20260207-001│ Feb 7, 2026 10:15│ $65.08   │ ✅ Completed││
│  │1-20260207-002│ Feb 7, 2026 11:32│ $97.62   │ ✅ Completed││
│  │1-20260207-003│ Feb 7, 2026 14:22│ $238.66  │ ❌ Voided   ││
│  └──────────────┴───────────────────┴──────────┴──────────────┘│
│                                                                  │
│  ◀ Previous  Page 1 of 3  Next ▶                                │
└─────────────────────────────────────────────────────────────────┘
```

**Status Colors:**
- 🟢 **Green (Completed):** Transaction was successfully completed
- 🔴 **Red (Voided):** Transaction was voided/cancelled
- ⚫ **Gray (Refunded):** Transaction was refunded (future feature)
- 🟡 **Yellow (Draft):** Transaction in progress (not completed)

---

### 2. Searching & Filtering

#### Search by Transaction Number
1. Type the transaction number (or part of it) in the **"Transaction #"** field
2. Example: Type "0001" to find transaction "1-20260207-0001"
3. Click **"Search"** button

#### Filter by Date Range
1. Click the **"Start Date"** field and select a date
2. Click the **"End Date"** field and select a date
3. Click **"Search"** button

**Tips:**
- Leave start date empty to get all transactions up to end date
- Leave end date empty to get all transactions from start date onwards
- Use both for a specific date range

#### Filter by Status
1. Click the **"Status"** dropdown
2. Select: **Completed**, **Voided**, **Refunded**, or **Draft**
3. Click **"Search"** button

#### Combine Filters
You can use multiple filters together:
- Search for a transaction number AND filter by date
- Filter by status AND date range
- All three filters at once

#### Clear All Filters
Click the **"Clear Filters"** button to reset and show all transactions.

---

### 3. Viewing Transaction Details

#### Opening Transaction Details
1. **Click** anywhere on a transaction row in the list
2. A modal window will pop up showing full transaction details

#### What You'll See in Transaction Details

```
┌─────────────────────────────────────────────────────────────┐
│  Transaction Details                        ✅ Completed     │
│  1-20260207-0001                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Transaction Information                                  │
│  Date: Feb 7, 2026, 10:15 AM                                │
│  Cashier: John Doe                                          │
│  Terminal: Register 1                                        │
│                                                              │
│  🛒 Items                                                    │
│  ┌────────────────────┬─────┬─────────┬──────────┐         │
│  │ Product            │ Qty │ Price   │ Total    │         │
│  ├────────────────────┼─────┼─────────┼──────────┤         │
│  │ Coca-Cola 12oz     │ 2   │ $2.99   │ $5.98    │         │
│  │ SKU: COCA-001      │     │         │          │         │
│  ├────────────────────┼─────┼─────────┼──────────┤         │
│  │ Snickers Bar       │ 3   │ $1.49   │ $4.47    │         │
│  │ SKU: SNCK-001      │     │         │          │         │
│  └────────────────────┴─────┴─────────┴──────────┘         │
│                                                              │
│  💳 Payments                                                 │
│  Payment Method: Cash                                        │
│  Amount: $15.00                                              │
│  Cash Received: $20.00                                       │
│  Change: $5.00                                               │
│                                                              │
│  💰 Totals                                                   │
│  Subtotal:     $14.45                                        │
│  Tax:          $0.55                                         │
│  Total:        $15.00                                        │
│                                                              │
│  [Close]  [Void Transaction]                                 │
└─────────────────────────────────────────────────────────────┘
```

#### Closing Transaction Details
- Click the **"Close"** button at the bottom
- **OR** click outside the modal (on the gray overlay)

---

### 4. Voiding a Transaction

⚠️ **Important:** Only **completed** transactions can be voided. Voiding a transaction:
- Changes its status to "Voided"
- Restores product quantities to inventory
- Cannot be undone

#### Steps to Void a Transaction

1. **Open** the transaction details (click on the transaction)
2. Verify the transaction status is **"Completed"** (green badge)
3. Click the **"Void Transaction"** button (red button at bottom)
4. A confirmation modal will appear:

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Void Transaction                            │
│  Are you sure you want to void transaction     │
│  1-20260207-0001?                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Reason *                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ Enter reason for voiding this           │   │
│  │ transaction...                          │   │
│  │                                         │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Cancel]  [Void Transaction]                  │
└─────────────────────────────────────────────────┘
```

5. **Type a reason** in the text box (required!)
   - Example: "Customer returned items"
   - Example: "Duplicate transaction"
   - Example: "Pricing error"

6. Click **"Void Transaction"** button

7. Wait for confirmation (modal will close automatically)

8. The transaction list will refresh, and the status will show as **"Voided"** (red)

#### If You Change Your Mind
- Click **"Cancel"** button to abort the void operation
- No changes will be made to the transaction

#### Viewing Voided Transactions
When you view a voided transaction's details:
- Status badge shows **"Voided"** (red)
- Void reason is displayed
- Voided date/time is shown
- **No "Void Transaction" button** (already voided)

---

### 5. Pagination

If you have more than 20 transactions:

```
◀ Previous  Page 2 of 5  Next ▶
```

- Click **"Next ▶"** to go to the next page
- Click **"◀ Previous"** to go back
- Page number shows current page and total pages
- Buttons are disabled when at first/last page

**Note:** Pagination maintains your current filters.

---

## Common Use Cases

### Use Case 1: Find Today's Transactions
1. Go to Transaction History
2. Click **"Start Date"** and select today's date
3. Leave **"End Date"** empty (or select today)
4. Click **"Search"**

### Use Case 2: Find a Specific Transaction by Number
1. Get the transaction number (from receipt or customer)
2. Type it in the **"Transaction #"** field
3. Click **"Search"**

### Use Case 3: Review All Voided Transactions
1. Click **"Status"** dropdown
2. Select **"Voided"**
3. Click **"Search"**
4. Review the list of voided transactions

### Use Case 4: Void a Customer Return
1. Ask customer for receipt with transaction number
2. Search for the transaction number
3. Click the transaction to view details
4. Verify the items match the return
5. Click **"Void Transaction"**
6. Enter reason: "Customer returned items"
7. Confirm the void
8. Products are now back in stock

### Use Case 5: Check Transaction History for a Date Range
1. Select **"Start Date"** (e.g., Feb 1, 2026)
2. Select **"End Date"** (e.g., Feb 7, 2026)
3. Click **"Search"**
4. Review all transactions in that week

---

## Tips & Best Practices

### Searching Tips
✅ **DO:**
- Be specific with transaction numbers for faster results
- Use date ranges to narrow down results
- Combine filters for precise searches

❌ **DON'T:**
- Leave all filters empty if you have many transactions (will load slowly)
- Forget to clear filters when done

### Voiding Tips
✅ **DO:**
- Always provide a clear, descriptive void reason
- Verify transaction details before voiding
- Document void reasons for audit purposes
- Check that inventory was restored after voiding

❌ **DON'T:**
- Void transactions without a valid reason
- Use vague reasons like "mistake"
- Void the wrong transaction (double-check first)

### Performance Tips
- Use filters to reduce the number of results
- Specific date ranges load faster than "all time"
- Status filters are very efficient

---

## Keyboard Shortcuts

- **Enter** in search field: Execute search
- **Escape** in modal: Close modal (future enhancement)
- **Tab**: Navigate between filter fields

---

## Troubleshooting

### Problem: "No transactions found"
**Solutions:**
- Check your filters - they might be too restrictive
- Click "Clear Filters" to see all transactions
- Verify you've completed at least one transaction

### Problem: Transaction list is empty
**Solutions:**
- Create some transactions first (go to POS page)
- Check if date filters are set correctly
- Verify backend is running (check service status)

### Problem: "Loading transactions..." never finishes
**Solutions:**
- Check your internet connection
- Verify backend server is running
- Refresh the page
- Check browser console for errors

### Problem: Void transaction fails
**Solutions:**
- Verify the transaction status is "Completed"
- Make sure you entered a void reason
- Check that you're not trying to void an already-voided transaction
- Verify you have permission to void transactions

### Problem: Void button doesn't appear
**Possible Reasons:**
- Transaction is already voided (check status)
- Transaction is in draft or refunded status
- Transaction is not completed yet

---

## FAQ

**Q: Can I void a voided transaction?**
A: No. Once a transaction is voided, it cannot be voided again.

**Q: Can I undo a void?**
A: No. Void operations are permanent and cannot be undone. Always double-check before voiding.

**Q: How do I reprint a receipt?**
A: Receipt reprinting will be available in a future update.

**Q: Can I export transaction history to Excel?**
A: Export functionality will be added in a future update.

**Q: Do transactions update in real-time?**
A: Not currently. Click "Search" or refresh the page to see new transactions.

**Q: What happens to inventory when I void a transaction?**
A: Product quantities are automatically restored to inventory.

**Q: Can I void multiple transactions at once?**
A: Not currently. Each transaction must be voided individually.

**Q: Who can void transactions?**
A: Currently, any logged-in user can void transactions. Manager approval may be added in the future.

**Q: How long are transactions stored?**
A: Transactions are stored indefinitely in the database.

**Q: Can I search by customer name?**
A: Customer-based search will be added when customer management is implemented.

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the console in your browser's Developer Tools (F12)
2. Verify all services are running (`./verify-services.sh`)
3. Check the backend logs
4. Refer to `PHASE1D_TESTING.md` for troubleshooting steps
5. Contact your system administrator

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────┐
│           TRANSACTION HISTORY QUICK REFERENCE            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Access:        Click "📋 History" button in POS header │
│  Back to POS:   Click "← Back to POS" button            │
│                                                          │
│  SEARCHING:                                              │
│  • Transaction #: Type number in search field            │
│  • Date Range:    Select start/end dates                 │
│  • Status:        Select from dropdown                   │
│  • Clear:         Click "Clear Filters" button           │
│                                                          │
│  VIEWING:                                                │
│  • Details:       Click any transaction row              │
│  • Close:         Click "Close" or outside modal         │
│                                                          │
│  VOIDING:                                                │
│  • Step 1:        Open transaction details               │
│  • Step 2:        Click "Void Transaction"               │
│  • Step 3:        Enter reason (required!)               │
│  • Step 4:        Confirm void                           │
│                                                          │
│  STATUS COLORS:                                          │
│  • 🟢 Green:      Completed                             │
│  • 🔴 Red:        Voided                                │
│  • ⚫ Gray:       Refunded                              │
│  • 🟡 Yellow:     Draft                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

**Version:** 1.0.0
**Last Updated:** February 7, 2026
**Feature Set:** Phase 1D - Transaction Management
