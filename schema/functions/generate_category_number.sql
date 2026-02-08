-- Function to generate category numbers (CAT-XXXXXX)
CREATE OR REPLACE FUNCTION generate_category_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(category_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM categories
  WHERE category_number IS NOT NULL;

  -- Generate the category number
  NEW.category_number := 'CAT-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
