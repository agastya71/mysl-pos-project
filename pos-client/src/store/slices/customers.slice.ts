/**
 * @fileoverview Customers Redux Slice - Manages customer data and CRUD operations
 *
 * This slice handles customer management for the Customers page and checkout:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Customer list with search and filters
 * - Pagination support for large customer lists
 * - Customer search for checkout (quick lookup)
 * - Selected customer state for viewing/editing details
 *
 * State structure:
 * - `items`: Customer list (paginated, for Customers management page)
 * - `searchResults`: Search results (for checkout customer selector)
 * - `selectedCustomer`: Currently viewed/edited customer
 * - `filters`: Search and active status filter
 * - `pagination`: Current page, limit, total count, total pages
 *
 * Usage patterns:
 * - Customers page: Use fetchCustomers + items for management
 * - Checkout: Use searchCustomers + searchResults for quick lookup
 *
 * @module store/slices/customers
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { customerApi } from '../../services/api/customer.api';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
  CustomerSearchResult,
} from '../../types/customer.types';

/**
 * Customers state interface
 *
 * Manages customer list, search results, filters, pagination, and selected customer.
 *
 * @interface CustomersState
 * @property {Customer[]} items - Customer list (paginated, for management page)
 * @property {Customer | null} selectedCustomer - Currently viewed/edited customer
 * @property {CustomerSearchResult[]} searchResults - Search results (for checkout)
 * @property {object} filters - Search and filter criteria
 * @property {string} filters.search - Name/email/phone search query
 * @property {boolean} [filters.isActive] - Active status filter (default: true)
 * @property {object} pagination - Pagination state
 * @property {number} pagination.page - Current page number (1-indexed)
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of customers
 * @property {number} pagination.totalPages - Total number of pages
 * @property {boolean} isLoading - True during async customer operations
 * @property {string | null} error - Error message from failed operations
 */
interface CustomersState {
  items: Customer[];
  selectedCustomer: Customer | null;
  searchResults: CustomerSearchResult[];
  filters: {
    search: string;
    isActive?: boolean;
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

// Initial state with default filters (active customers only)
const initialState: CustomersState = {
  items: [],
  selectedCustomer: null,
  searchResults: [],
  filters: {
    search: '',
    isActive: true, // Default to showing only active customers
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

/**
 * Async thunk: Fetch customers with filters and pagination
 *
 * Retrieves customer list from backend using current filters and pagination
 * from Redux state. Used for customer management page.
 *
 * Filters applied:
 * - search: Search by name, email, or phone (partial match)
 * - is_active: Filter by active status
 *
 * Results are paginated (default 20 per page).
 *
 * @async
 * @function fetchCustomers
 * @param {void} _ - No parameters (reads state internally)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<object>} Customer list and pagination metadata
 * @returns {Customer[]} returns.customers - Array of customers
 * @returns {object} returns.pagination - Pagination metadata
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch customers with current filters
 * dispatch(fetchCustomers());
 *
 * @see customerApi.getCustomers for backend API call
 */
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Read current filters and pagination from Redux state
      const state = getState() as { customers: CustomersState };
      const { filters, pagination } = state.customers;

      // Build API query from state
      const query: CustomerListQuery = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.isActive,
      };

      // Fetch customers from backend
      const response = await customerApi.getCustomers(query);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customers');
    }
  }
);

/**
 * Async thunk: Fetch customer details by ID
 *
 * Retrieves full customer details for viewing or editing.
 * Stores result in selectedCustomer.
 *
 * @async
 * @function fetchCustomerById
 * @param {string} id - Customer UUID
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Customer>} Customer with full details
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // View customer details
 * dispatch(fetchCustomerById('customer-uuid'));
 *
 * @see customerApi.getCustomerById for backend API call
 */
export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const customer = await customerApi.getCustomerById(id);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customer');
    }
  }
);

