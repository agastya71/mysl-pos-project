-- Inventory Update Trigger
-- Purpose: Automatically update inventory when transactions are completed

CREATE TRIGGER update_inventory_trigger
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_transaction();
