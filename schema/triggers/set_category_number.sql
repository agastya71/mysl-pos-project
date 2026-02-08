-- Trigger to automatically set category_number before insert
CREATE TRIGGER set_category_number
BEFORE INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION generate_category_number();
