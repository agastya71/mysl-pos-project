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

/**
 * Employees state interface
 *
 * Manages the complete state for employee data including list, filters, and pagination.
 * Used by the EmployeesPage component for displaying and managing employees.
 *
 * @interface EmployeesState
 * @property {Employee[]} items - Array of employee objects (paginated list)
 * @property {Employee | null} selectedEmployee - Currently selected employee for viewing/editing
 * @property {Object} filters - Active filters for employee list
 * @property {string} filters.search - Search term for name/email/employee number
 * @property {number} [filters.role_id] - Optional role filter
 * @property {boolean} [filters.is_active] - Optional active status filter (true=active, false=inactive, undefined=all)
 * @property {Object} pagination - Pagination state for list
 * @property {number} pagination.page - Current page number (1-indexed)
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total count of employees matching filters
 * @property {number} pagination.totalPages - Total number of pages
 * @property {boolean} isLoading - Loading state for async operations
 * @property {string | null} error - Error message if operation fails
 */
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

/**
 * Fetch employees with current filters and pagination
 *
 * Dispatches API call to GET /api/v1/employees using current state filters
 * (search, role_id, is_active) and pagination (page, limit). Updates state.items
 * with result and handles loading/error states.
 *
 * @async
 * @function
 * @returns {Promise<ApiResponse<EmployeeListResponse>>} Employee list with pagination metadata
 * @throws {Error} If API call fails or network error
 *
 * @example
 * // Fetch employees with current state filters
 * dispatch(fetchEmployees());
 *
 * @example
 * // After changing filters, fetch updates automatically
 * dispatch(setSearch("john"));
 * dispatch(fetchEmployees()); // Fetches with search="john"
 */
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

/**
 * Fetch single employee by ID
 *
 * Dispatches API call to GET /api/v1/employees/:id. Sets state.selectedEmployee
 * with result for viewing/editing in EmployeeFormPage.
 *
 * @async
 * @function
 * @param {number} id - Employee ID to fetch
 * @returns {Promise<ApiResponse<Employee>>} Employee details
 * @throws {Error} If employee not found or network error
 *
 * @example
 * dispatch(fetchEmployeeById(42));
 */
export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id: number) => {
    return await employeeApi.getEmployeeById(id);
  }
);

/**
 * Create new employee
 *
 * Dispatches API call to POST /api/v1/employees. On success, adds new employee
 * to beginning of state.items list and increments pagination total.
 *
 * @async
 * @function
 * @param {CreateEmployeeInput} data - Employee creation data (first_name, last_name, email, etc.)
 * @returns {Promise<ApiResponse<Employee>>} Created employee with auto-generated employee_number
 * @throws {Error} If validation fails, email exists, or network error
 *
 * @example
 * const data: CreateEmployeeInput = {
 *   first_name: "John",
 *   last_name: "Doe",
 *   email: "john@example.com",
 *   hire_date: "2026-02-14",
 *   role_id: 2
 * };
 * dispatch(createEmployee(data));
 */
export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (data: CreateEmployeeInput) => {
    return await employeeApi.createEmployee(data);
  }
);

/**
 * Update existing employee
 *
 * Dispatches API call to PUT /api/v1/employees/:id. On success, updates employee
 * in state.items array and state.selectedEmployee if IDs match.
 *
 * @async
 * @function
 * @param {Object} params - Update parameters
 * @param {number} params.id - Employee ID to update
 * @param {UpdateEmployeeInput} params.data - Updated employee fields (partial update)
 * @returns {Promise<ApiResponse<Employee>>} Updated employee
 * @throws {Error} If employee not found, validation fails, or network error
 *
 * @example
 * dispatch(updateEmployee({
 *   id: 42,
 *   data: { email: "newemail@example.com", role_id: 3 }
 * }));
 */
export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: number; data: UpdateEmployeeInput }) => {
    return await employeeApi.updateEmployee(id, data);
  }
);

/**
 * Deactivate employee (soft delete)
 *
 * Dispatches API call to PUT /api/v1/employees/:id/deactivate. Sets is_active=false.
 * On success, updates employee in state.items array and state.selectedEmployee.
 *
 * @async
 * @function
 * @param {number} id - Employee ID to deactivate
 * @returns {Promise<ApiResponse<Employee>>} Deactivated employee with is_active=false
 * @throws {Error} If employee not found or network error
 *
 * @example
 * dispatch(deactivateEmployee(42));
 */
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
    /**
     * Set search filter
     *
     * Updates state.filters.search with search term and resets pagination to page 1.
     * Triggers re-fetch of employee list.
     *
     * @param {PayloadAction<string>} action - Search term for name/email/employee_number
     *
     * @example
     * // Before: state.filters.search = "", state.pagination.page = 3
     * dispatch(setSearch("john"));
     * // After: state.filters.search = "john", state.pagination.page = 1
     */
    setSearch(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      state.pagination.page = 1; // Reset to first page on search
    },

    /**
     * Set role filter
     *
     * Updates state.filters.role_id with role ID and resets pagination to page 1.
     *
     * @param {PayloadAction<number | undefined>} action - Role ID to filter by, or undefined for all roles
     *
     * @example
     * dispatch(setRoleFilter(2)); // Filter to role ID 2
     * dispatch(setRoleFilter(undefined)); // Show all roles
     */
    setRoleFilter(state, action: PayloadAction<number | undefined>) {
      state.filters.role_id = action.payload;
      state.pagination.page = 1;
    },

    /**
     * Set active status filter
     *
     * Updates state.filters.is_active with active status and resets pagination to page 1.
     *
     * @param {PayloadAction<boolean | undefined>} action - true=active only, false=inactive only, undefined=all
     *
     * @example
     * dispatch(setActiveFilter(true)); // Show active only
     * dispatch(setActiveFilter(false)); // Show inactive only
     * dispatch(setActiveFilter(undefined)); // Show all
     */
    setActiveFilter(state, action: PayloadAction<boolean | undefined>) {
      state.filters.is_active = action.payload;
      state.pagination.page = 1;
    },

    /**
     * Set current page
     *
     * Updates state.pagination.page for pagination navigation.
     *
     * @param {PayloadAction<number>} action - Page number (1-indexed)
     *
     * @example
     * dispatch(setPage(3)); // Navigate to page 3
     */
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },

    /**
     * Set items per page limit
     *
     * Updates state.pagination.limit and resets to page 1.
     *
     * @param {PayloadAction<number>} action - Items per page (e.g., 10, 20, 50)
     *
     * @example
     * dispatch(setLimit(50)); // Show 50 items per page
     */
    setLimit(state, action: PayloadAction<number>) {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },

    /**
     * Clear selected employee
     *
     * Sets state.selectedEmployee to null. Used when exiting edit mode.
     *
     * @example
     * dispatch(clearSelectedEmployee());
     */
    clearSelectedEmployee(state) {
      state.selectedEmployee = null;
    },

    /**
     * Clear all filters
     *
     * Resets state.filters to default values (search="", role_id=undefined, is_active=true)
     * and resets pagination to page 1.
     *
     * @example
     * // Before: state.filters = { search: "john", role_id: 2, is_active: false }
     * dispatch(clearFilters());
     * // After: state.filters = { search: "", role_id: undefined, is_active: true }
     */
    clearFilters(state) {
      state.filters = {
        search: '',
        role_id: undefined,
        is_active: true,
      };
      state.pagination.page = 1;
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
