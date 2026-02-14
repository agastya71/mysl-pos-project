/**
 * Role & Permission API Client
 *
 * HTTP client methods for role and permission management endpoints.
 * All requests include JWT authentication via apiClient.
 */

import { apiClient } from './api.client';
import {
  Role,
  CreateRoleInput,
  UpdateRoleInput,
  RoleWithPermissions,
  Permission,
  AssignPermissionInput,
} from '../../types/employee.types';
import { ApiResponse } from '../../types/api.types';

/**
 * Create a new role
 */
export async function createRole(data: CreateRoleInput): Promise<Role> {
  const response = await apiClient.post<ApiResponse<Role>>('/roles', data);
  return response.data.data!;
}

/**
 * Get all roles
 */
export async function getRoles(): Promise<Role[]> {
  const response = await apiClient.get<ApiResponse<Role[]>>('/roles');
  return response.data.data!;
}

/**
 * Get role by ID with permissions
 */
export async function getRoleById(id: number): Promise<RoleWithPermissions> {
  const response = await apiClient.get<ApiResponse<RoleWithPermissions>>(`/roles/${id}`);
  return response.data.data!;
}

/**
 * Update role
 */
export async function updateRole(id: number, data: UpdateRoleInput): Promise<Role> {
  const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data);
  return response.data.data!;
}

/**
 * Assign permission to role
 */
export async function assignPermission(roleId: number, data: AssignPermissionInput): Promise<void> {
  await apiClient.post(`/roles/${roleId}/permissions`, data);
}

/**
 * Revoke permission from role
 */
export async function revokePermission(roleId: number, permissionId: number): Promise<void> {
  await apiClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
}

/**
 * Get all permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClient.get<ApiResponse<Permission[]>>('/roles/permissions/all');
  return response.data.data!;
}
