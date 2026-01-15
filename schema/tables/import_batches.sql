-- Import Batches Table
-- Purpose: Track bulk import operations

CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    import_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_format VARCHAR(20),

    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    skipped_records INTEGER,

    status VARCHAR(20) DEFAULT 'processing',
    -- Status: processing, completed, failed, cancelled

    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    imported_by UUID REFERENCES users(id),
    error_log JSONB,
    import_summary JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_import_batches_number ON import_batches(batch_number);
CREATE INDEX idx_import_batches_vendor ON import_batches(vendor_id);
CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_date ON import_batches(started_at);
