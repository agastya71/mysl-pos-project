-- Set Gift Card Number Trigger
-- Purpose: Auto-generate gift card number on insert

DROP TRIGGER IF EXISTS set_gift_card_number ON gift_cards;

CREATE TRIGGER set_gift_card_number
BEFORE INSERT ON gift_cards
FOR EACH ROW
WHEN (NEW.gift_card_number IS NULL)
EXECUTE FUNCTION generate_gift_card_number();
