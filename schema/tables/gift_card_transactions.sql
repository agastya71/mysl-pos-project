-- Gift Card Transactions Table
-- Purpose: Audit trail for all gift card balance changes

CREATE TABLE gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id), -- NULL for initial purchase or adjustments
  transaction_type VARCHAR(20) NOT NULL, -- 'purchase', 'redemption', 'adjustment', 'expiration'
  amount DECIMAL(10,2) NOT NULL, -- Positive for purchase/adjustment up, negative for redemption
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'redemption', 'adjustment', 'expiration'))
);

-- Indexes
CREATE INDEX idx_gift_card_txn_card ON gift_card_transactions(gift_card_id);
CREATE INDEX idx_gift_card_txn_transaction ON gift_card_transactions(transaction_id);
CREATE INDEX idx_gift_card_txn_type ON gift_card_transactions(transaction_type);
CREATE INDEX idx_gift_card_txn_created_at ON gift_card_transactions(created_at);
