/**
 * Inventory Adjustments Table (Phase 3B)
 *
 * Tracks all manual inventory adjustments with complete audit trail
 * Supports: damage, theft, found items, corrections, and initial stock
 */

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(50) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('damage', 'theft', 'found', 'correction', 'initial')),
  quantity_change INTEGER NOT NULL,
  old_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID NOT NULL REFERENCES users(id),
  adjustment_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_inv_adj_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_adj_date ON inventory_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_inv_adj_type ON inventory_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_inv_adj_adjusted_by ON inventory_adjustments(adjusted_by);

-- Comments
COMMENT ON TABLE inventory_adjustments IS 'Manual inventory adjustments with complete audit trail (Phase 3B)';
COMMENT ON COLUMN inventory_adjustments.adjustment_number IS 'Auto-generated unique adjustment number (ADJ-XXXXXX)';
COMMENT ON COLUMN inventory_adjustments.adjustment_type IS 'Type: damage, theft, found, correction, initial';
COMMENT ON COLUMN inventory_adjustments.quantity_change IS 'Change in quantity (positive or negative)';
COMMENT ON COLUMN inventory_adjustments.old_quantity IS 'Quantity before adjustment';
COMMENT ON COLUMN inventory_adjustments.new_quantity IS 'Quantity after adjustment';
COMMENT ON COLUMN inventory_adjustments.reason IS 'Required explanation for the adjustment';
