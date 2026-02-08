import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { customerApi } from '../../services/api/customer.api';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
  CustomerSearchResult,
} from '../../types/customer.types';

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

const initialState: CustomersState = {
  items: [],
  selectedCustomer: null,
  searchResults: [],
  filters: {
    search: '',
    isActive: true,
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
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { customers: CustomersState };
      const { filters, pagination } = state.customers;

      const query: CustomerListQuery = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.isActive,
      };

      const response = await customerApi.getCustomers(query);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customers');
    }
  }
);

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

// Slice
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CustomersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload;
    },
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch customers
    builder.addCase(fetchCustomers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCustomers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.customers;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchCustomers.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch customer by ID
    builder.addCase(fetchCustomerById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCustomerById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedCustomer = action.payload;
    });
    builder.addCase(fetchCustomerById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create customer
    builder.addCase(createCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createCustomer.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items.unshift(action.payload); // Add to beginning of list
      state.pagination.total += 1;
    });
    builder.addCase(createCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update customer
    builder.addCase(updateCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateCustomer.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.items.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.selectedCustomer?.id === action.payload.id) {
        state.selectedCustomer = action.payload;
      }
    });
    builder.addCase(updateCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete customer
    builder.addCase(deleteCustomer.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteCustomer.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = state.items.filter((c) => c.id !== action.payload);
      state.pagination.total -= 1;
      if (state.selectedCustomer?.id === action.payload) {
        state.selectedCustomer = null;
      }
    });
    builder.addCase(deleteCustomer.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Search customers
    builder.addCase(searchCustomers.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(searchCustomers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.searchResults = action.payload;
    });
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
