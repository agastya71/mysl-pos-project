/**
 * Trigger: set_receiving_number_trigger
 * Automatically generates receiving number before INSERT if not provided
 *
 * Format: RCV-YYYYMMDD-XXXX (e.g., RCV-20260328-0001)
 * Ensures all inventory receivings have unique sequential numbers
 */
CREATE TRIGGER set_receiving_number_trigger
  BEFORE INSERT ON inventory_receiving
  FOR EACH ROW
  WHEN (NEW.receiving_number IS NULL OR NEW.receiving_number = '')
  EXECUTE FUNCTION generate_receiving_number();
