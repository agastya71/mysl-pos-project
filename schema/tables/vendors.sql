-- Vendors Table
-- Purpose: Enhanced vendor management supporting suppliers, donors, and consignment partners for non-profit operations

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_type VARCHAR(50) NOT NULL,
    -- Types: supplier, consignment, individual_donor, corporate_donor, thrift_partner
    business_name VARCHAR(255),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- Tax and Payment Information
    tax_id VARCHAR(50), -- EIN or SSN (encrypted)
    payment_terms VARCHAR(50), -- net_30, net_60, cod, prepaid, donation
    payment_method VARCHAR(50), -- check, ach, wire, paypal, venmo, cash

    -- Banking Details (for payments)
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    routing_number VARCHAR(20),
    account_number VARCHAR(100), -- encrypted

    -- Donation-specific fields
    is_donor BOOLEAN DEFAULT false,
    donor_category VARCHAR(50), -- individual, corporate, foundation, estate
    tax_exempt BOOLEAN DEFAULT false,
    receives_receipts BOOLEAN DEFAULT true,
    total_donated_value DECIMAL(12,2) DEFAULT 0,
    total_donated_items INTEGER DEFAULT 0,

    -- General vendor fields
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    internal_notes TEXT, -- Private notes not shown to vendor
    preferred_vendor BOOLEAN DEFAULT false,
    vendor_rating INTEGER, -- 1-5 stars
    is_active BOOLEAN DEFAULT true,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_vendor_type CHECK (vendor_type IN ('supplier', 'consignment', 'individual_donor', 'corporate_donor', 'thrift_partner')),
    CONSTRAINT valid_payment_terms CHECK (payment_terms IN ('net_15', 'net_30', 'net_60', 'net_90', 'cod', 'prepaid', 'donation', 'consignment')),
    CONSTRAINT valid_rating CHECK (vendor_rating IS NULL OR (vendor_rating >= 1 AND vendor_rating <= 5))
);

-- Indexes
CREATE INDEX idx_vendors_number ON vendors(vendor_number);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_is_donor ON vendors(is_donor);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_business_name ON vendors(business_name);
