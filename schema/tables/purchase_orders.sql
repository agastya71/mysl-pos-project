-- Purchase Orders Table
-- Purpose: Purchase order management with approval workflow

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    -- Types: purchase, donation, consignment, transfer
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- Status: draft, submitted, approved, partially_received, received, closed, cancelled

    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_date DATE,

    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    other_charges DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,

    shipping_address TEXT,
    billing_address TEXT,

    payment_terms VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    -- Status: unpaid, partial, paid, donation

    notes TEXT,
    internal_notes TEXT,

    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_po_order_type CHECK (order_type IN ('purchase', 'donation', 'consignment', 'transfer')),
    CONSTRAINT valid_po_status CHECK (status IN ('draft', 'submitted', 'approved', 'partially_received', 'received', 'closed', 'cancelled')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'donation', 'na'))
);

-- Indexes
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_orders_type ON purchase_orders(order_type);
