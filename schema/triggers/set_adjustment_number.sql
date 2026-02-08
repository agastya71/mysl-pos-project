/**
 * Trigger: Set Adjustment Number
 *
 * Automatically generates adjustment_number before insert
 */

DROP TRIGGER IF EXISTS set_adjustment_number ON inventory_adjustments;

CREATE TRIGGER set_adjustment_number
BEFORE INSERT ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION generate_adjustment_number();

COMMENT ON TRIGGER set_adjustment_number ON inventory_adjustments IS 'Auto-generates adjustment_number on insert';
