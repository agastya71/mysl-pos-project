-- Accounts Payable Table
-- Purpose: Invoice tracking and accounts payable management

CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ap_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    receiving_id UUID REFERENCES inventory_receiving(id),

    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'open',
    -- Status: open, partial, paid, overdue, cancelled, disputed

    invoice_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) GENERATED ALWAYS AS (invoice_amount - amount_paid) STORED,

    discount_available DECIMAL(12,2) DEFAULT 0,
    discount_date DATE, -- Last date to take discount

    payment_terms VARCHAR(50),

    notes TEXT,
    internal_notes TEXT,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_ap_status CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'cancelled', 'disputed')),
    CONSTRAINT positive_invoice_amount CHECK (invoice_amount > 0)
);

-- Indexes
CREATE INDEX idx_accounts_payable_number ON accounts_payable(ap_number);
CREATE INDEX idx_accounts_payable_vendor ON accounts_payable(vendor_id);
CREATE INDEX idx_accounts_payable_po ON accounts_payable(purchase_order_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_invoice ON accounts_payable(invoice_number);