/**
 * Async thunk: Create new customer
 *
 * Creates a new customer record. Customer number is auto-generated
 * by backend (CUST-XXXXXX format). New customer is added to beginning
 * of items array and total count incremented.
 *
 * @async
 * @function createCustomer
 * @param {CreateCustomerInput} data - Customer data (name, email, phone, address)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Customer>} Created customer with generated customer_number
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Create customer
 * dispatch(createCustomer({
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   email: 'john.doe@example.com',
 *   phone: '555-1234'
 * }));
 *
 * @see customerApi.createCustomer for backend API call
 * @see CreateCustomerInput interface in types/customer.types.ts
 */
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (data: CreateCustomerInput, { rejectWithValue }) => {
    try {
      const customer = await customerApi.createCustomer(data);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create customer');
    }
  }
);

/**
 * Async thunk: Update existing customer
 *
 * Updates customer with partial field updates. Only provided fields are changed.
 * Updates both the customer in items array and selectedCustomer if applicable.
 *
 * @async
 * @function updateCustomer
 * @param {object} params - Update parameters
 * @param {string} params.id - Customer UUID to update
 * @param {UpdateCustomerInput} params.data - Fields to update (partial)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Customer>} Updated customer
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Update customer email
 * dispatch(updateCustomer({
 *   id: 'customer-uuid',
 *   data: { email: 'newemail@example.com' }
 * }));
 *
 * @see customerApi.updateCustomer for backend API call
 * @see UpdateCustomerInput interface in types/customer.types.ts
 */
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data }: { id: string; data: UpdateCustomerInput }, { rejectWithValue }) => {
    try {
      const customer = await customerApi.updateCustomer(id, data);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update customer');
    }
  }
);

/**
 * Async thunk: Delete customer (soft delete)
 *
 * Soft deletes customer by setting is_active=false. Customer remains in
 * database but is hidden from active customer lists. Removes customer from
 * items array, decrements total count, and clears selectedCustomer if applicable.
 *
 * @async
 * @function deleteCustomer
 * @param {string} id - Customer UUID to delete
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<string>} Deleted customer ID
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Delete customer
 * dispatch(deleteCustomer('customer-uuid'));
 *
 * @see customerApi.deleteCustomer for backend API call
 */
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerApi.deleteCustomer(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete customer');
    }
  }
);

/**
 * Async thunk: Search customers for quick lookup
 *
 * Performs real-time customer search for checkout. Results limited to 10
 * for performance. Searches across name, email, and phone fields.
 *
 * Used in checkout customer selector for quick customer lookup.
 *
 * @async
 * @function searchCustomers
 * @param {string} query - Search text (name, email, or phone)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<CustomerSearchResult[]>} Array of matching customers (max 10)
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Search for customer in checkout
 * dispatch(searchCustomers('john'));
 *
 * @see customerApi.searchCustomers for backend API call
 * @see CustomerSearchResult interface in types/customer.types.ts
 */
export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async (query: string, { rejectWithValue }) => {
    try {
      const results = await customerApi.searchCustomers(query, 10);
      return results;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search customers');
    }
  }
);

