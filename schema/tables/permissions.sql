-- Permissions table for granular access control
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Add comment
COMMENT ON TABLE permissions IS 'Granular permissions for RBAC system';
COMMENT ON COLUMN permissions.permission_name IS 'Unique permission identifier (e.g., transactions.create)';
COMMENT ON COLUMN permissions.resource IS 'Resource type (e.g., transactions, products, customers)';
COMMENT ON COLUMN permissions.action IS 'Action type (e.g., create, read, update, delete, void)';
