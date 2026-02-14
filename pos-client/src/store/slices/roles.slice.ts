/**
 * @fileoverview Roles Redux Slice - Manages roles and permissions
 *
 * This slice handles role and permission management:
 * - Role CRUD operations
 * - Permission assignment/revocation
 * - Fetch all roles and permissions
 * - Selected role state with permissions for editing
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as roleApi from '../../services/api/role.api';
import {
  Role,
  CreateRoleInput,
  UpdateRoleInput,
  RoleWithPermissions,
  Permission,
  AssignPermissionInput,
} from '../../types/employee.types';

/**
 * Roles state interface
 *
 * Manages the complete state for roles and permissions data including role list,
 * all available permissions, and selected role with its assigned permissions.
 * Used by the RolesPage component for role and permission management.
 *
 * @interface RolesState
 * @property {Role[]} roles - Array of all roles in the system
 * @property {Permission[]} permissions - Array of all available permissions
 * @property {RoleWithPermissions | null} selectedRole - Currently selected role with its permissions for editing
 * @property {boolean} isLoading - Loading state for async operations
 * @property {string | null} error - Error message if operation fails
 */
interface RolesState {
  roles: Role[];
  permissions: Permission[];
  selectedRole: RoleWithPermissions | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesState = {
  roles: [],
  permissions: [],
  selectedRole: null,
  isLoading: false,
  error: null,
};

// Async thunks

/**
 * Fetch all roles
 *
 * Dispatches API call to GET /api/v1/roles. Updates state.roles with result.
 * Used by RolesPage and EmployeesPage for role dropdowns and management.
 *
 * @async
 * @function
 * @returns {Promise<ApiResponse<Role[]>>} Array of all roles
 * @throws {Error} If API call fails or network error
 *
 * @example
 * dispatch(fetchRoles());
 */
export const fetchRoles = createAsyncThunk('roles/fetchRoles', async () => {
  return await roleApi.getRoles();
});

/**
 * Fetch single role with permissions
 *
 * Dispatches API call to GET /api/v1/roles/:id. Sets state.selectedRole with result
 * including the role's assigned permissions array. Used for permission management modal.
 *
 * @async
 * @function
 * @param {number} id - Role ID to fetch
 * @returns {Promise<ApiResponse<RoleWithPermissions>>} Role with permissions array
 * @throws {Error} If role not found or network error
 *
 * @example
 * dispatch(fetchRoleById(2)); // Fetch "manager" role with its permissions
 */
export const fetchRoleById = createAsyncThunk('roles/fetchRoleById', async (id: number) => {
  return await roleApi.getRoleById(id);
});

/**
 * Create new role
 *
 * Dispatches API call to POST /api/v1/roles. On success, adds new role to state.roles array.
 * New roles start with no permissions assigned.
 *
 * @async
 * @function
 * @param {CreateRoleInput} data - Role creation data (role_name, description)
 * @returns {Promise<ApiResponse<Role>>} Created role
 * @throws {Error} If validation fails, role name exists, or network error
 *
 * @example
 * const data: CreateRoleInput = {
 *   role_name: "supervisor",
 *   description: "Supervises daily operations"
 * };
 * dispatch(createRole(data));
 */
export const createRole = createAsyncThunk('roles/createRole', async (data: CreateRoleInput) => {
  return await roleApi.createRole(data);
});

/**
 * Update existing role
 *
 * Dispatches API call to PUT /api/v1/roles/:id. On success, updates role in state.roles
 * array and in state.selectedRole if IDs match. Used for updating role name/description.
 *
 * @async
 * @function
 * @param {Object} params - Update parameters
 * @param {number} params.id - Role ID to update
 * @param {UpdateRoleInput} params.data - Updated role fields (role_name, description)
 * @returns {Promise<ApiResponse<Role>>} Updated role
 * @throws {Error} If role not found, validation fails, or network error
 *
 * @example
 * dispatch(updateRole({
 *   id: 2,
 *   data: { description: "Updated description" }
 * }));
 */
export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, data }: { id: number; data: UpdateRoleInput }) => {
    return await roleApi.updateRole(id, data);
  }
);

/**
 * Fetch all permissions
 *
 * Dispatches API call to GET /api/v1/permissions. Updates state.permissions with result.
 * Used by RolesPage permission modal to show all available permissions.
 *
 * @async
 * @function
 * @returns {Promise<ApiResponse<Permission[]>>} Array of all permissions
 * @throws {Error} If API call fails or network error
 *
 * @example
 * dispatch(fetchPermissions());
 */
