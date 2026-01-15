-- Purchase Order Items Table
-- Purpose: Line items for purchase orders with received quantity tracking

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),

    -- Product details (for new items not yet in catalog)
    sku VARCHAR(100),
    product_name VARCHAR(255),
    product_description TEXT,

    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    quantity_pending INTEGER GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

    unit_cost DECIMAL(10,2) DEFAULT 0, -- Cost per unit (0 for donations)
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) DEFAULT 0,

    expected_delivery_date DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_quantity_ordered CHECK (quantity_ordered > 0),
    CONSTRAINT positive_unit_cost CHECK (unit_cost >= 0)
);

-- Indexes
CREATE INDEX idx_po_items_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);
