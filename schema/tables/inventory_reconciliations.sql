-- Inventory Reconciliations Table
-- Purpose: Reconciliation records linking counts to adjustments

CREATE TABLE inventory_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_number VARCHAR(50) UNIQUE NOT NULL,
    count_session_id UUID REFERENCES inventory_count_sessions(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Status: pending, approved, rejected, completed
    total_items_counted INTEGER NOT NULL,
    items_with_variance INTEGER NOT NULL,
    total_variance_cost DECIMAL(12,2) NOT NULL,
    variance_percentage DECIMAL(5,2),
    reconciliation_date TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_reconciliation_status CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))
);

-- Indexes
CREATE INDEX idx_reconciliations_number ON inventory_reconciliations(reconciliation_number);
CREATE INDEX idx_reconciliations_session ON inventory_reconciliations(count_session_id);
CREATE INDEX idx_reconciliations_status ON inventory_reconciliations(status);
CREATE INDEX idx_reconciliations_date ON inventory_reconciliations(reconciliation_date);
