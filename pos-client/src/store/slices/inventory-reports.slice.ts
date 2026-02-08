/**
 * Inventory Reports Redux Slice
 *
 * State management for inventory reports (Phase 3C)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  LowStockProduct,
  OutOfStockProduct,
  InventoryValuation,
  MovementReportItem,
  CategorySummary,
  MovementReportFilters,
} from '../../types/inventory-reports.types';
import * as inventoryReportsApi from '../../services/api/inventory-reports.api';

interface InventoryReportsState {
  lowStock: {
    data: LowStockProduct[];
    isLoading: boolean;
    error: string | null;
  };
  outOfStock: {
    data: OutOfStockProduct[];
    isLoading: boolean;
    error: string | null;
  };
  valuation: {
    data: InventoryValuation | null;
    isLoading: boolean;
    error: string | null;
  };
  movement: {
    data: MovementReportItem[];
    filters: MovementReportFilters;
    isLoading: boolean;
    error: string | null;
  };
  categorySummary: {
    data: CategorySummary[];
    isLoading: boolean;
    error: string | null;
  };
}

const initialState: InventoryReportsState = {
  lowStock: {
    data: [],
    isLoading: false,
    error: null,
  },
  outOfStock: {
    data: [],
    isLoading: false,
    error: null,
  },
  valuation: {
    data: null,
    isLoading: false,
    error: null,
  },
  movement: {
    data: [],
    filters: {
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    },
    isLoading: false,
    error: null,
  },
  categorySummary: {
    data: [],
    isLoading: false,
    error: null,
  },
};

// Async Thunks

export const fetchLowStockReport = createAsyncThunk(
  'inventoryReports/fetchLowStock',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryReportsApi.getLowStockReport();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch low stock report');
    }
  }
);

export const fetchOutOfStockReport = createAsyncThunk(
  'inventoryReports/fetchOutOfStock',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryReportsApi.getOutOfStockReport();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch out of stock report');
    }
  }
);

export const fetchValuationReport = createAsyncThunk(
  'inventoryReports/fetchValuation',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryReportsApi.getValuationReport();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch valuation report');
    }
  }
);

export const fetchMovementReport = createAsyncThunk(
  'inventoryReports/fetchMovement',
  async (filters: MovementReportFilters, { rejectWithValue }) => {
    try {
      return await inventoryReportsApi.getMovementReport(filters);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch movement report');
    }
  }
);

export const fetchCategorySummary = createAsyncThunk(
  'inventoryReports/fetchCategorySummary',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryReportsApi.getCategorySummary();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch category summary');
    }
  }
);

// Slice

const inventoryReportsSlice = createSlice({
  name: 'inventoryReports',
  initialState,
  reducers: {
    setMovementFilters: (state, action: PayloadAction<MovementReportFilters>) => {
      state.movement.filters = action.payload;
    },
    clearErrors: (state) => {
      state.lowStock.error = null;
      state.outOfStock.error = null;
      state.valuation.error = null;
      state.movement.error = null;
      state.categorySummary.error = null;
    },
  },
  extraReducers: (builder) => {
    // Low Stock Report
    builder
      .addCase(fetchLowStockReport.pending, (state) => {
        state.lowStock.isLoading = true;
        state.lowStock.error = null;
      })
      .addCase(fetchLowStockReport.fulfilled, (state, action) => {
        state.lowStock.isLoading = false;
        state.lowStock.data = action.payload;
      })
      .addCase(fetchLowStockReport.rejected, (state, action) => {
        state.lowStock.isLoading = false;
        state.lowStock.error = action.payload as string;
      });

    // Out of Stock Report
    builder
      .addCase(fetchOutOfStockReport.pending, (state) => {
        state.outOfStock.isLoading = true;
        state.outOfStock.error = null;
      })
      .addCase(fetchOutOfStockReport.fulfilled, (state, action) => {
        state.outOfStock.isLoading = false;
        state.outOfStock.data = action.payload;
      })
      .addCase(fetchOutOfStockReport.rejected, (state, action) => {
        state.outOfStock.isLoading = false;
        state.outOfStock.error = action.payload as string;
      });

    // Valuation Report
    builder
      .addCase(fetchValuationReport.pending, (state) => {
        state.valuation.isLoading = true;
        state.valuation.error = null;
      })
      .addCase(fetchValuationReport.fulfilled, (state, action) => {
        state.valuation.isLoading = false;
        state.valuation.data = action.payload;
      })
      .addCase(fetchValuationReport.rejected, (state, action) => {
        state.valuation.isLoading = false;
        state.valuation.error = action.payload as string;
      });

    // Movement Report
    builder
      .addCase(fetchMovementReport.pending, (state) => {
        state.movement.isLoading = true;
        state.movement.error = null;
      })
      .addCase(fetchMovementReport.fulfilled, (state, action) => {
        state.movement.isLoading = false;
        state.movement.data = action.payload;
      })
      .addCase(fetchMovementReport.rejected, (state, action) => {
        state.movement.isLoading = false;
        state.movement.error = action.payload as string;
      });

    // Category Summary
    builder
      .addCase(fetchCategorySummary.pending, (state) => {
        state.categorySummary.isLoading = true;
        state.categorySummary.error = null;
      })
      .addCase(fetchCategorySummary.fulfilled, (state, action) => {
        state.categorySummary.isLoading = false;
        state.categorySummary.data = action.payload;
      })
      .addCase(fetchCategorySummary.rejected, (state, action) => {
        state.categorySummary.isLoading = false;
        state.categorySummary.error = action.payload as string;
      });
  },
});

export const { setMovementFilters, clearErrors } = inventoryReportsSlice.actions;
export default inventoryReportsSlice.reducer;
