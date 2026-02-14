# POS System - User Guide

**Version**: 1.2
**Last Updated**: February 14, 2026
**For**: Cashiers, Managers, and Administrators

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Point of Sale Operations](#point-of-sale-operations)
3. [Transaction Management](#transaction-management)
4. [Customer Management](#customer-management)
5. [Product Categories](#product-categories)
6. [Inventory Management](#inventory-management)
7. [Purchase Order Management](#purchase-order-management)
8. [Employee Management](#employee-management)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

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
- **🛒 Purchase Orders** - Create and manage supplier orders
- **👥 Employees** - Manage staff and roles (Admin/Manager only)
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

The Inventory Reports feature provides insights into your stock levels, inventory value, and movement patterns.

### Accessing Reports

1. Click **📦 Inventory** in the top navigation
2. Click the **📊 Reports** button (green button)
3. You'll see a dashboard with multiple report tabs

### Available Reports

**Overview Tab**:
- Quick summary cards showing key metrics
- Total products, low stock count, out of stock count
- Total inventory value

**Low Stock Report**:
- Products at or below their reorder level
- Color-coded badges (Critical/Warning)
- Shows reorder recommendations
- Helps you identify what needs restocking soon

**Out of Stock Report**:
- Products with zero quantity
- Urgent priority items
- Shows last sale date
- Critical for preventing lost sales

**Valuation Report**:
- Total inventory value by category
- Category breakdown with percentages
- Helps understand where your capital is invested
- Useful for financial reporting

**Movement Report**:
- Stock changes over a date range
- Shows opening stock, sales, adjustments, and closing stock
- Date range filter available
- Helps analyze stock trends

**Category Summary**:
- Statistics grouped by product category
- Health indicators per category
- Product count, stock levels, and value per category
- Useful for category management decisions

### Best Practices

**Review Reports Regularly**:
- Check Low Stock report daily
- Review Out of Stock report before each day
- Run Valuation report weekly or monthly
- Use Movement report for trend analysis

---

## Purchase Order Management

Purchase Orders (POs) help you manage restocking from suppliers and track what's been ordered, received, and paid for.

### Overview

**What is a Purchase Order?**
A Purchase Order is a formal request to buy products from a vendor. It tracks:
- What products you ordered
- How many you ordered
- Expected delivery date
- Costs and totals
- Receiving status (what's arrived)

**PO Status Workflow**:
```
Draft → Submitted → Approved → Partially Received → Received → Closed
                               ↓
                           Cancelled
```

### Viewing Purchase Orders

1. Click **🛒 Purchase Orders** in the top navigation (from POS page)
2. You'll see a list of all purchase orders

**Each PO shows**:
- PO Number (e.g., PO-20260208-0001)
- Vendor name
- Order type (Standard, Urgent, Drop Ship)
- Status (with color-coded badge)
- Order date
- Expected delivery date
- Total amount
- Action buttons (based on status)

### Creating a Purchase Order

#### Option 1: Manual Creation

1. On the Purchase Orders page, click **+ Create PO**
2. Fill in the order details:
   - **Vendor**: Select from dropdown (required)
   - **Order Type**: Standard, Urgent, or Drop Ship
   - **Expected Delivery Date**: When you expect the shipment
   - **Shipping Address**: Where items will be delivered
   - **Billing Address**: Where invoice should be sent
   - **Payment Terms**: e.g., "Net 30 days"
   - **Notes**: Any additional information

3. Add line items:
   - Click **Add Product**
   - Search for and select a product
   - Enter **Quantity Ordered**
   - Enter **Unit Cost** (what you're paying per unit)
   - Optionally add **Tax Amount** and **Notes**
   - The line total calculates automatically

4. Review the totals section:
   - Subtotal (sum of all line items)
   - Tax Amount
   - Shipping Cost (optional)
   - Other Charges (optional)
   - Discount Amount (optional)
   - **Total Amount** (calculated automatically)

5. Click **Save as Draft** or **Submit for Approval**

**Auto-Generated PO Number**: Each PO receives a unique number like `PO-20260208-0001`

#### Option 2: From Reorder Suggestions

1. On the Purchase Orders page, click **Reorder Suggestions**
2. You'll see products that are low on stock, grouped by vendor
3. Each vendor section shows:
   - Products at or below reorder level
   - Current stock quantity
   - Recommended reorder quantity
   - Estimated cost
4. Click **Create PO for Vendor** button
5. A new PO form opens, pre-filled with:
   - Vendor selected
   - Line items for all low-stock products
   - Reorder quantities filled in
   - Costs from product data
6. Review and adjust quantities/costs as needed
7. Click **Save as Draft** or **Submit for Approval**

### Editing a Purchase Order

> **Important**: You can only edit POs in "Draft" status.

1. Find the PO in the list
2. Click the **Edit** button
3. Modify any fields or line items
4. Add or remove products
5. Click **Update PO**

### PO Workflow

#### Submitting for Approval

1. Open the draft PO (click PO number or View button)
2. Review all details carefully
3. Click **Submit for Approval**
4. Status changes to "Submitted"
5. A manager or administrator will need to approve it

> **Note**: Once submitted, you cannot edit the PO.

#### Approving a PO (Managers/Admins Only)

1. Find the submitted PO in the list
2. Click the **Approve** button, or open details and click **Approve**
3. Status changes to "Approved"
4. The PO is now ready to be sent to the vendor
5. System records who approved it and when

#### Receiving Items

Once items arrive from the vendor:

1. Open the approved PO details page
2. Click the **Receive Items** button
3. In the Receive Items modal:
   - Each line item shows:
     - Product name and SKU
     - Quantity Ordered
     - Quantity Received (so far)
     - Quantity Pending (still expected)
   - Enter **Received Quantity** for each item
   - System validates you can't receive more than ordered
   - Optionally add **Notes** (e.g., "Box damaged but contents OK")
4. Click **Save Received Quantities**

**What Happens**:
- Product inventory automatically increases by received amount
- PO status updates:
  - If nothing received yet: stays "Approved"
  - If partially received: changes to "Partially Received"
  - If fully received: changes to "Received"
- You can receive in multiple shipments (partial receives)

**Example**:
- Ordered: 100 bottles
- Received first time: 50 bottles (status → Partially Received)
- Received second time: 50 bottles (status → Received)

#### Closing a PO

Once all items are received and everything is complete:

1. Open the PO details page
2. Verify all items have been fully received
3. Click **Close PO**
4. Status changes to "Closed"
5. PO is archived but still viewable for records

#### Cancelling a PO

If you need to cancel an order (vendor out of stock, changed plans, etc.):

1. Open the PO details page
2. Click **Cancel PO**
3. Enter a **Reason** for cancellation (required)
4. Click **Confirm Cancel**
5. Status changes to "Cancelled"

> **Note**: You can cancel POs in Draft, Submitted, Approved, or Partially Received status. You cannot cancel Closed or already-Cancelled POs.

### Searching and Filtering POs

**Search by PO Number**:
1. Use the search box at the top
2. Type the PO number (e.g., PO-20260208-0001)
3. Results filter as you type

**Filter by Vendor**:
1. Click the **Vendor** dropdown
2. Select a vendor to see only their POs

**Filter by Status**:
1. Click the **Status** dropdown
2. Select: All, Draft, Submitted, Approved, etc.

**Filter by Order Type**:
1. Click the **Order Type** dropdown
2. Select: All, Standard, Urgent, Drop Ship

**Filter by Date Range**:
1. Select **Start Date** and **End Date**
2. Only POs created in that range will show

**Clear All Filters**:
- Click **Clear Filters** button

### Best Practices

**Regular Review**:
- Check Reorder Suggestions daily
- Create POs promptly for low-stock items
- Maintain adequate lead time (order before you run out)

**Receiving**:
- Receive items as soon as they arrive
- Record partial shipments immediately
- Add notes about any issues (damaged boxes, shortages)
- This keeps inventory counts accurate

**Documentation**:
- Use the Notes field for important details
- Record vendor communication
- Note any special terms or agreements

**Workflow Discipline**:
- Always submit drafts for approval (don't leave in Draft)
- Managers: Review and approve POs promptly
- Close POs once complete (keeps list clean)
- Only cancel with good reason and documentation

---

## Employee Management

> **Note**: These features are typically restricted to Admin and Manager roles.

### Accessing Employee Management

1. From the POS main screen, click the **👥 Employees** button in the header
2. You'll see the Employee Management page with a list of all employees

### Viewing Employees

The Employee Management page shows:
- **Employee Number** (e.g., EMP-000001)
- **Name** (first and last name)
- **Email**
- **Phone** (if provided)
- **Role** (admin, manager, supervisor, cashier)
- **Hire Date**
- **Status** (Active/Inactive badge)
- **Actions** (Edit button)

### Searching and Filtering

**Search Bar**:
- Type employee name, email, or employee number
- Press Enter or click the **Search** button
- Results update automatically

**Filters**:
- **All Roles** dropdown - Filter by specific role (admin, manager, supervisor, cashier)
- **All Status** dropdown - Show active only, inactive only, or all employees

**Clear Filters**:
- Click the **Clear** button to reset all filters and show all employees

### Creating a New Employee

1. Click the **+ New Employee** button in the top right
2. Fill in the required fields:
   - **First Name** * (required)
   - **Last Name** * (required)
   - **Email** * (required, must be unique)
   - **Phone** (optional)
   - **Hire Date** * (required, defaults to today)
   - **Role** * (required, select from dropdown)
   - **Assigned Terminal ID** (optional)

3. Click **Create Employee**
4. The system will:
   - Auto-generate an employee number (EMP-000001, EMP-000002, etc.)
   - Set status to Active by default
   - Show success message
   - Return to employee list

### Editing an Employee

1. Find the employee in the list
2. Click the yellow **Edit** button
3. Update any fields you wish to change
4. **Note**: Hire Date cannot be changed after creation
5. Click **Update Employee** to save changes

**What You Can Edit**:
- First Name, Last Name
- Email (must remain unique)
- Phone
- Role assignment
- Assigned Terminal

**What You Cannot Edit**:
- Employee Number (auto-generated, permanent)
- Hire Date (locked after creation)

### Deactivating an Employee

> **Warning**: Deactivating an employee prevents them from accessing the system. Use this when employees leave or are terminated.

1. Open the employee in edit mode
2. Click the red **Deactivate Employee** button (top right)
3. Review the confirmation modal:
   - Shows employee name
   - Warns they will lose system access
4. Click **Deactivate** to confirm or **Cancel** to abort
5. The employee status changes to **Inactive**

**Effects of Deactivation**:
- Employee can no longer log in
- Status badge turns red
- Historical records remain intact (transactions, activities)
- Employee can be edited but not reactivated (no "undo")

---

### Role & Permission Management

> **Note**: Only Admins should access this feature. It controls who can do what in the system.

### Accessing Role Management

1. From the POS main screen, click the **👥 Employees** button
2. Navigate to the roles section or access via direct URL

**Alternative**: Some systems may have a separate **Roles** button in the navigation

### Viewing Roles

The Roles page shows:
- **Role Name** (e.g., admin, manager, supervisor, cashier)
- **Description** (what this role is for)
- **Number of Assigned Permissions** (out of 35 total)
- **Manage Permissions** button

**Default Roles**:
1. **Admin** - Full system access (all 35 permissions)
2. **Manager** - Manage inventory, POs, reports, approve transactions (25 permissions)
3. **Supervisor** - Supervise cashiers, handle voids and refunds (15 permissions)
4. **Cashier** - Basic POS operations, customer management (10 permissions)

### Creating a New Role

1. Click the **+ New Role** button (top right)
2. Fill in the modal form:
   - **Role Name** * (required, e.g., "supervisor", "team_lead")
   - **Description** (optional, describe responsibilities)
3. Click **Create Role**
4. The new role appears in the grid with 0 permissions
5. Click **Manage Permissions** to assign permissions

### Managing Permissions

1. Find the role and click **Manage Permissions**
2. A modal opens showing all 35 available permissions
3. The header shows: **"Permissions for [role_name]"** with count (e.g., "Assigned: 15 / 35")

**Permission Format**:
- ☐ **Permission Name** (e.g., `create_transaction`)
- Description (e.g., "Create new transaction")
- Checked = Assigned, Unchecked = Not assigned

**To Assign a Permission**:
- Check the box next to the permission
- It saves automatically
- Count updates in real-time

**To Revoke a Permission**:
- Uncheck the box next to the permission
- It saves automatically
- Count updates in real-time

**Available Permission Categories**:
- **Transactions**: create, view, void, refund
- **Products**: create, view, update, delete, manage_inventory
- **Customers**: create, view, update, delete
- **Categories**: create, view, update, delete
- **Inventory**: view, adjust, view_reports
- **Purchase Orders**: create, view, update, delete, submit, approve, receive, cancel, close
- **Employees**: create, view, update, delete (deactivate)
- **Roles**: create, view, assign_permissions, revoke_permissions
- **Reports**: view_sales, view_inventory, view_analytics

### Best Practices

**Role Design**:
- Keep roles focused on job functions (cashier vs manager)
- Don't over-permission roles (principle of least privilege)
- Review role permissions quarterly
- Document role purposes in the description field

**Employee Management**:
- Use descriptive role names (avoid generic names like "user1")
- Always assign roles when creating employees
- Deactivate employees immediately upon termination
- Regularly audit employee list for inactive accounts

**Security**:
- Limit who has Admin role (typically 1-2 people)
- Managers should not have delete permissions for transactions
- Cashiers should not access employee or role management
- Review permissions when employees change positions

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

**Future Features**:
- Split payments (cash + card)
- Credit card payment integration
- Receipt printer support
- Barcode scanner support
- Physical stock count workflow (cycle counting, variance tracking)
- Customer loyalty program
- Sales analytics and dashboards
- Line-item discounts
- Employee performance reports
- Vendor payment tracking
- PO return/exchange workflow

---

**User Guide Version**: 1.1
**Last Updated**: February 8, 2026
**Next Update**: After next phase implementation

**Your feedback helps us improve this guide!** Contact your administrator with suggestions or questions.
