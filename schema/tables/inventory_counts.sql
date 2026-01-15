-- Inventory Counts Table
-- Purpose: Individual product counts with variance tracking

CREATE TABLE inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_session_id UUID REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    system_quantity INTEGER NOT NULL, -- Quantity per system at time of count
    counted_quantity INTEGER, -- Physical count
    variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
    variance_percentage DECIMAL(5,2), -- Calculated variance percentage
    variance_cost DECIMAL(10,2), -- Financial impact of variance
    counted_by UUID REFERENCES users(id),
    counted_at TIMESTAMP,
    recount_required BOOLEAN DEFAULT false,
    recount_quantity INTEGER,
    recount_by UUID REFERENCES users(id),
    recount_at TIMESTAMP,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    -- Status: pending, counted, verified, discrepancy
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_count_status CHECK (status IN ('pending', 'counted', 'verified', 'discrepancy'))
);

-- Indexes
CREATE INDEX idx_inventory_counts_session ON inventory_counts(count_session_id);
CREATE INDEX idx_inventory_counts_product ON inventory_counts(product_id);
CREATE INDEX idx_inventory_counts_status ON inventory_counts(status);
CREATE INDEX idx_inventory_counts_variance ON inventory_counts(variance);
