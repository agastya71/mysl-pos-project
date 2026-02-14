/**
 * @fileoverview Role & Permission API Client
 *
 * HTTP client methods for role-based access control (RBAC) operations. All requests
 * automatically include JWT authentication via apiClient, which attaches the
 * Authorization header with the current user's JWT token from Redux store.
 *
 * API Base Paths:
 * - /api/v1/roles - Role management
 * - /api/v1/roles/:id/permissions - Permission assignments
 * - /api/v1/roles/permissions/all - Permission listing
 *
 * Available Methods:
 * - createRole(data) - Create new role (POST)
 * - getRoles() - List all roles (GET)
 * - getRoleById(id) - Get role with permissions (GET)
 * - updateRole(id, data) - Update role (PUT)
 * - assignPermission(roleId, data) - Assign permission to role (POST)
 * - revokePermission(roleId, permissionId) - Revoke permission from role (DELETE)
 * - getPermissions() - Get all available permissions (GET)
 *
 * Error Handling:
 * All methods throw errors on network failures or HTTP error responses (4xx, 5xx).
 * Errors should be caught and handled by the calling component or Redux thunk.
 *
 * @module services/api/role
 * @requires ./api.client
 * @requires ../../types/employee.types
 * @requires ../../types/api.types
 * @created 2026-02-14
 * @updated 2026-02-14
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
 *
 * Calls POST /api/v1/roles endpoint to create a new role in the RBAC system.
 * After creation, use assignPermission() to add permissions to the role.
 * Returns the created role with is_active = true by default.
 *
 * @param {CreateRoleInput} data - Role data for creation (requires role_name, optional description)
 * @returns {Promise<Role>} Promise resolving to the created role record
 * @throws {Error} If validation fails (400), role_name already exists (409), or network error
 *
 * @example
 * // Create a new supervisor role
 * try {
 *   const newRole = await createRole({
 *     role_name: "supervisor",
 *     description: "Supervise cashiers and handle voids/refunds"
 *   });
 *   console.log(`Role created with ID: ${newRole.id}`);
 *   console.log(`Role name: ${newRole.role_name}`);
 * } catch (error) {
 *   if (error.response?.status === 409) {
 *     console.error("Role name already exists");
 *   }
 * }
 */
export async function createRole(data: CreateRoleInput): Promise<Role> {
  const response = await apiClient.post<ApiResponse<Role>>('/roles', data);
  return response.data.data!;
}

/**
 * Get all roles
 *
 * Calls GET /api/v1/roles endpoint to retrieve all roles in the system.
 * Returns roles without their permissions - use getRoleById() to fetch a specific
 * role with its full permission list. Useful for populating role dropdowns and lists.
 *
 * @returns {Promise<Role[]>} Promise resolving to array of all role records (without permissions)
 * @throws {Error} If network error or server error
 *
 * @example
 * // Fetch all roles for a dropdown selector
 * try {
 *   const roles = await getRoles();
 *   console.log(`Found ${roles.length} roles`);
 *   roles.forEach(role => {
 *     console.log(`${role.role_name}: ${role.description || 'No description'}`);
 *   });
 * } catch (error) {
 *   console.error("Failed to fetch roles:", error.message);
 * }
 *
 * @example
 * // Filter for active roles only
 * const activeRoles = (await getRoles()).filter(role => role.is_active);
 */
export async function getRoles(): Promise<Role[]> {
  const response = await apiClient.get<ApiResponse<Role[]>>('/roles');
  return response.data.data!;
}

/**
 * Get role by ID with permissions
 *
 * Calls GET /api/v1/roles/:id endpoint to retrieve a single role record with its
 * complete permission list. Used for role detail views and permission management UI.
 * Returns RoleWithPermissions which extends Role with a permissions array.
 *
 * @param {number} id - Role ID (must be positive integer)
 * @returns {Promise<RoleWithPermissions>} Promise resolving to role record with permissions array
 * @throws {Error} If role not found (404), invalid ID (400), or network error
 *
 * @example
 * // Fetch role with permissions for detail view
 * try {
 *   const role = await getRoleById(2);
 *   console.log(`Role: ${role.role_name} (${role.description})`);
 *   console.log(`Permissions: ${role.permissions.length}`);
 *   role.permissions.forEach(perm => {
 *     console.log(`- ${perm.permission_name}: ${perm.description}`);
 *   });
 * } catch (error) {
 *   if (error.response?.status === 404) {
 *     console.error("Role not found");
 *   }
 * }
 */
export async function getRoleById(id: number): Promise<RoleWithPermissions> {
  const response = await apiClient.get<ApiResponse<RoleWithPermissions>>(`/roles/${id}`);
  return response.data.data!;
}

