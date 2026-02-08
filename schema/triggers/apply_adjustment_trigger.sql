/**
 * Trigger: Apply Adjustment
 *
 * Automatically updates product inventory after adjustment insert
 */

DROP TRIGGER IF EXISTS apply_adjustment_trigger ON inventory_adjustments;

CREATE TRIGGER apply_adjustment_trigger
AFTER INSERT ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION apply_inventory_adjustment();

COMMENT ON TRIGGER apply_adjustment_trigger ON inventory_adjustments IS 'Updates product quantity and validates no negative inventory';
