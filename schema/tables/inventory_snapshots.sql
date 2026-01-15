-- Inventory Snapshots Table
-- Purpose: Historical inventory levels for trend analysis

CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    value DECIMAL(12,2) NOT NULL, -- Total value at snapshot time
    cost_price DECIMAL(10,2),
    snapshot_date TIMESTAMP NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL,
    -- Types: daily, weekly, monthly, end_of_day, reconciliation
    reference_id UUID, -- Reference to reconciliation or count session
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'end_of_day', 'reconciliation'))
);

-- Indexes
CREATE INDEX idx_inventory_snapshots_product ON inventory_snapshots(product_id);
CREATE INDEX idx_inventory_snapshots_date ON inventory_snapshots(snapshot_date);
CREATE INDEX idx_inventory_snapshots_type ON inventory_snapshots(snapshot_type);
