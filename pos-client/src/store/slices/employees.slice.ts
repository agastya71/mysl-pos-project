/**
 * @fileoverview Employees Redux Slice - Manages employee data and CRUD operations
 *
 * This slice handles employee management for the Employees page:
 * - Full CRUD operations (Create, Read, Update, Deactivate)
 * - Employee list with search and filters (role, active status, search text)
 * - Pagination support for large employee lists
 * - Selected employee state for viewing/editing details
 *
 * State structure:
 * - `items`: Employee list (paginated, for Employees management page)
 * - `selectedEmployee`: Currently viewed/edited employee
 * - `filters`: Search, role_id, and active status filter
 * - `pagination`: Current page, limit, total count, total pages
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as employeeApi from '../../services/api/employee.api';
import {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeListQuery,
} from '../../types/employee.types';

interface EmployeesState {
  items: Employee[];
  selectedEmployee: Employee | null;
  filters: {
    search: string;
    role_id?: number;
    is_active?: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployeesState = {
  items: [],
  selectedEmployee: null,
  filters: {
    search: '',
    role_id: undefined,
    is_active: true, // Default to showing only active employees
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { getState }) => {
    const state = getState() as { employees: EmployeesState };
    const { filters, pagination } = state.employees;

    const query: EmployeeListQuery = {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search || undefined,
      role_id: filters.role_id,
      is_active: filters.is_active,
    };

    return await employeeApi.getEmployees(query);
  }
);

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id: number) => {
    return await employeeApi.getEmployeeById(id);
  }
);

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (data: CreateEmployeeInput) => {
    return await employeeApi.createEmployee(data);
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: number; data: UpdateEmployeeInput }) => {
    return await employeeApi.updateEmployee(id, data);
  }
);

export const deactivateEmployee = createAsyncThunk(
  'employees/deactivateEmployee',
  async (id: number) => {
    return await employeeApi.deactivateEmployee(id);
  }
);

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      state.pagination.page = 1; // Reset to first page on search
    },
    setRoleFilter(state, action: PayloadAction<number | undefined>) {
      state.filters.role_id = action.payload;
      state.pagination.page = 1;
    },
    setActiveFilter(state, action: PayloadAction<boolean | undefined>) {
      state.filters.is_active = action.payload;
      state.pagination.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    setLimit(state, action: PayloadAction<number>) {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    clearSelectedEmployee(state) {
      state.selectedEmployee = null;
    },
    clearFilters(state) {
      state.filters = {
        search: '',
        role_id: undefined,
        is_active: true,
      };
      state.pagination.page = 1;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch employees
    builder.addCase(fetchEmployees.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEmployees.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.employees;
      state.pagination.total = action.payload.total;
      state.pagination.totalPages = action.payload.totalPages;
    });
    builder.addCase(fetchEmployees.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch employees';
    });

    // Fetch employee by ID
    builder.addCase(fetchEmployeeById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchEmployeeById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedEmployee = action.payload;
    });
    builder.addCase(fetchEmployeeById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch employee';
    });

    // Create employee
    builder.addCase(createEmployee.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createEmployee.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items.unshift(action.payload); // Add to beginning of list
      state.pagination.total += 1;
    });
    builder.addCase(createEmployee.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to create employee';
    });

    // Update employee
    builder.addCase(updateEmployee.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateEmployee.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.items.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedEmployee?.id === action.payload.id) {
        state.selectedEmployee = action.payload;
      }
    });
    builder.addCase(updateEmployee.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to update employee';
    });

    // Deactivate employee
    builder.addCase(deactivateEmployee.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deactivateEmployee.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.items.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedEmployee?.id === action.payload.id) {
        state.selectedEmployee = action.payload;
      }
    });
    builder.addCase(deactivateEmployee.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to deactivate employee';
    });
  },
});

export const {
  setSearch,
  setRoleFilter,
  setActiveFilter,
  setPage,
  setLimit,
  clearSelectedEmployee,
  clearFilters,
  clearError,
} = employeesSlice.actions;

export default employeesSlice.reducer;
