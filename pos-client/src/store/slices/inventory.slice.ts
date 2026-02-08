/**
 * @fileoverview Inventory Redux Slice - Manages inventory adjustments and history
 *
 * This slice handles inventory adjustment management:
 * - Creating manual inventory adjustments (damage, theft, found, correction, initial)
 * - Fetching adjustment history with filters and pagination
 * - Viewing adjustment details
 * - Product-specific adjustment history
 *
 * Adjustment types:
 * - damage: Product damaged and cannot be sold
 * - theft: Product stolen/missing
 * - found: Product found (was missing, now found)
 * - correction: Correction to previous count error
 * - initial: Initial stock count when setting up system
 *
 * Adjustments automatically update product quantity via database trigger
 * (apply_inventory_adjustment). Negative adjustments are validated to prevent
 * inventory going below zero.
 *
 * @module store/slices/inventory
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3B)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inventoryApi } from '../../services/api/inventory.api';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  InventoryPagination,
} from '../../types/inventory.types';

/**
 * Inventory state interface
 *
 * Manages adjustment list, filters, pagination, selected adjustment, and product history.
 *
 * @interface InventoryState
 * @property {InventoryAdjustment[]} adjustments - List of adjustments (paginated, all products)
 * @property {InventoryAdjustment | null} selectedAdjustment - Currently viewed adjustment
 * @property {InventoryAdjustment[]} productHistory - Adjustment history for specific product
 * @property {InventoryPagination} pagination - Pagination state (page, limit, total, totalPages)
 * @property {GetAdjustmentsQuery} filters - Filter criteria (type, product_id, date range)
 * @property {boolean} loading - True during async inventory operations
 * @property {string | null} error - Error message from failed operations
 */
interface InventoryState {
  adjustments: InventoryAdjustment[];
  selectedAdjustment: InventoryAdjustment | null;
  productHistory: InventoryAdjustment[];
  pagination: InventoryPagination;
  filters: GetAdjustmentsQuery;
  loading: boolean;
  error: string | null;
}

// Initial state with empty filters and first page
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

/**
 * Async thunk: Create inventory adjustment
 *
 * Creates a manual inventory adjustment. Backend validates that negative adjustments
 * won't cause inventory to go below zero. Database trigger automatically updates
 * product.quantity_in_stock with the adjustment quantity.
 *
 * Adjustment is added to beginning of adjustments list after successful creation.
 *
 * @async
 * @function createAdjustment
 * @param {CreateAdjustmentRequest} data - Adjustment data (product_id, type, quantity, reason, notes)
 * @returns {Promise<InventoryAdjustment>} Created adjustment with generated adjustment_number
 * @throws {Error} If adjustment would cause negative inventory
 *
 * @example
 * // Create damage adjustment
 * const result = await dispatch(createAdjustment({
 *   product_id: 'product-uuid',
 *   adjustment_type: 'damage',
 *   quantity_change: -5, // Remove 5 units
 *   reason: 'Water damage',
 *   notes: 'Units damaged during storm'
 * }));
 *
 * @example
 * // Create initial stock
 * dispatch(createAdjustment({
 *   product_id: 'product-uuid',
 *   adjustment_type: 'initial',
 *   quantity_change: 100, // Add 100 units
 *   reason: 'Initial stock count'
 * }));
 *
 * @see inventoryApi.createAdjustment for backend API call
 * @see CreateAdjustmentRequest interface in types/inventory.types.ts
 */
export const createAdjustment = createAsyncThunk(
  'inventory/createAdjustment',
  async (data: CreateAdjustmentRequest) => {
    return await inventoryApi.createAdjustment(data);
  }
);

/**
 * Async thunk: Fetch adjustments with filters and pagination
 *
 * Retrieves adjustment list from backend using current filters and pagination
 * from Redux state. Filters applied include adjustment type, product ID, and
 * date range.
 *
 * Used for Inventory History page to view all adjustments across all products.
 *
 * @async
 * @function fetchAdjustments
 * @param {void} _ - No parameters (reads state internally)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<object>} Adjustment list and pagination metadata
 * @returns {InventoryAdjustment[]} returns.data - Array of adjustments
 * @returns {InventoryPagination} returns.pagination - Pagination metadata
 *
 * @example
 * // Fetch adjustments with current filters
 * dispatch(fetchAdjustments());
 *
 * @example
 * // Fetch after changing filters
 * dispatch(setFilters({ adjustment_type: 'damage', start_date: '2026-02-01' }));
 * dispatch(fetchAdjustments());
 *
 * @see inventoryApi.getAdjustments for backend API call
 */
export const fetchAdjustments = createAsyncThunk(
  'inventory/fetchAdjustments',
  async (_, { getState }) => {
    // Read current filters and pagination from Redux state
    const state = getState() as { inventory: InventoryState };
    const query: GetAdjustmentsQuery = {
      ...state.inventory.filters,
      page: state.inventory.pagination.page,
      limit: state.inventory.pagination.limit,
    };
    return await inventoryApi.getAdjustments(query);
  }
);

/**
 * Async thunk: Fetch adjustment details by ID
 *
 * Retrieves full adjustment details for viewing.
 * Stores result in selectedAdjustment.
 *
 * @async
 * @function fetchAdjustmentById
 * @param {string} id - Adjustment UUID
 * @returns {Promise<InventoryAdjustment>} Adjustment with full details
 *
 * @example
 * // View adjustment details
 * dispatch(fetchAdjustmentById('adjustment-uuid'));
 *
 * @see inventoryApi.getAdjustmentById for backend API call
 */
