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
export const fetchRoles = createAsyncThunk('roles/fetchRoles', async () => {
  return await roleApi.getRoles();
});

export const fetchRoleById = createAsyncThunk('roles/fetchRoleById', async (id: number) => {
  return await roleApi.getRoleById(id);
});

export const createRole = createAsyncThunk('roles/createRole', async (data: CreateRoleInput) => {
  return await roleApi.createRole(data);
});

export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, data }: { id: number; data: UpdateRoleInput }) => {
    return await roleApi.updateRole(id, data);
  }
);

export const fetchPermissions = createAsyncThunk('roles/fetchPermissions', async () => {
  return await roleApi.getPermissions();
});

export const assignPermissionToRole = createAsyncThunk(
  'roles/assignPermission',
  async ({ roleId, data }: { roleId: number; data: AssignPermissionInput }, { dispatch }) => {
    await roleApi.assignPermission(roleId, data);
    // Refetch role to get updated permissions
    await dispatch(fetchRoleById(roleId));
  }
);

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
    clearSelectedRole(state) {
      state.selectedRole = null;
    },
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