export const fetchPermissions = createAsyncThunk('roles/fetchPermissions', async () => {
  return await roleApi.getPermissions();
});

/**
 * Assign permission to role
 *
 * Dispatches API call to POST /api/v1/roles/:roleId/permissions. Creates role_permissions
 * record. On success, refetches role to update state.selectedRole with new permissions array.
 *
 * @async
 * @function
 * @param {Object} params - Assignment parameters
 * @param {number} params.roleId - Role ID to assign permission to
 * @param {AssignPermissionInput} params.data - Permission data containing permission_id
 * @returns {Promise<void>} Resolves when permission assigned and role refetched
 * @throws {Error} If permission already assigned, validation fails, or network error
 *
 * @example
 * dispatch(assignPermissionToRole({
 *   roleId: 2,
 *   data: { permission_id: 5 }
 * }));
 */
export const assignPermissionToRole = createAsyncThunk(
  'roles/assignPermission',
  async ({ roleId, data }: { roleId: number; data: AssignPermissionInput }, { dispatch }) => {
    await roleApi.assignPermission(roleId, data);
    // Refetch role to get updated permissions
    await dispatch(fetchRoleById(roleId));
  }
);

/**
 * Revoke permission from role
 *
 * Dispatches API call to DELETE /api/v1/roles/:roleId/permissions/:permissionId. Deletes
 * role_permissions record. On success, refetches role to update state.selectedRole with
 * updated permissions array (permission removed).
 *
 * @async
 * @function
 * @param {Object} params - Revocation parameters
 * @param {number} params.roleId - Role ID to revoke permission from
 * @param {number} params.permissionId - Permission ID to revoke
 * @returns {Promise<void>} Resolves when permission revoked and role refetched
 * @throws {Error} If permission not assigned, validation fails, or network error
 *
 * @example
 * dispatch(revokePermissionFromRole({
 *   roleId: 2,
 *   permissionId: 5
 * }));
 */
export const revokePermissionFromRole = createAsyncThunk(
  'roles/revokePermission',
  async ({ roleId, permissionId }: { roleId: number; permissionId: number }, { dispatch }) => {
    await roleApi.revokePermission(roleId, permissionId);
    // Refetch role to get updated permissions
    await dispatch(fetchRoleById(roleId));
  }
);

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    /**
     * Clear selected role
     *
     * Sets state.selectedRole to null. Used when closing permission modal.
     *
     * @example
     * dispatch(clearSelectedRole());
     */
    clearSelectedRole(state) {
      state.selectedRole = null;
    },

    /**
     * Clear error message
     *
     * Sets state.error to null. Used to dismiss error alerts.
     *
     * @example
     * dispatch(clearError());
     */
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch roles
    builder.addCase(fetchRoles.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchRoles.fulfilled, (state, action) => {
      state.isLoading = false;
      state.roles = action.payload;
    });
    builder.addCase(fetchRoles.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch roles';
    });

    // Fetch role by ID
    builder.addCase(fetchRoleById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchRoleById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedRole = action.payload;
    });
    builder.addCase(fetchRoleById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch role';
    });

    // Create role
    builder.addCase(createRole.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createRole.fulfilled, (state, action) => {
      state.isLoading = false;
      state.roles.push(action.payload);
    });
    builder.addCase(createRole.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to create role';
    });

    // Update role
    builder.addCase(updateRole.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateRole.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.roles.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.roles[index] = action.payload;
      }
      if (state.selectedRole?.id === action.payload.id) {
        state.selectedRole = { ...state.selectedRole, ...action.payload };
      }
    });
    builder.addCase(updateRole.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to update role';
    });

    // Fetch permissions
    builder.addCase(fetchPermissions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchPermissions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.permissions = action.payload;
    });
    builder.addCase(fetchPermissions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch permissions';
    });

    // Assign permission
    builder.addCase(assignPermissionToRole.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(assignPermissionToRole.fulfilled, (state) => {
      state.isLoading = false;
    });
    builder.addCase(assignPermissionToRole.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to assign permission';
    });

    // Revoke permission
    builder.addCase(revokePermissionFromRole.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(revokePermissionFromRole.fulfilled, (state) => {
      state.isLoading = false;
    });
    builder.addCase(revokePermissionFromRole.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to revoke permission';
    });
  },
});

export const { clearSelectedRole, clearError } = rolesSlice.actions;

export default rolesSlice.reducer;
