-- Trigger to auto-generate donation number on insert

DROP TRIGGER IF EXISTS set_donation_number ON donations;

CREATE TRIGGER set_donation_number
  BEFORE INSERT ON donations
  FOR EACH ROW
  WHEN (NEW.donation_number IS NULL OR NEW.donation_number = '')
  EXECUTE FUNCTION generate_donation_number();
