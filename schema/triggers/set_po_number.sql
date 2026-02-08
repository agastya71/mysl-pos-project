/**
 * Trigger: set_po_number_trigger
 * Automatically generates PO number before INSERT if not provided
 *
 * Format: PO-YYYYMMDD-XXXX (e.g., PO-20260208-0001)
 * Ensures all purchase orders have unique sequential numbers
 */
CREATE TRIGGER set_po_number_trigger
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION generate_po_number();
