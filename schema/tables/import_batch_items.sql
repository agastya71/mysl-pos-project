-- Import Batch Items Table
-- Purpose: Track individual items within import batches

CREATE TABLE import_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number INTEGER,

    status VARCHAR(20), -- success, error, skipped
    product_id UUID REFERENCES products(id),
    receiving_id UUID REFERENCES inventory_receiving(id),

    source_data JSONB, -- Original row data
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_import_batch_items_batch ON import_batch_items(import_batch_id);
CREATE INDEX idx_import_batch_items_status ON import_batch_items(status);
CREATE INDEX idx_import_batch_items_product ON import_batch_items(product_id);
