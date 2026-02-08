/**
 * Trigger: update_po_status_trigger
 * Automatically updates PO status when items are received
 *
 * Fires AFTER UPDATE on purchase_order_items table
 * Transitions status: approved → partially_received → received
 *
 * Sets delivery_date when PO becomes fully received
 */
CREATE TRIGGER update_po_status_trigger
  AFTER UPDATE ON purchase_order_items
  FOR EACH ROW
  WHEN (NEW.quantity_received <> OLD.quantity_received)
  EXECUTE FUNCTION update_po_status();
