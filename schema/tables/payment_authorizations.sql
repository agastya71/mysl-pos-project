-- Payment Authorizations Table
-- Purpose: Track the full lifecycle of card payment authorizations

CREATE TABLE payment_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  processor_name VARCHAR(50) NOT NULL, -- 'square', 'stripe', 'clover', 'mock'

  -- Authorization details
  authorization_id VARCHAR(100), -- Processor's authorization ID
  authorization_code VARCHAR(50),
  authorization_amount DECIMAL(10,2) NOT NULL,
  authorized_at TIMESTAMP WITH TIME ZONE,

  -- Capture details
  capture_id VARCHAR(100), -- Processor's capture ID
  capture_amount DECIMAL(10,2),
  captured_at TIMESTAMP WITH TIME ZONE,

  -- Void/Refund details
  void_id VARCHAR(100),
  voided_at TIMESTAMP WITH TIME ZONE,
  refund_id VARCHAR(100),
  refund_amount DECIMAL(10,2),
  refunded_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'captured', 'voided', 'refunded', 'failed'

  -- Response data
  processor_response JSONB, -- Full response from processor
  failure_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_auth_status CHECK (status IN ('pending', 'authorized', 'captured', 'voided', 'refunded', 'failed')),
  CONSTRAINT positive_authorization_amount CHECK (authorization_amount > 0)
);

-- Indexes
CREATE INDEX idx_payment_auth_payment ON payment_authorizations(payment_id);
CREATE INDEX idx_payment_auth_processor ON payment_authorizations(processor_name);
CREATE INDEX idx_payment_auth_status ON payment_authorizations(status);
CREATE INDEX idx_payment_auth_authorization_id ON payment_authorizations(authorization_id);
