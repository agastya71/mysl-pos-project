/**
 * @fileoverview Employee API Client
 *
 * HTTP client methods for employee management endpoints. All requests automatically
 * include JWT authentication via apiClient, which attaches the Authorization header
 * with the current user's JWT token from Redux store.
 *
 * API Base Path: /api/v1/employees
 *
 * Available Methods:
 * - createEmployee(data) - Create new employee (POST)
 * - getEmployees(query) - List employees with filters/pagination (GET)
 * - getEmployeeById(id) - Get employee by ID (GET)
 * - updateEmployee(id, data) - Update employee (PUT)
 * - deactivateEmployee(id) - Deactivate employee (DELETE)
 *
 * Error Handling:
 * All methods throw errors on network failures or HTTP error responses (4xx, 5xx).
 * Errors should be caught and handled by the calling component or Redux thunk.
 *
 * @module services/api/employee
 * @requires ./api.client
 * @requires ../../types/employee.types
 * @requires ../../types/api.types
 * @created 2026-02-14
 * @updated 2026-02-14
 */

import { apiClient } from './api.client';
import {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeListQuery,
  EmployeeListResponse,
} from '../../types/employee.types';
import { ApiResponse } from '../../types/api.types';

/**
 * Create a new employee
 *
 * Calls POST /api/v1/employees endpoint to create an employee with auto-generated
 * employee number (EMP-XXXXXX format). Returns the created employee with all fields
 * populated including the generated employee_number.
 *
 * @param {CreateEmployeeInput} data - Employee data for creation (requires first_name, last_name, email, hire_date, role_id)
 * @returns {Promise<Employee>} Promise resolving to the created employee record with employee_number
 * @throws {Error} If validation fails (400), email already exists (409), invalid role_id (400), or network error
 *
 * @example
 * // Create a new cashier employee
 * try {
 *   const newEmployee = await createEmployee({
 *     first_name: "John",
 *     last_name: "Doe",
 *     email: "john.doe@company.com",
 *     phone: "555-0100",
 *     hire_date: "2026-02-14",
 *     role_id: 2,
 *     assigned_terminal_id: "550e8400-e29b-41d4-a716-446655440000"
 *   });
 *   console.log(newEmployee.employee_number); // "EMP-000001"
 *   console.log(newEmployee.role_name); // "cashier"
 * } catch (error) {
 *   console.error("Failed to create employee:", error.message);
 * }
 */
export async function createEmployee(data: CreateEmployeeInput): Promise<Employee> {
  const response = await apiClient.post<ApiResponse<Employee>>('/employees', data);
  return response.data.data!;
}

/**
 * Get employees with filters and pagination
 *
 * Calls GET /api/v1/employees endpoint to retrieve a paginated list of employees.
 * Supports filtering by role, active status, and search text. Returns both the
 * employee array and pagination metadata.
 *
 * @param {EmployeeListQuery} [query={}] - Optional filters and pagination parameters
 * @param {number} [query.page=1] - Page number to retrieve (1-indexed)
 * @param {number} [query.limit=10] - Number of employees per page (max 100)
 * @param {number} [query.role_id] - Filter by specific role ID
 * @param {boolean} [query.is_active] - Filter by active status (true/false/undefined for all)
 * @param {string} [query.search] - Search by name, email, or employee_number
 * @returns {Promise<EmployeeListResponse>} Promise resolving to paginated employee list with metadata
 * @throws {Error} If query parameters are invalid (400) or network error
 *
 * @example
 * // Get first page of active cashiers
 * try {
 *   const result = await getEmployees({
 *     role_id: 2,
 *     is_active: true,
 *     page: 1,
 *     limit: 10
 *   });
 *   console.log(`Found ${result.total} employees`);
 *   console.log(`Showing page ${result.page} of ${result.totalPages}`);
 *   result.employees.forEach(emp => {
 *     console.log(`${emp.employee_number}: ${emp.first_name} ${emp.last_name}`);
 *   });
 * } catch (error) {
 *   console.error("Failed to fetch employees:", error.message);
 * }
 *
 * @example
 * // Search for employees by name
 * const searchResults = await getEmployees({ search: "john" });
 */
