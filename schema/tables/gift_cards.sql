-- Gift Cards Table
-- Purpose: Store and track gift card information for purchase and redemption

CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_number VARCHAR(20) UNIQUE NOT NULL, -- Format: GC-XXXXXXXXXX
  initial_balance DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Purchase information
  purchased_transaction_id UUID REFERENCES transactions(id), -- Transaction where card was purchased
  purchased_by_customer_id UUID REFERENCES customers(id),
  purchased_at TIMESTAMP WITH TIME ZONE,

  -- Recipient information (optional)
  recipient_name VARCHAR(100),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),

  -- Activation
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by_user_id UUID REFERENCES users(id),

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT gift_card_balance_non_negative CHECK (current_balance >= 0),
  CONSTRAINT gift_card_initial_balance_positive CHECK (initial_balance > 0)
);

-- Indexes
CREATE INDEX idx_gift_cards_number ON gift_cards(gift_card_number);
CREATE INDEX idx_gift_cards_customer ON gift_cards(purchased_by_customer_id);
CREATE INDEX idx_gift_cards_active ON gift_cards(is_active) WHERE is_active = true;
CREATE INDEX idx_gift_cards_expires_at ON gift_cards(expires_at) WHERE expires_at IS NOT NULL;
