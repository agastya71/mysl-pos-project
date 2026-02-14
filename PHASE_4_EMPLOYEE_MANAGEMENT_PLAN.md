# Phase 4: Employee Management - Implementation Plan

**Branch**: `feature/employee-management`
**Worktree**: `/Users/u0102180/Code/personal-project/pos-system-worktrees/feature-employee-management`
**Created**: 2026-02-14

## Overview

Implement comprehensive employee management system with roles, permissions, and activity tracking.

## Goals

1. **Employee CRUD**: Create, read, update, deactivate employees
2. **Role-Based Access Control (RBAC)**: Define roles with granular permissions
3. **Activity Tracking**: Audit log of employee actions
4. **Shift Management**: Track employee clock-in/clock-out times
5. **Performance Metrics**: Sales per employee, transaction counts

## Database Schema

### Tables to Create

#### 1. `employees` Table
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  employee_number VARCHAR(20) UNIQUE NOT NULL,  -- EMP-000001
  user_id INTEGER REFERENCES users(id),          -- Link to auth user
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  termination_date DATE,
  role_id INTEGER REFERENCES roles(id) NOT NULL,
  assigned_terminal_id INTEGER REFERENCES terminals(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `roles` Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,        -- admin, manager, cashier, inventory_manager
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `permissions` Table
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL, -- transactions.create, products.update, etc.
  resource VARCHAR(50) NOT NULL,                -- transactions, products, customers, etc.
  action VARCHAR(20) NOT NULL,                  -- create, read, update, delete, void
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `role_permissions` Table (Many-to-Many)
```sql
CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);
```

#### 5. `employee_activity_log` Table
```sql
CREATE TABLE employee_activity_log (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  user_id INTEGER REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,             -- login, logout, transaction, void, adjustment, etc.
  resource_type VARCHAR(50),                    -- transaction, product, customer, etc.
  resource_id INTEGER,                          -- ID of affected resource
  description TEXT,
  metadata JSONB,                               -- Additional context (IP, terminal, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. `employee_shifts` Table
```sql
CREATE TABLE employee_shifts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) NOT NULL,
  terminal_id INTEGER REFERENCES terminals(id),
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  break_duration_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2),                     -- Calculated on clock-out
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Functions

#### 1. Auto-generate Employee Numbers
```sql
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  new_number VARCHAR(20);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM employees;

  new_number := 'EMP-' || LPAD(next_num::TEXT, 6, '0');
  NEW.employee_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_number
BEFORE INSERT ON employees
FOR EACH ROW
WHEN (NEW.employee_number IS NULL)
EXECUTE FUNCTION generate_employee_number();
```

#### 2. Auto-calculate Shift Hours
```sql
CREATE OR REPLACE FUNCTION calculate_shift_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600
                     - (COALESCE(NEW.break_duration_minutes, 0) / 60.0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_shift_hours_trigger
BEFORE INSERT OR UPDATE ON employee_shifts
FOR EACH ROW
EXECUTE FUNCTION calculate_shift_hours();
```

## Backend Implementation

### Types (`backend/src/types/employee.types.ts`)
- Employee, CreateEmployeeDTO, UpdateEmployeeDTO
- Role, Permission, RoleWithPermissions
- EmployeeActivity, ActivityLogEntry
- EmployeeShift, ClockInDTO, ClockOutDTO
- EmployeePerformance (stats)

### Service Layer (`backend/src/services/employee.service.ts`)
- `createEmployee(data)` - Create new employee
- `getEmployees(filters, pagination)` - List with search/filter
- `getEmployeeById(id)` - Get full details
- `updateEmployee(id, data)` - Update employee
- `deactivateEmployee(id)` - Soft delete
- `getEmployeePerformance(id, dateRange)` - Sales stats
- `getEmployeeActivity(id, filters)` - Activity log
- `clockIn(employeeId, terminalId)` - Start shift
- `clockOut(employeeId)` - End shift
- `getCurrentShift(employeeId)` - Get active shift

### Role/Permission Service (`backend/src/services/role.service.ts`)
- `createRole(name, description)` - Create role
- `getRoles()` - List all roles
- `getRoleWithPermissions(id)` - Get role with permissions
- `assignPermission(roleId, permissionId)` - Grant permission
- `revokePermission(roleId, permissionId)` - Remove permission
- `getPermissions()` - List all permissions
- `checkPermission(userId, resource, action)` - Authorization check

### Controllers & Routes
- `employee.controller.ts` - Employee CRUD + performance
- `role.controller.ts` - Role/permission management
- `activity.controller.ts` - Activity log queries
- `shift.controller.ts` - Clock in/out

