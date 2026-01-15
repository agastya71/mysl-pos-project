-- Inventory Receiving Table
-- Purpose: Goods receipt processing with quality control and donation tracking

CREATE TABLE inventory_receiving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    receiving_type VARCHAR(50) NOT NULL,
    -- Types: purchase, donation, consignment, transfer, adjustment

    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    -- Status: in_progress, completed, cancelled

    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES users(id) NOT NULL,

    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0, -- 0 for donations

    shipping_carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    packing_slip_number VARCHAR(100),

    condition_notes TEXT, -- Condition of received items
    discrepancy_notes TEXT, -- Any discrepancies from PO
    internal_notes TEXT,

    -- Donation-specific fields
    is_donation BOOLEAN DEFAULT false,
    donation_receipt_sent BOOLEAN DEFAULT false,
    donation_receipt_number VARCHAR(50),
    donation_date DATE,
    fair_market_value DECIMAL(12,2), -- For donation receipts

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_receiving_type CHECK (receiving_type IN ('purchase', 'donation', 'consignment', 'transfer', 'adjustment')),
    CONSTRAINT valid_receiving_status CHECK (status IN ('in_progress', 'completed', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_receiving_number ON inventory_receiving(receiving_number);
CREATE INDEX idx_receiving_purchase_order ON inventory_receiving(purchase_order_id);
CREATE INDEX idx_receiving_vendor ON inventory_receiving(vendor_id);
CREATE INDEX idx_receiving_date ON inventory_receiving(received_date);
CREATE INDEX idx_receiving_type ON inventory_receiving(receiving_type);
CREATE INDEX idx_receiving_is_donation ON inventory_receiving(is_donation);
