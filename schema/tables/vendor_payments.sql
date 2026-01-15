-- Vendor Payments Table
-- Purpose: Track payments made to vendors

CREATE TABLE vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    accounts_payable_id UUID REFERENCES accounts_payable(id),

    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL,
    -- Methods: check, ach, wire, credit_card, paypal, venmo, cash

    payment_amount DECIMAL(12,2) NOT NULL,
    discount_taken DECIMAL(12,2) DEFAULT 0,

    -- Payment details
    check_number VARCHAR(50),
    transaction_reference VARCHAR(255), -- ACH/Wire confirmation, PayPal transaction ID, etc.
    bank_account VARCHAR(100), -- Which account payment came from

    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, cleared, void, cancelled

    notes TEXT,

    processed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_payment_method CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'paypal', 'venmo', 'cash', 'other')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'cleared', 'void', 'cancelled')),
    CONSTRAINT positive_payment_amount CHECK (payment_amount > 0)
);

-- Indexes
CREATE INDEX idx_vendor_payments_number ON vendor_payments(payment_number);
CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_ap ON vendor_payments(accounts_payable_id);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date);
CREATE INDEX idx_vendor_payments_status ON vendor_payments(status);
