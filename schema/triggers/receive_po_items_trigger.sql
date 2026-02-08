/**
 * Trigger: receive_po_items_trigger
 * Automatically updates product inventory when PO items are received
 *
 * Fires AFTER UPDATE on purchase_order_items table
 * Only when quantity_received increases (partial or full receiving)
 *
 * Ensures inventory is automatically updated without manual intervention
 */
CREATE TRIGGER receive_po_items_trigger
  AFTER UPDATE ON purchase_order_items
  FOR EACH ROW
  WHEN (NEW.quantity_received > OLD.quantity_received)
  EXECUTE FUNCTION receive_po_items();
