-- Transactions Table
-- Purpose: Main transaction records with multi-terminal support and offline sync capabilities

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    terminal_id UUID REFERENCES terminals(id) NOT NULL,
    cashier_id UUID REFERENCES users(id) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Status: draft, completed, voided, refunded, partially_refunded
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    voided_at TIMESTAMP,
    void_reason TEXT,
    voided_by UUID REFERENCES users(id),
    is_synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('draft', 'completed', 'voided', 'refunded', 'partially_refunded'))
);

-- Indexes
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_terminal ON transactions(terminal_id);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_sync ON transactions(is_synced);
