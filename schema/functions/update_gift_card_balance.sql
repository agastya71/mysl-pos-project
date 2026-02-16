-- Update Gift Card Balance Function
-- Purpose: Automatically update gift card balance when payment is made and record transaction

CREATE OR REPLACE FUNCTION update_gift_card_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_balance_before DECIMAL(10,2);
  v_balance_after DECIMAL(10,2);
BEGIN
  -- Only process gift card payments
  IF NEW.payment_method = 'gift_card' AND NEW.gift_card_id IS NOT NULL THEN
    -- Get current balance before update
    SELECT current_balance INTO v_balance_before
    FROM gift_cards
    WHERE id = NEW.gift_card_id;

    -- Update gift card balance (deduct payment amount)
    UPDATE gift_cards
    SET
      current_balance = current_balance - NEW.amount,
      last_used_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.gift_card_id;

    -- Get balance after update
    SELECT current_balance INTO v_balance_after
    FROM gift_cards
    WHERE id = NEW.gift_card_id;

    -- Record transaction in audit trail
    INSERT INTO gift_card_transactions (
      gift_card_id,
      transaction_id,
      transaction_type,
      amount,
      balance_before,
      balance_after,
      created_at
    )
    VALUES (
      NEW.gift_card_id,
      NEW.transaction_id,
      'redemption',
      -NEW.amount, -- Negative for redemption
      v_balance_before,
      v_balance_after,
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
