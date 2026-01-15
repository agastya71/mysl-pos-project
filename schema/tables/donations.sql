-- Donations Table
-- Purpose: Donation tracking with IRS compliance for non-profit organizations

CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) NOT NULL, -- The donor
    receiving_id UUID REFERENCES inventory_receiving(id), -- Link to actual receipt

    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    donation_type VARCHAR(50) NOT NULL,
    -- Types: goods, cash, mixed

    -- Donor information (may differ from vendor record)
    donor_name VARCHAR(255) NOT NULL,
    donor_email VARCHAR(255),
    donor_phone VARCHAR(20),
    donor_address TEXT,

    -- Donation details
    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    fair_market_value DECIMAL(12,2) NOT NULL, -- Total appraised value
    cash_amount DECIMAL(12,2) DEFAULT 0,

    -- Tax receipt information
    tax_receipt_required BOOLEAN DEFAULT true,
    tax_receipt_sent BOOLEAN DEFAULT false,
    tax_receipt_number VARCHAR(50),
    tax_receipt_date DATE,

    -- IRS compliance (for donations over $250)
    acknowledgment_sent BOOLEAN DEFAULT false,
    acknowledgment_date DATE,
    goods_services_provided BOOLEAN DEFAULT false, -- Did donor receive anything in return?
    goods_services_description TEXT,
    goods_services_value DECIMAL(12,2) DEFAULT 0,

    -- Appraisal (required for items over $5,000)
    appraisal_required BOOLEAN DEFAULT false,
    appraiser_name VARCHAR(255),
    appraisal_date DATE,
    appraisal_document_url VARCHAR(500),

    notes TEXT,
    internal_notes TEXT,

    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_donation_type CHECK (donation_type IN ('goods', 'cash', 'mixed')),
    CONSTRAINT positive_fmv CHECK (fair_market_value >= 0)
);

-- Indexes
CREATE INDEX idx_donations_number ON donations(donation_number);
CREATE INDEX idx_donations_vendor ON donations(vendor_id);
CREATE INDEX idx_donations_date ON donations(donation_date);
CREATE INDEX idx_donations_receipt_sent ON donations(tax_receipt_sent);
