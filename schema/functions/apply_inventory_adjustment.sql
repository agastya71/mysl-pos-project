/**
 * Apply Inventory Adjustment Function
 *
 * Automatically updates product quantity when an adjustment is created
 * Validates that the adjustment doesn't result in negative inventory
 */

CREATE OR REPLACE FUNCTION apply_inventory_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  current_qty INTEGER;
  new_qty INTEGER;
BEGIN
  -- Get current product quantity
  SELECT quantity_in_stock INTO current_qty
  FROM products
  WHERE id = NEW.product_id;

  -- Calculate new quantity
  new_qty := current_qty + NEW.quantity_change;

  -- Prevent negative inventory
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative inventory (current: %, change: %, result: %)',
      current_qty, NEW.quantity_change, new_qty;
  END IF;

  -- Update product quantity
  UPDATE products
  SET quantity_in_stock = new_qty,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_inventory_adjustment() IS 'Updates product quantity on adjustment insert and prevents negative inventory';
