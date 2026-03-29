/**
 * Auto-generates sequential donation numbers with date-based format
 * Format: DON-YYYYMMDD-NNNN (e.g., DON-20260329-0001)
 *
 * Resets sequence daily for better organization and reporting
 * Called by trigger before INSERT on donations table
 */
CREATE OR REPLACE FUNCTION generate_donation_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  next_num INTEGER;
BEGIN
  -- Get today's date in YYYYMMDD format
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Find the highest sequence number for today and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(donation_number FROM 14) AS INTEGER)), 0) + 1
  INTO next_num
  FROM donations
  WHERE donation_number LIKE 'DON-' || today || '-%';

  -- Generate donation number: DON-YYYYMMDD-NNNN
  NEW.donation_number := 'DON-' || today || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
