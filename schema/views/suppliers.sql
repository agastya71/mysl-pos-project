-- Suppliers View
-- Purpose: Legacy suppliers view for backwards compatibility

CREATE VIEW suppliers AS
SELECT
    id,
    business_name as name,
    contact_person,
    email,
    phone,
    CONCAT_WS(', ', address_line1, address_line2, city, state, zip_code) as address,
    is_active,
    created_at
FROM vendors
WHERE vendor_type IN ('supplier', 'thrift_partner');