/**
 * Customers Redux Slice
 *
 * Manages customer state with 6 synchronous reducers and 6 async thunks:
 * - setFilters: Update filter criteria (resets to page 1)
 * - setPage: Change current page
 * - setSelectedCustomer: Set currently selected customer
 * - clearSelectedCustomer: Clear selected customer
 * - clearSearchResults: Clear search results
 * - clearError: Clear error message
 * - fetchCustomers: Fetch customer list (async)
 * - fetchCustomerById: Fetch customer details (async)
 * - createCustomer: Create new customer (async)
 * - updateCustomer: Update customer (async)
 * - deleteCustomer: Delete customer (async)
 * - searchCustomers: Search customers (async)
 *
 * @slice customers
 * @state CustomersState
 */
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    /**
     * Sets filter criteria
     *
     * Supports partial updates - only provided filter fields are changed.
     * Automatically resets pagination to page 1 when filters change.
     *
     * @param {CustomersState} state - Current customers state
     * @param {PayloadAction<Partial<CustomersState['filters']>>} action - Filter updates
     *
     * @example
     * // Set search query
     * dispatch(setFilters({ search: 'john' }));
     *
     * @example
     * // Show all customers (active and inactive)
     * dispatch(setFilters({ isActive: undefined }));
     */
    setFilters: (state, action: PayloadAction<Partial<CustomersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },

    /**
     * Sets current page number
     *
     * Used by pagination controls to navigate pages.
     *
     * @param {CustomersState} state - Current customers state
     * @param {PayloadAction<number>} action - Page number (1-indexed)
     *
     * @example
     * // Go to page 2
     * dispatch(setPage(2));
     * dispatch(fetchCustomers());
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },

    /**
     * Sets selected customer
     *
     * Used when clicking on a customer to view/edit details.
     *
     * @param {CustomersState} state - Current customers state
     * @param {PayloadAction<Customer | null>} action - Customer to select
     *
     * @example
     * // Select customer
     * dispatch(setSelectedCustomer(customer));
     */
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload;
    },

    /**
     * Clears selected customer
     *
     * Resets selectedCustomer to null when closing details modal.
     *
     * @param {CustomersState} state - Current customers state
     *
     * @example
     * // Close customer details modal
     * dispatch(clearSelectedCustomer());
     */
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },

    /**
     * Clears search results
     *
     * Resets searchResults to empty array. Used when closing checkout
     * customer selector.
     *
     * @param {CustomersState} state - Current customers state
     *
     * @example
     * // Clear search when closing selector
     * dispatch(clearSearchResults());
     */
    clearSearchResults: (state) => {
      state.searchResults = [];
    },

    /**
     * Clears error message
     *
     * Resets error state after displaying error to user or before retrying.
     *
     * @param {CustomersState} state - Current customers state
     *
     * @example
     * // Clear error before retry
     * dispatch(clearError());
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // FetchCustomers: pending - set loading state
    builder.addCase(fetchCustomers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // FetchCustomers: fulfilled - store customer list and pagination
    builder.addCase(fetchCustomers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.customers;
      state.pagination = action.payload.pagination;
    });
    // FetchCustomers: rejected - set error state
    builder.addCase(fetchCustomers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // FetchCustomerById: pending - set loading state
    builder.addCase(fetchCustomerById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // FetchCustomerById: fulfilled - store selected customer
    builder.addCase(fetchCustomerById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedCustomer = action.payload;
    });
    // FetchCustomerById: rejected - set error state
    builder.addCase(fetchCustomerById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // CreateCustomer: pending - set loading state
    builder.addCase(createCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // CreateCustomer: fulfilled - add to beginning of list, increment total
    builder.addCase(createCustomer.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items.unshift(action.payload); // Add to beginning of list
      state.pagination.total += 1;
    });
    // CreateCustomer: rejected - set error state
    builder.addCase(createCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // UpdateCustomer: pending - set loading state
    builder.addCase(updateCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // UpdateCustomer: fulfilled - update in list and selectedCustomer
    builder.addCase(updateCustomer.fulfilled, (state, action) => {
      state.isLoading = false;

      // Update customer in list
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }

      // Update selected customer if it's the one being updated
      if (state.selectedCustomer?.id === action.payload.id) {
        state.selectedCustomer = action.payload;
      }
    });
    // UpdateCustomer: rejected - set error state
    builder.addCase(updateCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // DeleteCustomer: pending - set loading state
    builder.addCase(deleteCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // DeleteCustomer: fulfilled - remove from list, decrement total, clear selected
    builder.addCase(deleteCustomer.fulfilled, (state, action) => {
      state.isLoading = false;

      // Remove customer from list
      state.items = state.items.filter((c) => c.id !== action.payload);

      // Decrement total count
      state.pagination.total -= 1;

      // Clear selected customer if it's the one being deleted
      if (state.selectedCustomer?.id === action.payload) {
        state.selectedCustomer = null;
      }
    });
    // DeleteCustomer: rejected - set error state
    builder.addCase(deleteCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // SearchCustomers: pending - set loading state
    builder.addCase(searchCustomers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // SearchCustomers: fulfilled - store search results
    builder.addCase(searchCustomers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.searchResults = action.payload;
    });
    // SearchCustomers: rejected - set error state
    builder.addCase(searchCustomers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const {
  setFilters,
  setPage,
  setSelectedCustomer,
  clearSelectedCustomer,
  clearSearchResults,
  clearError,
} = customersSlice.actions;

export default customersSlice.reducer;
