-- Payment Details Table
-- Purpose: Additional payment details for cash, check, and card transactions

CREATE TABLE payment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    check_number VARCHAR(50), -- For check payments
    cash_received DECIMAL(10, 2), -- For cash payments
    cash_change DECIMAL(10, 2), -- For cash payments
    card_last_four VARCHAR(4), -- For card payments
    card_type VARCHAR(20), -- visa, mastercard, amex, discover
    authorization_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_details_payment ON payment_details(payment_id);
