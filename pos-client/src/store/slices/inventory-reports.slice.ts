/**
 * @fileoverview Inventory Reports Redux Slice - Manages 5 inventory report types
 *
 * This slice handles state management for all inventory reports (Phase 3C):
 * - Low Stock Report: Products at or below reorder level
 * - Out of Stock Report: Products with zero quantity
 * - Inventory Valuation Report: Total inventory value and category breakdown
 * - Movement Report: Stock changes over date range (sales + adjustments)
 * - Category Summary Report: Inventory health by category
 *
 * Each report has its own state section with data, isLoading, and error.
 * The Movement Report also includes date range filters (defaults to last 7 days).
 *
 * Reports provide visibility into:
 * - Reorder needs (low stock / out of stock)
 * - Inventory value and investment
 * - Inventory changes over time
 * - Category-level health metrics
 *
 * @module store/slices/inventory-reports
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3C)
 * @updated 2026-02-08 (Documentation)
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

/**
 * Inventory reports state interface
 *
 * Manages state for 5 inventory reports, each with independent loading and error states.
 *
 * @interface InventoryReportsState
 * @property {object} lowStock - Low stock report state
 * @property {LowStockProduct[]} lowStock.data - Products at or below reorder level
 * @property {boolean} lowStock.isLoading - Loading state for low stock report
 * @property {string | null} lowStock.error - Error message if fetch failed
 * @property {object} outOfStock - Out of stock report state
 * @property {OutOfStockProduct[]} outOfStock.data - Products with zero quantity
 * @property {boolean} outOfStock.isLoading - Loading state for out of stock report
 * @property {string | null} outOfStock.error - Error message if fetch failed
 * @property {object} valuation - Inventory valuation report state
 * @property {InventoryValuation | null} valuation.data - Total value and category breakdown
 * @property {boolean} valuation.isLoading - Loading state for valuation report
 * @property {string | null} valuation.error - Error message if fetch failed
 * @property {object} movement - Movement report state
 * @property {MovementReportItem[]} movement.data - Stock changes over date range
 * @property {MovementReportFilters} movement.filters - Date range filters (start_date, end_date)
 * @property {boolean} movement.isLoading - Loading state for movement report
 * @property {string | null} movement.error - Error message if fetch failed
 * @property {object} categorySummary - Category summary report state
 * @property {CategorySummary[]} categorySummary.data - Inventory health by category
 * @property {boolean} categorySummary.isLoading - Loading state for category summary
 * @property {string | null} categorySummary.error - Error message if fetch failed
 */
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

// Initial state with default movement report filters (last 7 days)
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
    // Default to last 7 days
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

/**
 * Async thunk: Fetch low stock report
 *
 * Retrieves products where quantity_in_stock <= reorder_level.
 * Results sorted by quantity ascending (lowest stock first), then by name.
 * Includes product details, stock levels, and calculated stock value.
 *
 * Used to identify products that need reordering.
 *
 * @async
 * @function fetchLowStockReport
 * @returns {Promise<LowStockProduct[]>} Array of low stock products
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch low stock report
 * dispatch(fetchLowStockReport());
 * // Results stored in state.inventoryReports.lowStock.data
 *
 * @see inventoryReportsApi.getLowStockReport for backend API call
 * @see LowStockProduct interface in types/inventory-reports.types.ts
 */
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

/**
 * Async thunk: Fetch out of stock report
 *
 * Retrieves products where quantity_in_stock = 0.
 * Results sorted by days since last sale descending (longest out of stock first).
 * Includes product details and days since last transaction.
 *
 * Used to identify urgent reorder needs and potential stockouts.
 *
 * @async
 * @function fetchOutOfStockReport
 * @returns {Promise<OutOfStockProduct[]>} Array of out of stock products
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch out of stock report
 * dispatch(fetchOutOfStockReport());
 * // Results stored in state.inventoryReports.outOfStock.data
 *
 * @see inventoryReportsApi.getOutOfStockReport for backend API call
 * @see OutOfStockProduct interface in types/inventory-reports.types.ts
 */
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

