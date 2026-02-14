/**
 * Employee API Client
 *
 * HTTP client methods for employee management endpoints.
 * All requests include JWT authentication via apiClient.
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
 */
export async function createEmployee(data: CreateEmployeeInput): Promise<Employee> {
  const response = await apiClient.post<ApiResponse<Employee>>('/employees', data);
  return response.data.data!;
}

/**
 * Get employees with filters and pagination
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
 */
export async function getEmployeeById(id: number): Promise<Employee> {
  const response = await apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
  return response.data.data!;
}

/**
 * Update employee
 */
export async function updateEmployee(id: number, data: UpdateEmployeeInput): Promise<Employee> {
  const response = await apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, data);
  return response.data.data!;
}

/**
 * Deactivate employee (soft delete)
 */
export async function deactivateEmployee(id: number): Promise<Employee> {
  const response = await apiClient.delete<ApiResponse<Employee>>(`/employees/${id}`);
  return response.data.data!;
}
