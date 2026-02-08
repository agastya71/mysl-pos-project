/**
 * Inventory Slice
 *
 * Redux state management for inventory adjustments
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inventoryApi } from '../../services/api/inventory.api';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  InventoryPagination,
} from '../../types/inventory.types';

interface InventoryState {
  adjustments: InventoryAdjustment[];
  selectedAdjustment: InventoryAdjustment | null;
  productHistory: InventoryAdjustment[];
  pagination: InventoryPagination;
  filters: GetAdjustmentsQuery;
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  adjustments: [],
  selectedAdjustment: null,
  productHistory: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  loading: false,
  error: null,
};

// Async thunks
export const createAdjustment = createAsyncThunk(
  'inventory/createAdjustment',
  async (data: CreateAdjustmentRequest) => {
    return await inventoryApi.createAdjustment(data);
  }
);

export const fetchAdjustments = createAsyncThunk(
  'inventory/fetchAdjustments',
  async (_, { getState }) => {
    const state = getState() as { inventory: InventoryState };
    const query: GetAdjustmentsQuery = {
      ...state.inventory.filters,
      page: state.inventory.pagination.page,
      limit: state.inventory.pagination.limit,
    };
    return await inventoryApi.getAdjustments(query);
  }
);

export const fetchAdjustmentById = createAsyncThunk(
  'inventory/fetchAdjustmentById',
  async (id: string) => {
    return await inventoryApi.getAdjustmentById(id);
  }
);

export const fetchProductHistory = createAsyncThunk(
  'inventory/fetchProductHistory',
  async (productId: string) => {
    return await inventoryApi.getProductHistory(productId);
  }
);

// Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<GetAdjustmentsQuery>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page on filter change
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearSelectedAdjustment: (state) => {
      state.selectedAdjustment = null;
    },
    clearProductHistory: (state) => {
      state.productHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create adjustment
    builder
      .addCase(createAdjustment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAdjustment.fulfilled, (state, action) => {
        state.loading = false;
        // Add to beginning of list
        state.adjustments.unshift(action.payload);
      })
      .addCase(createAdjustment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create adjustment';
      });

    // Fetch adjustments
    builder
      .addCase(fetchAdjustments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdjustments.fulfilled, (state, action) => {
        state.loading = false;
        state.adjustments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAdjustments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch adjustments';
      });

    // Fetch adjustment by ID
    builder
      .addCase(fetchAdjustmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdjustmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdjustment = action.payload;
      })
      .addCase(fetchAdjustmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch adjustment';
      });

    // Fetch product history
    builder
      .addCase(fetchProductHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.productHistory = action.payload;
      })
      .addCase(fetchProductHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch product history';
      });
  },
});

export const {
  setFilters,
  setPage,
  clearSelectedAdjustment,
  clearProductHistory,
  clearError,
} = inventorySlice.actions;

export default inventorySlice.reducer;