/**
 * Async thunk: Fetch inventory valuation report
 *
 * Calculates total inventory value and category-level breakdowns.
 *
 * Report includes:
 * - total_value: Sum of (base_price × quantity) across all active products
 * - total_items: Total number of product SKUs
 * - category_breakdown: Value and item count per category
 *
 * Used for financial reporting and inventory investment analysis.
 *
 * @async
 * @function fetchValuationReport
 * @returns {Promise<InventoryValuation>} Valuation summary with category breakdown
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch valuation report
 * dispatch(fetchValuationReport());
 * // Returns: {
 * //   total_value: 150250.75,
 * //   total_items: 450,
 * //   category_breakdown: [
 * //     { category_name: 'Electronics', value: 85000.50, percentage: 56.5 }
 * //   ]
 * // }
 *
 * @see inventoryReportsApi.getValuationReport for backend API call
 * @see InventoryValuation interface in types/inventory-reports.types.ts
 */
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

/**
 * Async thunk: Fetch inventory movement report
 *
 * Tracks stock changes over a date range from sales and manual adjustments.
 * Uses complex SQL query with CTEs (Common Table Expressions) to calculate:
 * - opening_stock: Quantity at start date
 * - sales_in_period: Units sold within date range
 * - adjustments_in_period: Manual adjustments within date range
 * - closing_stock: Current quantity (opening + sales + adjustments)
 * - net_change: Total change (sales + adjustments)
 *
 * Results sorted by net change descending (biggest changes first).
 *
 * @async
 * @function fetchMovementReport
 * @param {MovementReportFilters} filters - Date range (start_date, end_date in YYYY-MM-DD format)
 * @returns {Promise<MovementReportItem[]>} Array of products with movement data
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch movement report for last 30 days
 * dispatch(fetchMovementReport({
 *   start_date: '2026-01-08',
 *   end_date: '2026-02-08'
 * }));
 *
 * @see inventoryReportsApi.getMovementReport for backend API call
 * @see MovementReportItem interface in types/inventory-reports.types.ts
 */
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

/**
 * Async thunk: Fetch category summary report
 *
 * Aggregates inventory health metrics by category:
 * - total_products: Count of products in category
 * - in_stock: Count of products with quantity > 0
 * - low_stock: Count of products at or below reorder level
 * - out_of_stock: Count of products with quantity = 0
 * - total_quantity: Sum of quantities across all products
 * - total_value: Sum of (base_price × quantity) for category
 *
 * Results sorted by total value descending (highest value categories first).
 *
 * @async
 * @function fetchCategorySummary
 * @returns {Promise<CategorySummary[]>} Array of categories with health metrics
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch category summary
 * dispatch(fetchCategorySummary());
 * // Returns: [
 * //   {
 * //     category_name: 'Electronics',
 * //     total_products: 50,
 * //     in_stock: 45,
 * //     low_stock: 8,
 * //     out_of_stock: 5,
 * //     total_quantity: 2500,
 * //     total_value: 125000.00
 * //   }
 * // ]
 *
 * @see inventoryReportsApi.getCategorySummary for backend API call
 * @see CategorySummary interface in types/inventory-reports.types.ts
 */
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

/**
 * Inventory Reports Redux Slice
 *
 * Manages inventory report state with 2 synchronous reducers and 5 async thunks:
 * - setMovementFilters: Update movement report date range
 * - clearErrors: Clear all report errors
 * - fetchLowStockReport: Fetch low stock products (async)
 * - fetchOutOfStockReport: Fetch out of stock products (async)
 * - fetchValuationReport: Fetch inventory valuation (async)
 * - fetchMovementReport: Fetch stock movement (async)
 * - fetchCategorySummary: Fetch category summary (async)
 *
 * @slice inventoryReports
 * @state InventoryReportsState
 */
