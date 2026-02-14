-- Seed default roles and permissions for Phase 4A

-- Insert default roles
INSERT INTO roles (role_name, description, is_active) VALUES
  ('admin', 'Full system access - can manage all resources including employees and system configuration', true),
  ('manager', 'Store manager - can manage inventory, employees (view only), and view reports', true),
  ('cashier', 'POS operator - can process transactions and manage customers', true),
  ('inventory_manager', 'Manages inventory, purchase orders, and adjustments', true)
ON CONFLICT (role_name) DO NOTHING;

-- Insert permissions
INSERT INTO permissions (permission_name, resource, action, description) VALUES
  -- Transaction permissions
  ('transactions.create', 'transactions', 'create', 'Create new sales transactions'),
  ('transactions.read', 'transactions', 'read', 'View transaction history'),
  ('transactions.void', 'transactions', 'void', 'Void completed transactions'),

  -- Product permissions
  ('products.create', 'products', 'create', 'Create new products'),
  ('products.read', 'products', 'read', 'View product catalog'),
  ('products.update', 'products', 'update', 'Update product details'),
  ('products.delete', 'products', 'delete', 'Delete products'),

  -- Customer permissions
  ('customers.create', 'customers', 'create', 'Create new customers'),
  ('customers.read', 'customers', 'read', 'View customer information'),
  ('customers.update', 'customers', 'update', 'Update customer details'),
  ('customers.delete', 'customers', 'delete', 'Delete customers'),

  -- Category permissions
  ('categories.create', 'categories', 'create', 'Create product categories'),
  ('categories.read', 'categories', 'read', 'View categories'),
  ('categories.update', 'categories', 'update', 'Update categories'),
  ('categories.delete', 'categories', 'delete', 'Delete categories'),

  -- Inventory permissions
  ('inventory.read', 'inventory', 'read', 'View inventory levels'),
  ('inventory.adjust', 'inventory', 'adjust', 'Make inventory adjustments'),
  ('inventory.reports', 'inventory', 'reports', 'View inventory reports'),

  -- Purchase order permissions
  ('purchase_orders.create', 'purchase_orders', 'create', 'Create purchase orders'),
  ('purchase_orders.read', 'purchase_orders', 'read', 'View purchase orders'),
  ('purchase_orders.update', 'purchase_orders', 'update', 'Update draft purchase orders'),
  ('purchase_orders.approve', 'purchase_orders', 'approve', 'Approve purchase orders'),
  ('purchase_orders.receive', 'purchase_orders', 'receive', 'Receive purchase order items'),
  ('purchase_orders.cancel', 'purchase_orders', 'cancel', 'Cancel purchase orders'),

  -- Employee permissions
  ('employees.create', 'employees', 'create', 'Create new employees'),
  ('employees.read', 'employees', 'read', 'View employee information'),
  ('employees.update', 'employees', 'update', 'Update employee details'),
  ('employees.delete', 'employees', 'delete', 'Deactivate employees'),

  -- Role permissions
  ('roles.create', 'roles', 'create', 'Create new roles'),
  ('roles.read', 'roles', 'read', 'View roles and permissions'),
  ('roles.update', 'roles', 'update', 'Update roles and assign permissions'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),

  -- Report permissions
  ('reports.sales', 'reports', 'sales', 'View sales reports and analytics'),
  ('reports.inventory', 'reports', 'inventory', 'View inventory reports'),
  ('reports.employees', 'reports', 'employees', 'View employee performance reports')
ON CONFLICT (permission_name) DO NOTHING;

-- Assign permissions to Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_name = 'manager'
  AND p.permission_name IN (
    'transactions.read',
    'transactions.void',
    'products.create',
    'products.read',
    'products.update',
    'customers.create',
    'customers.read',
    'customers.update',
    'categories.create',
    'categories.read',
    'categories.update',
    'inventory.read',
    'inventory.adjust',
    'inventory.reports',
    'purchase_orders.read',
    'purchase_orders.approve',
    'purchase_orders.receive',
    'employees.read',
    'roles.read',
    'reports.sales',
    'reports.inventory',
    'reports.employees'
  )
ON CONFLICT DO NOTHING;

-- Assign permissions to Cashier role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_name = 'cashier'
  AND p.permission_name IN (
    'transactions.create',
    'transactions.read',
    'products.read',
    'customers.create',
    'customers.read',
    'customers.update',
    'categories.read',
    'inventory.read'
  )
ON CONFLICT DO NOTHING;

-- Assign permissions to Inventory Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_name = 'inventory_manager'
  AND p.permission_name IN (
    'products.create',
    'products.read',
    'products.update',
    'categories.create',
    'categories.read',
    'categories.update',
    'inventory.read',
    'inventory.adjust',
    'inventory.reports',
    'purchase_orders.create',
    'purchase_orders.read',
    'purchase_orders.update',
    'purchase_orders.receive',
    'reports.inventory'
  )
ON CONFLICT DO NOTHING;