export const fetchAdjustmentById = createAsyncThunk(
  'inventory/fetchAdjustmentById',
  async (id: string) => {
    return await inventoryApi.getAdjustmentById(id);
  }
);

/**
 * Async thunk: Fetch product-specific adjustment history
 *
 * Retrieves all adjustments for a specific product, ordered by date descending.
 * Used to view complete adjustment history for a single product.
 *
 * Stores results in productHistory (separate from adjustments list).
 *
 * @async
 * @function fetchProductHistory
 * @param {string} productId - Product UUID
 * @returns {Promise<InventoryAdjustment[]>} Array of adjustments for product
 *
 * @example
 * // View product adjustment history
 * dispatch(fetchProductHistory('product-uuid'));
 * // Results stored in state.inventory.productHistory
 *
 * @see inventoryApi.getProductHistory for backend API call
 */
export const fetchProductHistory = createAsyncThunk(
  'inventory/fetchProductHistory',
  async (productId: string) => {
    return await inventoryApi.getProductHistory(productId);
  }
);

/**
 * Inventory Redux Slice
 *
 * Manages inventory adjustment state with 5 synchronous reducers and 4 async thunks:
 * - setFilters: Update filter criteria (resets to page 1)
 * - setPage: Change current page
 * - clearSelectedAdjustment: Clear selected adjustment
 * - clearProductHistory: Clear product history
 * - clearError: Clear error message
 * - createAdjustment: Create new adjustment (async)
 * - fetchAdjustments: Fetch adjustment list (async)
 * - fetchAdjustmentById: Fetch adjustment details (async)
 * - fetchProductHistory: Fetch product history (async)
 *
 * @slice inventory
 * @state InventoryState
 */
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    /**
     * Sets filter criteria
     *
     * Updates filters for adjustment list. Automatically resets pagination
     * to page 1 when filters change.
     *
     * Available filters:
     * - adjustment_type: Filter by type (damage, theft, found, correction, initial)
     * - product_id: Filter by specific product
     * - start_date: Date range start (YYYY-MM-DD)
     * - end_date: Date range end (YYYY-MM-DD)
     *
     * @param {InventoryState} state - Current inventory state
     * @param {PayloadAction<GetAdjustmentsQuery>} action - Filter criteria
     *
     * @example
     * // Filter by adjustment type
     * dispatch(setFilters({ adjustment_type: 'damage' }));
     *
     * @example
     * // Filter by date range
     * dispatch(setFilters({
     *   start_date: '2026-02-01',
     *   end_date: '2026-02-08'
     * }));
     */
    setFilters: (state, action: PayloadAction<GetAdjustmentsQuery>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page on filter change
    },

    /**
     * Sets current page number
     *
     * Used by pagination controls to navigate pages.
     *
     * @param {InventoryState} state - Current inventory state
     * @param {PayloadAction<number>} action - Page number (1-indexed)
     *
     * @example
     * // Go to page 2
     * dispatch(setPage(2));
     * dispatch(fetchAdjustments());
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },

    /**
     * Clears selected adjustment
     *
     * Resets selectedAdjustment to null when closing details view.
     *
     * @param {InventoryState} state - Current inventory state
     *
     * @example
     * // Close adjustment details
     * dispatch(clearSelectedAdjustment());
     */
    clearSelectedAdjustment: (state) => {
      state.selectedAdjustment = null;
    },

    /**
     * Clears product history
     *
     * Resets productHistory to empty array when navigating away from
     * product detail view.
     *
     * @param {InventoryState} state - Current inventory state
     *
     * @example
     * // Clear history when closing product view
     * dispatch(clearProductHistory());
     */
    clearProductHistory: (state) => {
      state.productHistory = [];
    },

    /**
     * Clears error message
     *
     * Resets error state after displaying error to user or before retrying.
     *
     * @param {InventoryState} state - Current inventory state
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
    // CreateAdjustment: pending - set loading state
    builder
      .addCase(createAdjustment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // CreateAdjustment: fulfilled - add to beginning of list
      .addCase(createAdjustment.fulfilled, (state, action) => {
        state.loading = false;
        // Add new adjustment to beginning of list (most recent first)
        state.adjustments.unshift(action.payload);
      })
      // CreateAdjustment: rejected - set error state
      .addCase(createAdjustment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create adjustment';
      });

    // FetchAdjustments: pending - set loading state
    builder
      .addCase(fetchAdjustments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // FetchAdjustments: fulfilled - store adjustment list and pagination
      .addCase(fetchAdjustments.fulfilled, (state, action) => {
        state.loading = false;
        state.adjustments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      // FetchAdjustments: rejected - set error state
      .addCase(fetchAdjustments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch adjustments';
      });

    // FetchAdjustmentById: pending - set loading state
    builder
      .addCase(fetchAdjustmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // FetchAdjustmentById: fulfilled - store selected adjustment
      .addCase(fetchAdjustmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdjustment = action.payload;
      })
      // FetchAdjustmentById: rejected - set error state
      .addCase(fetchAdjustmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch adjustment';
      });

    // FetchProductHistory: pending - set loading state
    builder
      .addCase(fetchProductHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // FetchProductHistory: fulfilled - store product history
      .addCase(fetchProductHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.productHistory = action.payload;
      })
      // FetchProductHistory: rejected - set error state
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
