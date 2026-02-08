-- Trigger to auto-generate customer number on insert

DROP TRIGGER IF EXISTS set_customer_number ON customers;

CREATE TRIGGER set_customer_number
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_number();
