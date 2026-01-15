-- Payment Allocations Table
-- Purpose: Link vendor payments to specific invoices

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_payment_id UUID REFERENCES vendor_payments(id) ON DELETE CASCADE,
    accounts_payable_id UUID REFERENCES accounts_payable(id) NOT NULL,

    allocated_amount DECIMAL(12,2) NOT NULL,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_allocated_amount CHECK (allocated_amount > 0)
);

-- Indexes
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(vendor_payment_id);
CREATE INDEX idx_payment_allocations_ap ON payment_allocations(accounts_payable_id);
