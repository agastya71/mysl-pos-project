-- Trigger to set employee_number on insert
CREATE TRIGGER set_employee_number
  BEFORE INSERT ON employees
  FOR EACH ROW
  WHEN (NEW.employee_number IS NULL)
  EXECUTE FUNCTION generate_employee_number();

-- Add comment
COMMENT ON TRIGGER set_employee_number ON employees IS 'Auto-generates employee_number before insert if not provided';
