-- Transaction Number Generator Function
-- Purpose: Generate unique transaction numbers per terminal

CREATE OR REPLACE FUNCTION generate_transaction_number(terminal_num INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    trans_number VARCHAR;
    date_part VARCHAR;
    sequence_part INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');

    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 12) AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM transactions
    WHERE transaction_number LIKE terminal_num || '-' || date_part || '%';

    trans_number := terminal_num || '-' || date_part || '-' || LPAD(sequence_part::TEXT, 4, '0');

    RETURN trans_number;
END;
$$ LANGUAGE plpgsql;
