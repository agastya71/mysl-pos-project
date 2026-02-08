/**
 * Generate Adjustment Number Function
 *
 * Auto-generates sequential adjustment numbers in format: ADJ-XXXXXX
 * Example: ADJ-000001, ADJ-000002, etc.
 */

CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM inventory_adjustments
  WHERE adjustment_number IS NOT NULL;

  -- Format as ADJ-XXXXXX (6 digits, zero-padded)
  NEW.adjustment_number := 'ADJ-' || LPAD(next_num::TEXT, 6, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_adjustment_number() IS 'Generates sequential adjustment numbers in ADJ-XXXXXX format';
