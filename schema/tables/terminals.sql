-- Terminals Table
-- Purpose: POS terminal registration and heartbeat tracking

CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_name VARCHAR(100) NOT NULL UNIQUE,
    terminal_number INTEGER NOT NULL UNIQUE,
    location VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    last_heartbeat_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_terminals_number ON terminals(terminal_number);
CREATE INDEX idx_terminals_active ON terminals(is_active);
CREATE INDEX idx_terminals_heartbeat ON terminals(last_heartbeat_at);
