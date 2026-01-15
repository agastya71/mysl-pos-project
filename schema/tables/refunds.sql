-- Refunds Table
-- Purpose: Refund processing linked to original transactions

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID REFERENCES transactions(id),
    refund_transaction_id UUID REFERENCES transactions(id),
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_reason TEXT,
    refunded_by UUID REFERENCES users(id),
    refund_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    processor_refund_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_refund_amount CHECK (refund_amount > 0)
);

-- Indexes
CREATE INDEX idx_refunds_original_transaction ON refunds(original_transaction_id);
CREATE INDEX idx_refunds_refund_transaction ON refunds(refund_transaction_id);
CREATE INDEX idx_refunds_date ON refunds(refund_date);
CREATE INDEX idx_refunds_status ON refunds(status);
