/**
 * Auto-generates sequential PO numbers with date-based format
 * Format: PO-YYYYMMDD-XXXX (e.g., PO-20260208-0001)
 *
 * Resets sequence daily for better organization and reporting
 * Called by trigger before INSERT on purchase_orders table
 */
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
  today TEXT;
  next_num INTEGER;
BEGIN
  -- Get today's date in YYYYMMDD format
  today := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Find the highest sequence number for today and increment
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 14) AS INTEGER)), 0) + 1
  INTO next_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || today || '-%';

  -- Generate PO number: PO-YYYYMMDD-XXXX
  NEW.po_number := 'PO-' || today || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
