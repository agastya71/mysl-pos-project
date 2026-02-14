-- Employees table with auto-generated employee numbers
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_number VARCHAR(20) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  termination_date DATE,
  role_id INTEGER REFERENCES roles(id) NOT NULL,
  assigned_terminal_id UUID REFERENCES terminals(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_termination_after_hire CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

-- Add indexes
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_role_id ON employees(role_id);
CREATE INDEX idx_employees_active ON employees(is_active);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_name ON employees(last_name, first_name);

-- Add updated_at trigger
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE employees IS 'Employee records with role assignments';
COMMENT ON COLUMN employees.employee_number IS 'Auto-generated unique identifier (EMP-000001)';
COMMENT ON COLUMN employees.user_id IS 'Link to users table for authentication';
COMMENT ON COLUMN employees.role_id IS 'Assigned role for permissions';
COMMENT ON COLUMN employees.assigned_terminal_id IS 'Default terminal assignment';
