-- Generate Gift Card Number Function
-- Purpose: Auto-generate sequential gift card numbers in format GC-XXXXXXXXXX

CREATE OR REPLACE FUNCTION generate_gift_card_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_gc_number VARCHAR(20);
BEGIN
  -- Get next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(gift_card_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM gift_cards;

  -- Format: GC-0000000001
  new_gc_number := 'GC-' || LPAD(next_number::TEXT, 10, '0');

  NEW.gift_card_number := new_gc_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
