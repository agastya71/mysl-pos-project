# POS System - User Guide

**Version**: 1.0
**Last Updated**: February 8, 2026
**For**: Cashiers, Managers, and Administrators

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Point of Sale Operations](#point-of-sale-operations)
3. [Transaction Management](#transaction-management)
4. [Customer Management](#customer-management)
5. [Product Categories](#product-categories)
6. [Inventory Management](#inventory-management)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### Logging In

1. Open your web browser and go to the POS System URL (usually `http://localhost:3001`)
2. Enter your username and password
3. Click the **Login** button

**Default Login Credentials** (first-time setup):
- **Username**: `admin`
- **Password**: `admin123`

> **Note**: Your administrator will provide you with your own credentials. Change your password after first login.

### Main Navigation

After logging in, you'll see the main POS interface with navigation buttons at the top:

- **POS System** (home icon) - Return to the main sales screen
- **👥 Customers** - Manage customer information
- **📁 Categories** - Organize products by category
- **📦 Inventory** - Manage product stock levels
- **📋 History** - View past transactions
- **Logout** - Sign out of the system

---

## Point of Sale Operations

The POS (Point of Sale) screen is where you process customer purchases.

### Screen Layout

The POS screen is divided into two main sections:

**Left Side (65%)** - Product Selection
- Search bar at the top
- Grid of available products
- Product cards show: name, SKU, price, and stock level

**Right Side (35%)** - Shopping Cart
- List of items added to the cart
- Subtotal, tax, and total
- Checkout button

### Making a Sale

#### Step 1: Search for Products

1. Use the **search bar** at the top of the product area
2. Type the product name, SKU, or barcode
3. Press Enter or wait for results to appear
4. Products matching your search will be displayed below

**Example**: Type "water" to find "Water Bottle 500ml"

#### Step 2: Add Products to Cart

1. Click on a **product card** to add it to the cart
2. The product appears in the cart area on the right
3. Default quantity is 1

#### Step 3: Adjust Quantities

To change the quantity of an item in the cart:

1. Find the item in the cart list
2. Click the **−** button to decrease quantity
3. Click the **+** button to increase quantity
4. Click the **🗑️ (trash)** icon to remove the item completely

> **Tip**: You can add the same product multiple times by clicking it again.

#### Step 4: Checkout

1. Review the cart to ensure all items are correct
2. Check the **subtotal**, **tax**, and **total** amounts
3. Click the **Checkout** button

#### Step 5: Process Payment

The checkout modal will appear:

1. **Select Payment Method**: Currently supports Cash (more options coming soon)
2. **Enter Amount Tendered**: Type the amount the customer is paying
3. **Review Change Due**: The system calculates change automatically
4. **Optional**: Select a customer (click "Select Customer" if the customer is registered)
5. Click **Complete Transaction**

#### Step 6: Receipt

After completing the transaction:
- A receipt summary appears showing the transaction number
- The cart is cleared automatically
- You're ready for the next customer

**Transaction Number Format**: `TXN-000123`

> **Note**: Currently, physical receipt printing is not implemented. Use the on-screen receipt for reference.

### Product Stock Levels

Products display stock indicators:
- **Green Badge**: Good stock (over 50 units)
- **Yellow Badge**: Medium stock (11-50 units)
- **Red Badge**: Low stock (10 or fewer units)
- **"Out of Stock"**: Product cannot be sold

> **Important**: If you try to add more items than available in stock, you'll see an error message.

---

## Transaction Management

### Viewing Transaction History

1. Click **📋 History** in the top navigation
2. You'll see a list of all transactions

Each transaction row shows:
- Transaction number (e.g., TXN-000123)
- Date and time
- Total amount
- Cashier name
- Customer name (if applicable)
- Status (Completed, Voided, etc.)

### Searching for Transactions

**Search by Transaction Number**:
1. Enter the transaction number in the search box
2. Results update automatically

**Filter by Date Range**:
1. Click the **Start Date** field and select a date
2. Click the **End Date** field and select a date
3. Only transactions within this range will show

**Filter by Status**:
1. Use the **Status** dropdown
2. Select: All, Completed, Voided, or Refunded

**Clear Filters**:
- Click the **Clear Filters** button to reset all filters

### Viewing Transaction Details

1. Find the transaction in the history list
2. Click the **View Details** button
3. A modal opens showing:
   - Transaction number and date
   - Cashier and customer information
   - List of items purchased (name, quantity, price)
   - Payment method and amount
   - Subtotal, tax, and total

4. Click **Close** or click outside the modal to exit

### Voiding a Transaction

> **Important**: Only managers and administrators can void transactions. This action is irreversible.

**When to Void**:
- Customer returns all items immediately
- Transaction was processed incorrectly
- Payment was declined after completion

**How to Void**:
1. Open the transaction details
2. Click the **Void Transaction** button (red)
3. In the confirmation modal:
   - Enter a **reason** for voiding (required)
   - This helps with record-keeping and audits
4. Click **Confirm Void**

**What Happens**:
- Transaction status changes to "Voided"
- Inventory is restored (products returned to stock)
- Transaction appears in history with "Voided" badge
- Original transaction details preserved for records

> **Note**: Voided transactions cannot be un-voided. Use carefully.

### Pagination

If there are many transactions:
- Use the **page numbers** at the bottom to navigate
- Click **Previous** or **Next** to move between pages
- Change the **items per page** dropdown (10, 20, 50)

---

## Customer Management

### Viewing Customers

1. Click **👥 Customers** in the top navigation
2. You'll see a list of all registered customers

Each customer card shows:
- Customer number (e.g., CUST-000001)
- Full name
- Email and phone
- Total purchases and visits

### Adding a New Customer

1. Click the **+ Add Customer** button
2. Fill in the customer form:
   - **Full Name** (required)
   - **Email** (optional but recommended)
   - **Phone** (optional)
   - **Address** (optional):
     - Address Line 1
     - Address Line 2
     - City
     - State
     - Postal Code
     - Country (default: USA)
3. Click **Save**

> **Tip**: Collecting customer information enables loyalty programs and purchase tracking (future features).

### Searching for Customers

1. Use the **search bar** at the top
2. Type customer name, email, or phone number
3. Results update as you type

### Editing a Customer

1. Find the customer in the list
2. Click the **Edit** button on their card
3. Update the information in the form
4. Click **Save**

### Deleting a Customer

> **Important**: Only administrators can delete customers. This is a soft delete - the customer is marked inactive but data is preserved.

1. Find the customer in the list
2. Click the **Delete** button
3. Confirm the deletion
4. Customer is marked as inactive (can be restored by admin if needed)

### Associating Customers with Transactions

When checking out:
1. In the checkout modal, click **Select Customer**
2. Search for the customer by name
3. Select the customer from the list
4. Complete the transaction as normal

**Benefits**:
- Track customer purchase history
- Provide personalized service
- Generate customer reports (future feature)

---

## Product Categories

Categories help organize products for easier navigation and reporting.

### Viewing Categories

1. Click **📁 Categories** in the top navigation
2. You'll see a tree view of all categories

**Tree Structure**:
- Parent categories are shown at the top level
- Child categories are indented underneath
- Click the **▶** arrow to expand/collapse children
- Product count is shown next to each category name

**Example Hierarchy**:
```
Beverages (15 products)
  ▶ Soft Drinks (8 products)
  ▶ Juices (7 products)
Electronics (25 products)
  ▶ Smartphones (12 products)
  ▶ Accessories (13 products)
```

### Creating a Category

1. Click the **+ Create Category** button
2. Fill in the category form:
   - **Name** (required) - e.g., "Beverages"
   - **Description** (optional) - Brief description
   - **Parent Category** (optional) - Select if this is a subcategory
   - **Display Order** (optional) - Controls ordering in lists (default: 0)
3. Click **Create**

**Auto-Generated Category Number**: Each category receives a unique number like `CAT-000001`

### Editing a Category

1. Find the category in the tree view
2. Click the **Edit** button
3. Modify the information:
   - Change name or description
   - Move to a different parent category
   - Adjust display order
   - Mark as active/inactive
4. Click **Save**

### Deleting a Category

> **Important**: You cannot delete categories that:
> - Have products assigned to them
> - Have child categories

**To Delete**:
1. First, reassign all products to another category
2. Delete or move all child categories
3. Find the category in the tree view
4. Click the **Delete** button
5. Confirm the deletion

> **Note**: Deletion is a soft delete - the category is marked inactive but preserved in the database.

### Filtering by Category

**In the Product List** (POS screen):
- Use the category filter dropdown to show only products in a specific category
- This makes it faster to find products when you know the category

**Future Feature**: Category-based reports and discounts

---

## Inventory Management

Inventory management helps you track stock levels and make adjustments when needed.

### Viewing Inventory Levels

1. Click **📦 Inventory** in the top navigation
2. You'll see a list of all products with stock information

**Stock Summary Cards** (at top):
- **Total Products**: How many products are in the system
- **Low Stock Items**: Products at or below reorder point (red indicator)
- **Out of Stock**: Products with zero quantity

**Product List Columns**:
- Product name and SKU
- Category
- Current stock quantity
- Stock level indicator (color-coded)
- Reorder point
- Base price
- Stock value (price × quantity)
- Actions (Adjust button)

**Stock Level Indicators**:
- 🔴 **Red (Low)**: 10 or fewer units
- 🟡 **Yellow (Medium)**: 11-50 units
- 🟢 **Green (Good)**: Over 50 units

### Creating an Inventory Adjustment

Inventory adjustments are used to manually correct stock levels.

**Common Reasons for Adjustments**:
- **Damage**: Items damaged or expired
- **Theft**: Shrinkage from theft
- **Found**: Discovered stock not in system
- **Correction**: Fix counting errors
- **Initial**: Set initial stock for new products

**How to Create an Adjustment**:

1. On the Inventory page, find the product
2. Click the **Adjust** button
3. Fill in the adjustment form:
   - **Product**: Auto-selected, or search for a product
   - **Adjustment Type**: Select from dropdown:
     - Damage
     - Theft
     - Found
     - Correction
     - Initial
   - **Quantity Change**: Enter the amount to add or subtract
     - Negative number (e.g., -5) to reduce stock
     - Positive number (e.g., +10) to increase stock
   - **Reason**: Describe why you're adjusting (required)
     - Example: "5 bottles broken during restocking"
   - **Notes**: Additional details (optional)
4. **Review the preview**:
   - Old Quantity → New Quantity
   - Example: 100 → 95
5. Click **Create Adjustment**

**Auto-Generated Adjustment Number**: Each adjustment receives a unique number like `ADJ-000001`

> **Important**: The system prevents adjustments that would result in negative inventory. You'll see an error if you try to subtract more than available.

### Viewing Adjustment History

#### All Adjustments

1. On the Inventory page, click **View History**
2. You'll see a list of all inventory adjustments

**Each adjustment shows**:
- Adjustment number (ADJ-XXXXXX)
- Product name and SKU
- Adjustment type (with color-coded badge)
- Quantity change (+ or -)
- Old quantity → New quantity
- Reason
- Adjuster name (who made the adjustment)
- Date and time

**Adjustment Type Colors**:
- 🔴 **Damage/Theft**: Red badge
- 🟢 **Found**: Green badge
- 🟡 **Correction**: Yellow badge
- 🔵 **Initial**: Blue badge

#### Product-Specific History

To see all adjustments for a single product:
1. Go to the Inventory page
2. Find the product in the list
3. Click **View History** next to that product
4. See chronological list of all adjustments for that product

### Filtering Adjustments

**By Adjustment Type**:
1. Use the **Type** dropdown
2. Select: All, Damage, Theft, Found, Correction, or Initial

**By Date Range**:
1. Select **Start Date** and **End Date**
2. Only adjustments in that range will show

**By Product**:
1. Use the product search box
2. Type product name or SKU

**Clear Filters**:
- Click **Clear Filters** to reset

### Best Practices

**Regular Stock Checks**:
- Perform physical counts weekly or monthly
- Create "Correction" adjustments to match actual counts
- Document reasons thoroughly

**Damage/Theft Tracking**:
- Always create adjustment records immediately
- Use clear, specific reasons
- This helps identify problem areas

**Reorder Alerts**:
- Check "Low Stock Items" count daily
- Create purchase orders when products hit reorder point
- Maintain adequate safety stock

---

## Inventory Reports

> **Note**: This feature is coming in Phase 3C (next phase). This section will be updated after implementation.

**Planned Reports**:
- Low Stock Report
- Out of Stock Report
- Inventory Valuation Report
- Movement Report (sales + adjustments)
- Category Summary

---

## Troubleshooting

### Login Issues

**Problem**: "Invalid username or password"
**Solution**:
- Double-check username and password (case-sensitive)
- Contact your administrator to reset password
- Ensure Caps Lock is not on

**Problem**: Page won't load / blank screen
**Solution**:
- Check your internet connection
- Try refreshing the page (F5 or Cmd+R)
- Clear browser cache and cookies
- Try a different browser (Chrome, Firefox, Safari)

### POS Operations

**Problem**: Product not appearing in search
**Solution**:
- Check spelling
- Try searching by SKU or barcode
- Product may be marked as inactive (contact administrator)

**Problem**: "Insufficient inventory" error
**Solution**:
- Check the product's stock level
- The quantity in cart exceeds available stock
- Reduce quantity or wait for restock

**Problem**: Checkout button is disabled
**Solution**:
- Cart must have at least one item
- All items must have valid quantities
- Try removing and re-adding items

**Problem**: Change calculation is wrong
**Solution**:
- Verify the amount tendered is correct
- Total must equal or exceed the transaction total
- If issue persists, contact administrator

### Transaction History

**Problem**: Transaction not appearing in history
**Solution**:
- Check date filters (expand date range)
- Check status filter (set to "All")
- Transaction may still be processing (refresh page)

**Problem**: Cannot void transaction
**Solution**:
- Only managers/admins can void transactions
- Check your user permissions
- Ensure transaction status is "Completed" (cannot void already-voided transactions)

### Customer Management

**Problem**: Duplicate customer entries
**Solution**:
- Search before creating new customers
- Use Edit function to update existing customer
- Contact administrator to merge duplicates

**Problem**: Cannot delete customer
**Solution**:
- Only administrators can delete customers
- Customer may have associated transactions (preserved for records)

### Inventory

**Problem**: "Would result in negative inventory" error
**Solution**:
- You're trying to subtract more than available
- Check current stock level
- Adjust the quantity change to a valid amount

**Problem**: Stock level not updating after sale
**Solution**:
- Stock updates automatically via database trigger
- Refresh the inventory page
- If still incorrect, create a "Correction" adjustment

**Problem**: Cannot find product in adjustment form
**Solution**:
- Product may be inactive
- Check spelling
- Contact administrator to reactivate product

### General Issues

**Problem**: Page is slow or unresponsive
**Solution**:
- Close other browser tabs
- Check your internet speed
- Clear browser cache
- Restart browser
- Contact IT support if issue persists

**Problem**: Data not saving
**Solution**:
- Check for error messages (usually red text)
- Ensure all required fields are filled
- Check your internet connection
- Try again in a few minutes

---

## FAQ

### General

**Q: Can I use this on my phone or tablet?**
A: The system is designed for desktop browsers, but should work on tablets in landscape mode. Phone screens are too small for optimal use.

**Q: Can multiple users be logged in at the same time?**
A: Yes, multiple cashiers can use different terminals simultaneously.

**Q: How do I change my password?**
A: Contact your administrator. Self-service password change is coming in a future update.

### Sales

**Q: Can I apply discounts to items?**
A: Line-item discounts are not yet implemented. This is a planned feature for a future update.

**Q: Can I split payment between cash and card?**
A: Split payments are not yet implemented. Currently, transactions support one payment method.

**Q: How do I print receipts?**
A: Physical receipt printing is not yet implemented. Use the on-screen receipt for now.

**Q: Can I process refunds?**
A: Refunds are not yet implemented. Use the void function for immediate corrections. Contact administrator for refunds after the fact.

### Customers

**Q: Is customer information secure?**
A: Yes, customer data is stored securely and only accessible to authorized users.

**Q: Can customers earn loyalty points?**
A: Loyalty programs are not yet implemented but are planned for a future update.

**Q: What happens if I accidentally delete a customer?**
A: It's a soft delete - the customer is marked inactive but can be restored by an administrator.

### Inventory

**Q: Does the system automatically reorder products?**
A: No, automatic reordering is not implemented. The system alerts you to low stock, but you must manually create purchase orders.

**Q: How often should I perform physical stock counts?**
A: Best practice is weekly for high-value items, monthly for all products. Create "Correction" adjustments to match actual counts.

**Q: Can I import products from a spreadsheet?**
A: Bulk import is not yet implemented. Products must be added individually.

### Reports

**Q: Can I export data to Excel?**
A: Data export is not yet implemented but is planned for future updates.

**Q: How far back does transaction history go?**
A: All transaction history is preserved indefinitely. Use date filters to narrow down results.

**Q: Can I see sales by category?**
A: Category-based sales reports are coming in Phase 3C (Inventory Reports).

---

## Getting Help

### Contact Support

If you encounter issues not covered in this guide:

1. **Contact Your Administrator**: They can help with user permissions, data issues, and system configuration
2. **Check Documentation**: Refer to this user guide and other documentation files
3. **Report Bugs**: Submit bug reports to your IT team with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - Screenshots if possible

### Training

**New Users**:
- Shadow an experienced cashier for your first few transactions
- Practice in a test environment if available
- Review this guide regularly

**Managers**:
- Understand all features, especially voiding and inventory adjustments
- Train new employees on basic POS operations
- Establish procedures for common tasks

### Tips for Success

1. **Log out when finished**: Protects your account and transaction history
2. **Double-check before voiding**: Void operations cannot be undone
3. **Document inventory adjustments**: Clear reasons help with audits
4. **Perform regular stock counts**: Catch discrepancies early
5. **Keep customer information updated**: Helps with marketing and service

---

## What's Coming Next

**Phase 3C: Inventory Reports** (Next Update)
- Low stock alerts
- Inventory valuation by category
- Movement reports (track sales and adjustments over time)
- Out of stock notifications

**Future Features**:
- Split payments (cash + card)
- Credit card payment integration
- Receipt printer support
- Barcode scanner support
- Purchase order management
- Physical stock count workflow
- Customer loyalty program
- Sales analytics and dashboards
- Line-item discounts
- Employee performance reports

---

**User Guide Version**: 1.0
**Last Updated**: February 8, 2026
**Next Update**: After Phase 3C implementation

**Your feedback helps us improve this guide!** Contact your administrator with suggestions or questions.
