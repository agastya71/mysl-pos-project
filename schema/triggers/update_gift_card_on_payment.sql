-- Update Gift Card on Payment Trigger
-- Purpose: Auto-update gift card balance when payment is recorded

DROP TRIGGER IF EXISTS update_gift_card_on_payment ON payments;

CREATE TRIGGER update_gift_card_on_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_gift_card_balance();
