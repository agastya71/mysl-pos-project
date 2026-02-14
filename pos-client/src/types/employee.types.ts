/**
 * Employee Management Types
 *
 * Frontend types for employee and role management features.
 * Mirrors backend types but adapted for frontend usage.
 */

export interface Employee {
  id: number;
  employee_number: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  hire_date: string; // ISO date string (YYYY-MM-DD)
  termination_date: string | null;
  role_id: number;
  role_name?: string;
  assigned_terminal_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: string; // YYYY-MM-DD
  role_id: number;
  assigned_terminal_id?: string;
  user_id?: string;
}

export interface UpdateEmployeeInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  assigned_terminal_id?: string;
  termination_date?: string;
  is_active?: boolean;
}

export interface EmployeeFilters {
  role_id?: number;
  is_active?: boolean;
  search?: string; // Search by name, email, or employee_number
}

export interface EmployeeListQuery extends EmployeeFilters {
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Role types
export interface Role {
  id: number;
  role_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  role_name: string;
  description?: string;
}

export interface UpdateRoleInput {
  role_name?: string;
  description?: string;
  is_active?: boolean;
}

// Permission types
export interface Permission {
  id: number;
  permission_name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface AssignPermissionInput {
  permission_id: number;
}
