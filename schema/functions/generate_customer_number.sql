-- Function to auto-generate customer numbers
-- Format: CUST-000001, CUST-000002, etc.

CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_number IS NULL OR NEW.customer_number = '' THEN
    NEW.customer_number := 'CUST-' || LPAD(nextval('customer_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