### Middleware (`backend/src/middleware/permission.middleware.ts`)
```typescript
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const hasPermission = await roleService.checkPermission(
      req.user!.userId,
      resource,
      action
    );
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## Frontend Implementation

### Pages
- `EmployeesPage.tsx` - List all employees with filters
- `EmployeeFormPage.tsx` - Create/edit employee
- `EmployeeDetailsPage.tsx` - View details, performance, activity
- `RolesPage.tsx` - Manage roles and permissions
- `MyShiftPage.tsx` - Clock in/out, view current shift

### Components
- `Employee/EmployeeList.tsx` - Table with search/filter
- `Employee/EmployeeCard.tsx` - Employee info card
- `Employee/PerformanceChart.tsx` - Sales/transaction charts
- `Employee/ActivityTimeline.tsx` - Activity log
- `Role/RoleList.tsx` - Role management
- `Role/PermissionMatrix.tsx` - Assign permissions to roles
- `Shift/ClockInOutButton.tsx` - Clock in/out widget
- `Shift/ShiftSummary.tsx` - Current shift info

### Redux Slices
- `employees.slice.ts` - Employee state management
- `roles.slice.ts` - Role/permission state
- `shifts.slice.ts` - Shift tracking state

## Implementation Phases

### Phase 4A: Core Employee Management ⭐ START HERE
1. Database schema (employees, roles, permissions, role_permissions)
2. Backend CRUD APIs
3. Frontend employee list and form
4. Basic role assignment

### Phase 4B: Activity Tracking
1. Activity log table
2. Activity logging service (middleware)
3. Frontend activity timeline/log viewer

### Phase 4C: Shift Management
1. Shift tracking table
2. Clock in/out APIs
3. Frontend shift UI (clock in/out button)
4. Shift reports

### Phase 4D: Performance Analytics
1. Performance queries (sales, transactions)
2. Backend analytics endpoints
3. Frontend charts and dashboards

## Seed Data

### Default Roles
```sql
INSERT INTO roles (role_name, description) VALUES
  ('admin', 'Full system access'),
  ('manager', 'Store manager - can manage inventory, employees, reports'),
  ('cashier', 'POS operator - can process transactions, manage customers'),
  ('inventory_manager', 'Manages inventory, purchase orders, adjustments');
```

### Default Permissions (Examples)
```sql
INSERT INTO permissions (permission_name, resource, action, description) VALUES
  ('transactions.create', 'transactions', 'create', 'Create new transactions'),
  ('transactions.void', 'transactions', 'void', 'Void transactions'),
  ('products.create', 'products', 'create', 'Create new products'),
  ('products.update', 'products', 'update', 'Update product details'),
  ('customers.create', 'customers', 'create', 'Create new customers'),
  ('employees.create', 'employees', 'create', 'Create new employees'),
  ('employees.update', 'employees', 'update', 'Update employee details'),
  ('inventory.adjust', 'inventory', 'adjust', 'Make inventory adjustments'),
  ('purchase_orders.create', 'purchase_orders', 'create', 'Create purchase orders'),
  ('purchase_orders.approve', 'purchase_orders', 'approve', 'Approve purchase orders'),
  ('reports.view', 'reports', 'view', 'View reports and analytics');
```

### Role-Permission Assignments (Example for Cashier)
```sql
-- Cashier permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_name = 'cashier'
  AND p.permission_name IN (
    'transactions.create',
    'customers.create',
    'customers.update'
  );
```

## API Endpoints

### Employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees` - List (with filters: role, status, search)
- `GET /api/v1/employees/:id` - Get by ID
- `PUT /api/v1/employees/:id` - Update employee
- `DELETE /api/v1/employees/:id` - Deactivate
- `GET /api/v1/employees/:id/performance` - Performance stats
- `GET /api/v1/employees/:id/activity` - Activity log

### Roles & Permissions
- `POST /api/v1/roles` - Create role
- `GET /api/v1/roles` - List roles
- `GET /api/v1/roles/:id` - Get role with permissions
- `PUT /api/v1/roles/:id` - Update role
- `POST /api/v1/roles/:id/permissions` - Assign permission
- `DELETE /api/v1/roles/:id/permissions/:permissionId` - Revoke permission
- `GET /api/v1/permissions` - List all permissions

### Shifts
- `POST /api/v1/shifts/clock-in` - Clock in
- `POST /api/v1/shifts/clock-out` - Clock out
- `GET /api/v1/shifts/current` - Get current shift
- `GET /api/v1/shifts` - List shifts (with filters)

## Testing Strategy

### Backend Tests
- Unit tests: employee.service.test.ts (15+ tests)
- Unit tests: role.service.test.ts (10+ tests)
- Integration tests: employee.api.test.ts (20+ tests)
- Integration tests: role.api.test.ts (10+ tests)

### Frontend Tests
- Redux: employees.slice.test.ts (20+ tests)
- Redux: roles.slice.test.ts (10+ tests)
- Component: EmployeeList.test.tsx (10+ tests)

## Security Considerations

1. **Password Hashing**: Use bcrypt for user passwords (already implemented)
2. **Permission Checks**: Middleware on all sensitive routes
3. **Activity Logging**: Log all sensitive operations
4. **Terminal Binding**: Restrict employees to assigned terminals (optional)
5. **Session Management**: Track active shifts, prevent duplicate clock-ins

## Next Steps

1. ✅ **Worktree created and ready**
2. ✅ **Dependencies installed**
3. 📝 **Start with Phase 4A: Core Employee Management**
4. ✅ **Follow TDD workflow** (write tests first)
5. ✅ **Create feature branch** (already on `feature/employee-management`)

## Commands to Start

```bash
# Navigate to worktree
cd /Users/u0102180/Code/personal-project/pos-system-worktrees/feature-employee-management

# Start backend (Terminal 1)
cd backend && npm run dev

# Start frontend (Terminal 2)
cd pos-client && npm run dev:webpack

# Run tests
cd backend && npm test
cd pos-client && npm test
```

## References

- MEMORY.md - Test-first workflow, git workflow
- TESTING.md - Testing patterns and examples
- CODE_DOCUMENTATION.md - Architecture patterns
- GIT_WORKTREE_GUIDE.md - Worktree management

---

**Ready to start implementing Phase 4A: Core Employee Management!**
