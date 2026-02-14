-- Function to auto-generate employee numbers (EMP-000001)
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_number VARCHAR(20);
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM employees
  WHERE employee_number ~ '^EMP-[0-9]+$';

  -- Format as EMP-XXXXXX (6 digits, zero-padded)
  new_number := 'EMP-' || LPAD(next_num::TEXT, 6, '0');

  NEW.employee_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION generate_employee_number() IS 'Auto-generates sequential employee numbers (EMP-000001, EMP-000002, etc.)';
