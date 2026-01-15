-- Inventory Adjustments Table
-- Purpose: Track all inventory quantity changes with audit trail

CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    adjustment_type VARCHAR(50) NOT NULL,
    -- Types: restock, damage, theft, correction, return, shrinkage, transfer, reconciliation
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    reference_number VARCHAR(100), -- PO number, transfer number, etc.
    reconciliation_id UUID REFERENCES inventory_reconciliations(id),
    adjusted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    adjustment_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_adjustment_type CHECK (adjustment_type IN ('restock', 'damage', 'theft', 'correction', 'return', 'shrinkage', 'transfer', 'reconciliation'))
);

-- Indexes
CREATE INDEX idx_inventory_adjustments_product ON inventory_adjustments(product_id);
CREATE INDEX idx_inventory_adjustments_date ON inventory_adjustments(adjustment_date);
CREATE INDEX idx_inventory_adjustments_type ON inventory_adjustments(adjustment_type);
CREATE INDEX idx_inventory_adjustments_reconciliation ON inventory_adjustments(reconciliation_id);
