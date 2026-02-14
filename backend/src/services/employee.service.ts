import { pool } from '../config/database';
import {
  Employee,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeFilters,
  EmployeePagination,
  EmployeeListResult,
} from '../types/employee.types';

/**
 * Create a new employee
 */
export async function createEmployee(data: CreateEmployeeDTO): Promise<Employee> {
  const query = `
    INSERT INTO employees (
      first_name, last_name, email, phone, hire_date,
      role_id, assigned_terminal_id, user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    data.first_name,
    data.last_name,
    data.email,
    data.phone || null,
    data.hire_date,
    data.role_id,
    data.assigned_terminal_id || null,
    data.user_id || null,
  ];

  const result = await pool.query(query, values);

  if (result.rowCount === null || result.rowCount === 0) {
    throw new Error('Failed to create employee');
  }

  return result.rows[0];
}

/**
 * Get employees with filters and pagination
 */
export async function getEmployees(
  filters: EmployeeFilters = {},
  pagination: EmployeePagination = {}
): Promise<EmployeeListResult> {
  const page = pagination.page || 1;
  const limit = pagination.limit || 10;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.role_id !== undefined) {
    conditions.push(`e.role_id = $${paramIndex}`);
    params.push(filters.role_id);
    paramIndex++;
  }

  if (filters.is_active !== undefined) {
    conditions.push(`e.is_active = $${paramIndex}`);
    params.push(filters.is_active);
    paramIndex++;
  }

  if (filters.search) {
    conditions.push(`(
      e.first_name ILIKE $${paramIndex} OR
      e.last_name ILIKE $${paramIndex} OR
      e.email ILIKE $${paramIndex} OR
      e.employee_number ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get employees
  const query = `
    SELECT
      e.*,
      r.role_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await pool.query(query, params);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM employees e
    ${whereClause}
  `;

  const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    employees: result.rows,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: number): Promise<Employee | null> {
  const query = `
    SELECT
      e.*,
      r.role_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE e.id = $1
  `;

  const result = await pool.query(query, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get employee by email
 */
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const query = `
    SELECT
      e.*,
      r.role_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    WHERE e.email = $1
  `;

  const result = await pool.query(query, [email]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update employee
 */
export async function updateEmployee(
  id: number,
  data: UpdateEmployeeDTO
): Promise<Employee | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.first_name !== undefined) {
    fields.push(`first_name = $${paramIndex}`);
    values.push(data.first_name);
    paramIndex++;
  }

  if (data.last_name !== undefined) {
    fields.push(`last_name = $${paramIndex}`);
    values.push(data.last_name);
    paramIndex++;
  }

  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex}`);
    values.push(data.email);
    paramIndex++;
  }

  if (data.phone !== undefined) {
    fields.push(`phone = $${paramIndex}`);
    values.push(data.phone);
    paramIndex++;
  }

  if (data.role_id !== undefined) {
    fields.push(`role_id = $${paramIndex}`);
    values.push(data.role_id);
    paramIndex++;
  }

  if (data.assigned_terminal_id !== undefined) {
    fields.push(`assigned_terminal_id = $${paramIndex}`);
    values.push(data.assigned_terminal_id);
    paramIndex++;
  }

  if (data.termination_date !== undefined) {
    fields.push(`termination_date = $${paramIndex}`);
    values.push(data.termination_date);
    paramIndex++;
  }

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex}`);
    values.push(data.is_active);
    paramIndex++;
  }

  if (fields.length === 0) {
    // No fields to update
    return await getEmployeeById(id);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE employees
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Deactivate employee (soft delete)
 */
export async function deactivateEmployee(id: number): Promise<Employee | null> {
  const query = `
    UPDATE employees
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}
