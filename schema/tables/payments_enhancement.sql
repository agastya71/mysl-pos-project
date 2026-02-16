-- Payments Table Enhancement for Phase 4B
-- Purpose: Add gift card reference for gift card payments

-- Add gift_card_id column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gift_card_id UUID REFERENCES gift_cards(id);

-- Add constraint: gift card payments must reference a gift_card
ALTER TABLE payments DROP CONSTRAINT IF EXISTS check_gift_card_payment;
ALTER TABLE payments ADD CONSTRAINT check_gift_card_payment
  CHECK (
    payment_method != 'gift_card' OR gift_card_id IS NOT NULL
  );

-- Add index for gift card lookups
CREATE INDEX IF NOT EXISTS idx_payments_gift_card ON payments(gift_card_id);