/**
 * Update role
 *
 * Calls PUT /api/v1/roles/:id endpoint to update an existing role record.
 * Only include fields you want to update - all fields are optional. Note that
 * changing role_name does not affect existing employee assignments.
 *
 * @param {number} id - Role ID to update (must be positive integer)
 * @param {UpdateRoleInput} data - Partial role data to update (all fields optional)
 * @returns {Promise<Role>} Promise resolving to the updated role record (without permissions)
 * @throws {Error} If role not found (404), validation fails (400), role_name conflict (409), or network error
 *
 * @example
 * // Update role description
 * try {
 *   const updated = await updateRole(4, {
 *     description: "Updated description for supervisor role"
 *   });
 *   console.log("Role updated successfully");
 * } catch (error) {
 *   console.error("Failed to update role:", error.message);
 * }
 *
 * @example
 * // Deactivate a role
 * const deactivated = await updateRole(4, { is_active: false });
 */
export async function updateRole(id: number, data: UpdateRoleInput): Promise<Role> {
  const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data);
  return response.data.data!;
}

/**
 * Assign permission to role
 *
 * Calls POST /api/v1/roles/:roleId/permissions endpoint to assign a permission to a role.
 * Creates a many-to-many relationship in the role_permissions table. If the permission
 * is already assigned to this role, the operation is idempotent (no duplicate assignment).
 *
 * @param {number} roleId - Role ID to assign permission to (must be positive integer)
 * @param {AssignPermissionInput} data - Permission assignment data (requires permission_id)
 * @returns {Promise<void>} Promise resolving when permission is assigned successfully
 * @throws {Error} If role or permission not found (404), validation fails (400), or network error
 *
 * @example
 * // Assign "void_transaction" permission to cashier role
 * try {
 *   await assignPermission(2, { permission_id: 5 });
 *   console.log("Permission assigned successfully");
 *   // Refresh role data to show updated permissions
 *   const updatedRole = await getRoleById(2);
 *   console.log(`Role now has ${updatedRole.permissions.length} permissions`);
 * } catch (error) {
 *   if (error.response?.status === 404) {
 *     console.error("Role or permission not found");
 *   }
 * }
 */
export async function assignPermission(roleId: number, data: AssignPermissionInput): Promise<void> {
  await apiClient.post(`/roles/${roleId}/permissions`, data);
}

/**
 * Revoke permission from role
 *
 * Calls DELETE /api/v1/roles/:roleId/permissions/:permissionId endpoint to revoke
 * a permission from a role. Removes the many-to-many relationship from the
 * role_permissions table. If the permission is not assigned to this role, returns 404.
 *
 * @param {number} roleId - Role ID to revoke permission from (must be positive integer)
 * @param {number} permissionId - Permission ID to revoke (must be positive integer)
 * @returns {Promise<void>} Promise resolving when permission is revoked successfully
 * @throws {Error} If role, permission, or assignment not found (404), invalid ID (400), or network error
 *
 * @example
 * // Revoke "void_transaction" permission from cashier role
 * try {
 *   await revokePermission(2, 5);
 *   console.log("Permission revoked successfully");
 *   // Refresh role data to show updated permissions
 *   const updatedRole = await getRoleById(2);
 *   console.log(`Role now has ${updatedRole.permissions.length} permissions`);
 * } catch (error) {
 *   if (error.response?.status === 404) {
 *     console.error("Permission assignment not found");
 *   }
 * }
 */
export async function revokePermission(roleId: number, permissionId: number): Promise<void> {
  await apiClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
}

/**
 * Get all permissions
 *
 * Calls GET /api/v1/roles/permissions/all endpoint to retrieve all 35 available
 * permissions in the system. Use this endpoint to build permission selection UI
 * when assigning permissions to roles. Permissions are organized by resource
 * (transaction, product, customer, etc.) and action (create, read, update, delete).
 *
 * @returns {Promise<Permission[]>} Promise resolving to array of all permission records
 * @throws {Error} If network error or server error
 *
 * @example
 * // Fetch all permissions for permission management UI
 * try {
 *   const permissions = await getPermissions();
 *   console.log(`Found ${permissions.length} total permissions`);
 *
 *   // Group by resource
 *   const byResource = permissions.reduce((acc, perm) => {
 *     if (!acc[perm.resource]) acc[perm.resource] = [];
 *     acc[perm.resource].push(perm);
 *     return acc;
 *   }, {} as Record<string, Permission[]>);
 *
 *   console.log(`Resources: ${Object.keys(byResource).join(', ')}`);
 * } catch (error) {
 *   console.error("Failed to fetch permissions:", error.message);
 * }
 *
 * @example
 * // Filter permissions by resource
 * const transactionPerms = (await getPermissions())
 *   .filter(perm => perm.resource === 'transaction');
 */
export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClient.get<ApiResponse<Permission[]>>('/roles/permissions/all');
  return response.data.data!;
}
