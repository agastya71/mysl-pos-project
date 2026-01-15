-- Payments Table
-- Purpose: Payment processing with support for multiple processors and split payments

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    -- Payment methods: cash, check, credit_card, debit_card, gift_card, digital_wallet
    amount DECIMAL(10, 2) NOT NULL,
    payment_processor VARCHAR(50), -- square, stripe, manual
    processor_transaction_id VARCHAR(255),
    processor_payment_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, completed, failed, refunded, partially_refunded
    payment_date TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    metadata JSONB, -- Store processor-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'gift_card', 'digital_wallet')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded'))
);

-- Indexes
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_processor_id ON payments(processor_transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_method ON payments(payment_method);