export async function getEmployees(query: EmployeeListQuery = {}): Promise<EmployeeListResponse> {
  const params = new URLSearchParams();

  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.role_id) params.append('role_id', query.role_id.toString());
  if (query.is_active !== undefined) params.append('is_active', query.is_active.toString());
  if (query.search) params.append('search', query.search);

  const response = await apiClient.get<ApiResponse<EmployeeListResponse>>(
    `/employees?${params.toString()}`
  );
  return response.data.data!;
}

/**
 * Get employee by ID
 *
 * Calls GET /api/v1/employees/:id endpoint to retrieve a single employee record
 * with full details including role information. Used for employee detail views
 * and edit forms.
 *
 * @param {number} id - Employee ID (must be positive integer)
 * @returns {Promise<Employee>} Promise resolving to the employee record with role_name
 * @throws {Error} If employee not found (404), invalid ID (400), or network error
 *
 * @example
 * // Fetch employee details for editing
 * try {
 *   const employee = await getEmployeeById(1);
 *   console.log(`${employee.employee_number}: ${employee.first_name} ${employee.last_name}`);
 *   console.log(`Role: ${employee.role_name}`);
 *   console.log(`Status: ${employee.is_active ? 'Active' : 'Inactive'}`);
 * } catch (error) {
 *   if (error.response?.status === 404) {
 *     console.error("Employee not found");
 *   }
 * }
 */
export async function getEmployeeById(id: number): Promise<Employee> {
  const response = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
  return response.data.data!;
}

/**
 * Update employee
 *
 * Calls PUT /api/v1/employees/:id endpoint to update an existing employee record.
 * Only include fields you want to update - all fields are optional. Note that
 * employee_number and hire_date cannot be updated after creation.
 *
 * @param {number} id - Employee ID to update (must be positive integer)
 * @param {UpdateEmployeeInput} data - Partial employee data to update (all fields optional)
 * @returns {Promise<Employee>} Promise resolving to the updated employee record with all fields
 * @throws {Error} If employee not found (404), validation fails (400), email conflict (409), or network error
 *
 * @example
 * // Update employee phone and role
 * try {
 *   const updatedEmployee = await updateEmployee(1, {
 *     phone: "555-0199",
 *     role_id: 3,
 *     assigned_terminal_id: "550e8400-e29b-41d4-a716-446655440000"
 *   });
 *   console.log("Employee updated successfully");
 *   console.log(`New role: ${updatedEmployee.role_name}`);
 * } catch (error) {
 *   if (error.response?.status === 409) {
 *     console.error("Email already exists");
 *   }
 * }
 *
 * @example
 * // Terminate an employee
 * const terminated = await updateEmployee(1, {
 *   termination_date: "2026-02-14",
 *   is_active: false
 * });
 */
export async function updateEmployee(id: number, data: UpdateEmployeeInput): Promise<Employee> {
  const response = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, data);
  return response.data.data!;
}

/**
 * Deactivate employee (soft delete)
 *
 * Calls DELETE /api/v1/employees/:id endpoint to deactivate an employee (soft delete).
 * The employee record is not removed from the database but is marked as inactive
 * (is_active = false). The employee can be reactivated later by calling updateEmployee
 * with is_active: true.
 *
 * @param {number} id - Employee ID to deactivate (must be positive integer)
 * @returns {Promise<Employee>} Promise resolving to the deactivated employee record with is_active = false
 * @throws {Error} If employee not found (404), invalid ID (400), or network error
 *
 * @example
 * // Deactivate an employee
 * try {
 *   const deactivated = await deactivateEmployee(1);
 *   console.log(`Employee ${deactivated.employee_number} deactivated`);
 *   console.log(`Status: ${deactivated.is_active ? 'Active' : 'Inactive'}`); // Inactive
 * } catch (error) {
 *   if (error.response?.status === 404) {
 *     console.error("Employee not found");
 *   }
 * }
 *
 * @example
 * // Deactivate and show confirmation in UI
 * const handleDeactivate = async (employeeId: number) => {
 *   if (confirm("Are you sure you want to deactivate this employee?")) {
 *     await deactivateEmployee(employeeId);
 *     alert("Employee deactivated successfully");
 *   }
 * };
 */
export async function deactivateEmployee(id: number): Promise<Employee> {
  const response = await apiClient.delete<ApiResponse<Employee>>(`/employees/${id}`);
  return response.data.data!;
}