const inventoryReportsSlice = createSlice({
  name: 'inventoryReports',
  initialState,
  reducers: {
    /**
     * Sets movement report date range filters
     *
     * Updates start_date and end_date for movement report.
     * After updating, dispatch fetchMovementReport to load new data.
     *
     * @param {InventoryReportsState} state - Current inventory reports state
     * @param {PayloadAction<MovementReportFilters>} action - Date range filters
     *
     * @example
     * // Set custom date range
     * dispatch(setMovementFilters({
     *   start_date: '2026-01-01',
     *   end_date: '2026-01-31'
     * }));
     * dispatch(fetchMovementReport(filters));
     */
    setMovementFilters: (state, action: PayloadAction<MovementReportFilters>) => {
      state.movement.filters = action.payload;
    },

    /**
     * Clears all report errors
     *
     * Resets error state for all 5 reports. Used when navigating away from
     * reports page or before retrying failed report fetches.
     *
     * @param {InventoryReportsState} state - Current inventory reports state
     *
     * @example
     * // Clear all errors before retry
     * dispatch(clearErrors());
     */
    clearErrors: (state) => {
      state.lowStock.error = null;
      state.outOfStock.error = null;
      state.valuation.error = null;
      state.movement.error = null;
      state.categorySummary.error = null;
    },
  },
  extraReducers: (builder) => {
    // FetchLowStockReport: pending - set loading state
    builder
      .addCase(fetchLowStockReport.pending, (state) => {
        state.lowStock.isLoading = true;
        state.lowStock.error = null;
      })
      // FetchLowStockReport: fulfilled - store low stock data
      .addCase(fetchLowStockReport.fulfilled, (state, action) => {
        state.lowStock.isLoading = false;
        state.lowStock.data = action.payload;
      })
      // FetchLowStockReport: rejected - set error state
      .addCase(fetchLowStockReport.rejected, (state, action) => {
        state.lowStock.isLoading = false;
        state.lowStock.error = action.payload as string;
      });

    // FetchOutOfStockReport: pending - set loading state
    builder
      .addCase(fetchOutOfStockReport.pending, (state) => {
        state.outOfStock.isLoading = true;
        state.outOfStock.error = null;
      })
      // FetchOutOfStockReport: fulfilled - store out of stock data
      .addCase(fetchOutOfStockReport.fulfilled, (state, action) => {
        state.outOfStock.isLoading = false;
        state.outOfStock.data = action.payload;
      })
      // FetchOutOfStockReport: rejected - set error state
      .addCase(fetchOutOfStockReport.rejected, (state, action) => {
        state.outOfStock.isLoading = false;
        state.outOfStock.error = action.payload as string;
      });

    // FetchValuationReport: pending - set loading state
    builder
      .addCase(fetchValuationReport.pending, (state) => {
        state.valuation.isLoading = true;
        state.valuation.error = null;
      })
      // FetchValuationReport: fulfilled - store valuation data
      .addCase(fetchValuationReport.fulfilled, (state, action) => {
        state.valuation.isLoading = false;
        state.valuation.data = action.payload;
      })
      // FetchValuationReport: rejected - set error state
      .addCase(fetchValuationReport.rejected, (state, action) => {
        state.valuation.isLoading = false;
        state.valuation.error = action.payload as string;
      });

    // FetchMovementReport: pending - set loading state
    builder
      .addCase(fetchMovementReport.pending, (state) => {
        state.movement.isLoading = true;
        state.movement.error = null;
      })
      // FetchMovementReport: fulfilled - store movement data
      .addCase(fetchMovementReport.fulfilled, (state, action) => {
        state.movement.isLoading = false;
        state.movement.data = action.payload;
      })
      // FetchMovementReport: rejected - set error state
      .addCase(fetchMovementReport.rejected, (state, action) => {
        state.movement.isLoading = false;
        state.movement.error = action.payload as string;
      });

    // FetchCategorySummary: pending - set loading state
    builder
      .addCase(fetchCategorySummary.pending, (state) => {
        state.categorySummary.isLoading = true;
        state.categorySummary.error = null;
      })
      // FetchCategorySummary: fulfilled - store category summary data
      .addCase(fetchCategorySummary.fulfilled, (state, action) => {
        state.categorySummary.isLoading = false;
        state.categorySummary.data = action.payload;
      })
      // FetchCategorySummary: rejected - set error state
      .addCase(fetchCategorySummary.rejected, (state, action) => {
        state.categorySummary.isLoading = false;
        state.categorySummary.error = action.payload as string;
      });
  },
});

export const { setMovementFilters, clearErrors } = inventoryReportsSlice.actions;
export default inventoryReportsSlice.reducer;
