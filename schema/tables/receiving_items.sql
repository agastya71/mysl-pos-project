-- Receiving Items Table
-- Purpose: Line-level receiving with condition tracking and quality control

CREATE TABLE receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receiving_id UUID REFERENCES inventory_receiving(id) ON DELETE CASCADE,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id),
    product_id UUID REFERENCES products(id),

    -- Product details (for new items)
    sku VARCHAR(100),
    product_name VARCHAR(255),
    product_description TEXT,
    category_id UUID REFERENCES categories(id),

    quantity_received INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0, -- 0 for donations
    fair_market_value DECIMAL(10,2), -- Individual item value for donations
    condition VARCHAR(50), -- new, like_new, good, fair, poor
    line_total DECIMAL(10,2) DEFAULT 0,

    -- Quality control
    accepted_quantity INTEGER,
    rejected_quantity INTEGER,
    rejection_reason TEXT,

    add_to_inventory BOOLEAN DEFAULT true,
    inventory_added BOOLEAN DEFAULT false,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_quantity_received CHECK (quantity_received > 0),
    CONSTRAINT valid_item_condition CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor', 'damaged'))
);

-- Indexes
CREATE INDEX idx_receiving_items_receiving ON receiving_items(receiving_id);
CREATE INDEX idx_receiving_items_po_item ON receiving_items(purchase_order_item_id);
CREATE INDEX idx_receiving_items_product ON receiving_items(product_id);
