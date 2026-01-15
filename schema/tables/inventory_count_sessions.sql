-- Inventory Count Sessions Table
-- Purpose: Physical inventory count session management

CREATE TABLE inventory_count_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_number VARCHAR(50) UNIQUE NOT NULL,
    count_type VARCHAR(50) NOT NULL,
    -- Types: full_count, cycle_count, spot_check, category_count
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    -- Status: in_progress, completed, cancelled, reconciled
    category_id UUID REFERENCES categories(id), -- For category-specific counts
    scheduled_date DATE,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    started_by UUID REFERENCES users(id),
    notes TEXT,
    is_blind_count BOOLEAN DEFAULT false, -- Hide system quantities from counters
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_count_type CHECK (count_type IN ('full_count', 'cycle_count', 'spot_check', 'category_count')),
    CONSTRAINT valid_session_status CHECK (status IN ('in_progress', 'completed', 'cancelled', 'reconciled'))
);

-- Indexes
CREATE INDEX idx_count_sessions_number ON inventory_count_sessions(session_number);
CREATE INDEX idx_count_sessions_status ON inventory_count_sessions(status);
CREATE INDEX idx_count_sessions_date ON inventory_count_sessions(scheduled_date);
CREATE INDEX idx_count_sessions_type ON inventory_count_sessions(count_type);
