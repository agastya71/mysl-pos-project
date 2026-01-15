-- Update Timestamp Triggers
-- Purpose: Apply update_updated_at function to relevant tables

-- Products table
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Transactions table
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vendors table
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Purchase Orders table
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Customers table
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Terminals table
CREATE TRIGGER update_terminals_updated_at
    BEFORE UPDATE ON terminals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categories table
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inventory Count Sessions table
CREATE TRIGGER update_count_sessions_updated_at
    BEFORE UPDATE ON inventory_count_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inventory Reconciliations table
CREATE TRIGGER update_reconciliations_updated_at
    BEFORE UPDATE ON inventory_reconciliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inventory Receiving table
CREATE TRIGGER update_receiving_updated_at
    BEFORE UPDATE ON inventory_receiving
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Accounts Payable table
CREATE TRIGGER update_accounts_payable_updated_at
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vendor Payments table
CREATE TRIGGER update_vendor_payments_updated_at
    BEFORE UPDATE ON vendor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- System Settings table
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Payments table
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Purchase Order Items table
CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Receiving Items table
CREATE TRIGGER update_receiving_items_updated_at
    BEFORE UPDATE ON receiving_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Donations table
CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
