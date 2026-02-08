/**
 * Auto-updates product inventory when PO items are received
 * Triggered on UPDATE of purchase_order_items.quantity_received
 *
 * Increases product.quantity_in_stock by the delta between old and new received quantities
 * Pattern mirrors apply_inventory_adjustment() from Phase 3B
 *
 * Example:
 *   - Item has quantity_received = 10
 *   - Update to quantity_received = 15
 *   - Product inventory increases by 5 units
 */
CREATE OR REPLACE FUNCTION receive_po_items()
RETURNS TRIGGER AS $$
DECLARE
  qty_delta INTEGER;
BEGIN
  -- Calculate the increase in received quantity
  qty_delta := NEW.quantity_received - OLD.quantity_received;

  -- Only update if received quantity actually increased
  IF qty_delta > 0 THEN
    UPDATE products
    SET quantity_in_stock = quantity_in_stock + qty_delta,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
