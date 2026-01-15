# Database Schema

This folder contains the complete PostgreSQL database schema for the POS system, organized into modular SQL files for easy maintenance and deployment.

## Folder Structure

```
schema/
├── tables/           # Individual table definitions (30 tables)
├── views/            # Database views
├── functions/        # PostgreSQL functions
├── triggers/         # Database triggers
└── README.md         # This file
```

## Tables

The database consists of 30 tables organized into functional categories:

### Core Product & Catalog (4 tables)
- `categories.sql` - Product categorization with hierarchical support
- `products.sql` - Core product catalog with pricing and inventory
- `vendors.sql` - Vendor/supplier/donor management
- (view) `suppliers.sql` - Legacy view for backward compatibility

### System & Users (4 tables)
- `terminals.sql` - POS terminal registration and tracking
- `users.sql` - User management with RBAC
- `customers.sql` - Customer tracking for loyalty programs
- `sessions.sql` - Session management for authentication

### Sales & Transactions (5 tables)
- `transactions.sql` - Main transaction records
- `transaction_items.sql` - Transaction line items
- `payments.sql` - Payment processing records
- `payment_details.sql` - Additional payment details
- `refunds.sql` - Refund processing

### Procurement (6 tables)
- `purchase_orders.sql` - Purchase order management
- `purchase_order_items.sql` - PO line items
- `inventory_receiving.sql` - Goods receipt processing
- `receiving_items.sql` - Receiving line items
- `donations.sql` - Donation tracking with IRS compliance
- `import_batches.sql` & `import_batch_items.sql` - Bulk import tracking

### Accounts Payable (3 tables)
- `accounts_payable.sql` - Invoice tracking
- `vendor_payments.sql` - Payment to vendors
- `payment_allocations.sql` - Payment-to-invoice allocation

### Inventory Management (5 tables)
- `inventory_adjustments.sql` - Inventory quantity changes
- `inventory_count_sessions.sql` - Physical count sessions
- `inventory_counts.sql` - Individual product counts
- `inventory_reconciliations.sql` - Reconciliation records
- `inventory_snapshots.sql` - Historical inventory levels

### Audit & Administration (3 tables)
- `price_history.sql` - Price change audit trail
- `audit_log.sql` - Comprehensive system audit log
- `system_settings.sql` - System configuration

## Functions

### update_updated_at.sql
Automatically updates the `updated_at` timestamp on record updates.

### generate_transaction_number.sql
Generates unique transaction numbers per terminal with format: `{terminal}-{YYYYMMDD}-{sequence}`

### update_inventory_on_transaction.sql
Automatically deducts inventory when transactions are completed.

## Triggers

### update_timestamps.sql
Applies the `update_updated_at` function to all tables with `updated_at` columns.

### update_inventory.sql
Triggers inventory updates when transactions are completed.

## Views

### suppliers.sql
Legacy view that provides backward-compatible access to vendor data for suppliers only.

## Deployment

### Option 1: Deploy All Tables at Once

```bash
# Deploy in order to respect foreign key dependencies
psql -U postgres -d pos_database -f schema/tables/categories.sql
psql -U postgres -d pos_database -f schema/tables/vendors.sql
psql -U postgres -d pos_database -f schema/tables/terminals.sql
psql -U postgres -d pos_database -f schema/tables/users.sql
psql -U postgres -d pos_database -f schema/tables/products.sql
# ... continue with remaining tables
```

### Option 2: Use Deployment Script

Create a `deploy.sh` script:

```bash
#!/bin/bash
DB_NAME="pos_database"
DB_USER="postgres"

# Deploy tables
for file in schema/tables/*.sql; do
    echo "Deploying $file..."
    psql -U $DB_USER -d $DB_NAME -f "$file"
done

# Deploy views
for file in schema/views/*.sql; do
    echo "Deploying $file..."
    psql -U $DB_USER -d $DB_NAME -f "$file"
done

# Deploy functions
for file in schema/functions/*.sql; do
    echo "Deploying $file..."
    psql -U $DB_USER -d $DB_NAME -f "$file"
done

# Deploy triggers
for file in schema/triggers/*.sql; do
    echo "Deploying $file..."
    psql -U $DB_USER -d $DB_NAME -f "$file"
done

echo "Schema deployment complete!"
```

### Option 3: Use Migration Tool

Use a migration tool like Flyway, Liquibase, or node-pg-migrate to manage schema versions and deployments.

## Table Dependencies

Some tables have foreign key dependencies. Deploy in this order to avoid errors:

1. **Independent tables** (no dependencies):
   - categories
   - terminals

2. **Level 1 dependencies**:
   - users (depends on terminals)
   - vendors
   - customers

3. **Level 2 dependencies**:
   - products (depends on categories, vendors)
   - sessions (depends on users, terminals)
   - system_settings (depends on users)

4. **Level 3 dependencies**:
   - transactions (depends on terminals, users, customers)
   - purchase_orders (depends on vendors, users)
   - inventory_count_sessions (depends on categories, users)
   - price_history (depends on products, users)

5. **Level 4 dependencies**:
   - transaction_items (depends on transactions, products)
   - payments (depends on transactions)
   - purchase_order_items (depends on purchase_orders, products)
   - inventory_receiving (depends on purchase_orders, vendors, users)
   - donations (depends on vendors, users)
   - accounts_payable (depends on vendors, purchase_orders, users)
   - inventory_counts (depends on inventory_count_sessions, products, users)

6. **Level 5 dependencies**:
   - payment_details (depends on payments)
   - refunds (depends on transactions, users)
   - receiving_items (depends on inventory_receiving, purchase_order_items, products)
   - vendor_payments (depends on vendors, accounts_payable, users)
   - inventory_adjustments (depends on products, users)
   - inventory_reconciliations (depends on inventory_count_sessions, users)

7. **Level 6 dependencies**:
   - payment_allocations (depends on vendor_payments, accounts_payable)

## Maintenance

### Adding a New Table

1. Create a new `.sql` file in `schema/tables/`
2. Include:
   - Table comment describing purpose
   - CREATE TABLE statement with constraints
   - Indexes for commonly queried columns
3. Update this README with the new table
4. Update deployment scripts if using automated deployment

### Modifying an Existing Table

1. Create a migration file (e.g., `migrations/V2__add_column_to_products.sql`)
2. Test the migration in a development environment
3. Deploy to production during maintenance window
4. Update the table definition file to match current state

### Best Practices

- Always use transactions when deploying schema changes
- Back up the database before making schema changes
- Test schema changes in development environment first
- Use meaningful constraint names for easy troubleshooting
- Document complex business logic in table comments
- Keep indexes minimal but effective (index only what you query)

## Related Documentation

- [Data Model Architecture](../docs/architecture/DATA_MODEL.md) - High-level data model overview
- [API Endpoints](../docs/architecture/API_ENDPOINTS.md) - API specifications
- [Security & Deployment](../docs/architecture/SECURITY_DEPLOYMENT.md) - Security guidelines

---

**Maintained By:** Development Team
**Last Updated:** 2026-01-15
