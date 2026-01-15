-- Update Inventory on Transaction Function
-- Purpose: Automatically update inventory when transaction is completed

CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Deduct inventory for each product in the transaction
        UPDATE products p
        SET quantity_in_stock = quantity_in_stock - ti.quantity
        FROM transaction_items ti
        WHERE ti.transaction_id = NEW.id
        AND ti.product_id = p.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
