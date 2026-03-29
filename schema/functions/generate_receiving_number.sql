/**
 * Auto-generates sequential receiving numbers with date-based format
 * Format: RCV-YYYYMMDD-XXXX (e.g., RCV-20260328-0001)
 *
 * Resets sequence daily for better organization and reporting
 * Called by trigger before INSERT on inventory_receiving table
 */
CREATE OR REPLACE FUNCTION generate_receiving_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  next_num INTEGER;
BEGIN
  -- Get today's date in YYYYMMDD format
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Find the highest sequence number for today and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(receiving_number FROM 14) AS INTEGER)), 0) + 1
  INTO next_num
  FROM inventory_receiving
  WHERE receiving_number LIKE 'RCV-' || today || '-%';

  -- Generate receiving number: RCV-YYYYMMDD-XXXX
  NEW.receiving_number := 'RCV-' || today || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
