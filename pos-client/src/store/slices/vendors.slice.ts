/**
 * @fileoverview Vendors Redux Slice - Manages vendor data and CRUD operations
 *
 * This slice handles vendor management for the Vendors page and purchase order creation:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Vendor list with active/inactive filter
 * - Selected vendor state for viewing/editing details
 * - Integration with purchase order vendor selection
 *
 * State structure:
 * - `vendors`: Vendor list (filtered by active status)
 * - `selectedVendor`: Currently viewed/edited vendor
 * - `activeOnly`: Filter to show only active vendors
 * - `loading`: Loading state for async operations
 * - `error`: Error message from failed operations
 *
 * Usage patterns:
 * - Vendors page: Use fetchVendors + vendors for management
 * - Purchase orders: Use fetchVendors for vendor selector dropdown
 * - Vendor details: Use fetchVendorById + selectedVendor for viewing/editing
 *
 * @module store/slices/vendors
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - Vendor Management)
 * @updated 2026-02-08
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorApi from '../../services/api/vendor.api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../../services/api/vendor.api';

/**
 * Vendors state interface
 *
 * Manages vendor list, selected vendor, active filter, and async operation state.
 *
 * @interface VendorsState
 * @property {Vendor[]} vendors - Vendor list (filtered by activeOnly)
 * @property {Vendor | null} selectedVendor - Currently viewed/edited vendor
 * @property {boolean} loading - True during async vendor operations
 * @property {string | null} error - Error message from failed operations
 * @property {boolean} activeOnly - Filter to show only active vendors (default: true)
 */
interface VendorsState {
  vendors: Vendor[];
  selectedVendor: Vendor | null;
  loading: boolean;
  error: string | null;
  activeOnly: boolean;
}

// Initial state with default filter (active vendors only)
const initialState: VendorsState = {
  vendors: [],
  selectedVendor: null,
  loading: false,
  error: null,
  activeOnly: true,
};

/**
 * Async thunk: Fetch vendors with active status filter
 *
 * Retrieves vendor list from backend based on active status filter.
 * Used for vendor management page and vendor selector in purchase orders.
 *
 * Filter behavior:
 * - activeOnly=true: Returns only active vendors (is_active=true)
 * - activeOnly=false: Returns all vendors (active and inactive)
 *
 * Results are stored in `vendors` array in state.
 *
 * @async
 * @function fetchVendors
 * @param {boolean} [activeOnly=true] - Filter by active status (default: true)
 * @returns {Promise<Vendor[]>} Array of vendor objects
 * @throws {string} Error message on failure (via rejection)
 *
 * @example
 * // Fetch only active vendors
 * dispatch(fetchVendors(true));
 *
 * @example
 * // Fetch all vendors (including inactive)
 * dispatch(fetchVendors(false));
 */
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (activeOnly: boolean = true) => {
    return await vendorApi.getVendors(activeOnly);
  }
);

/**
 * Async thunk: Fetch vendor by ID
 *
 * Retrieves complete vendor details by ID.
 * Used for viewing/editing vendor details and loading vendor for purchase order.
 *
 * Result is stored in `selectedVendor` in state.
 *
 * @async
 * @function fetchVendorById
 * @param {string} id - Vendor UUID
 * @returns {Promise<Vendor>} Complete vendor object
 * @throws {string} Error message if vendor not found or request fails
 *
 * @example
 * // Load vendor for editing
 * dispatch(fetchVendorById('vendor-uuid'));
 * // Result in state.vendors.selectedVendor
 */
export const fetchVendorById = createAsyncThunk(
  'vendors/fetchVendorById',
  async (id: string) => {
    return await vendorApi.getVendorById(id);
  }
);

/**
 * Async thunk: Create new vendor
 *
 * Creates a new vendor with auto-generated vendor_number (VEND-XXXXXX).
 * Only vendor_type and business_name are required.
 *
 * On success, new vendor is added to `vendors` array in state.
 *
 * @async
 * @function createVendor
 * @param {CreateVendorRequest} data - Vendor data (vendor_type and business_name required)
 * @returns {Promise<Vendor>} Newly created vendor with generated fields
 * @throws {string} Error message if validation fails or request fails
 *
 * @example
 * // Create new supplier
 * dispatch(createVendor({
 *   vendor_type: 'supplier',
 *   business_name: 'Acme Supplies Inc.',
 *   email: 'contact@acme.com',
 *   payment_terms: 'Net 30',
 * }));
 */
export const createVendor = createAsyncThunk(
  'vendors/createVendor',
  async (data: CreateVendorRequest) => {
    return await vendorApi.createVendor(data);
  }
);

/**
 * Async thunk: Update vendor
 *
 * Updates vendor information with partial update support.
 * Only include fields that need to be changed.
 *
 * On success, updated vendor replaces existing vendor in `vendors` array
 * and updates `selectedVendor` if it matches.
 *
 * @async
 * @function updateVendor
 * @param {object} params - Update parameters
 * @param {string} params.id - Vendor UUID
 * @param {UpdateVendorRequest} params.data - Fields to update (partial)
 * @returns {Promise<Vendor>} Updated vendor object
 * @throws {string} Error message if vendor not found or request fails
 *
 * @example
 * // Update contact information
 * dispatch(updateVendor({
 *   id: 'vendor-uuid',
 *   data: {
 *     email: 'newemail@vendor.com',
 *     phone: '555-9999',
 *   },
 * }));
 */
export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ id, data }: { id: string; data: UpdateVendorRequest }) => {
    return await vendorApi.updateVendor(id, data);
  }
);

/**
 * Async thunk: Delete vendor (soft delete)
 *
 * Soft deletes vendor by setting is_active=false.
 * Preserves vendor record and purchase order history.
 *
 * Validation:
 * - Cannot delete vendor with active purchase orders (pending/ordered status)
 *
 * On success, vendor is removed from `vendors` array in state.
 *
 * @async
 * @function deleteVendor
 * @param {string} id - Vendor UUID
 * @returns {Promise<string>} Deleted vendor ID
 * @throws {string} Error message if vendor has active POs or request fails
 *
 * @example
 * // Delete vendor
 * dispatch(deleteVendor('vendor-uuid'));
 *
 * @example
 * // Handle deletion with confirmation
 * if (window.confirm('Delete this vendor?')) {
 *   dispatch(deleteVendor(vendor.id));
 * }
 */
export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async (id: string) => {
    await vendorApi.deleteVendor(id);
    return id;
  }
);

/**
 * Vendors Redux slice with reducers and extra reducers for async thunks
 *
 * Reducers:
 * - clearSelectedVendor: Reset selected vendor to null
 * - setActiveOnlyFilter: Update active status filter
 * - clearError: Clear error message
 *
 * Extra reducers handle async thunk states (pending, fulfilled, rejected)
 * for all vendor operations.
 */
const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    /**
     * Clear selected vendor
     *
     * Resets selectedVendor to null. Used after closing vendor details modal
     * or completing vendor edit operation.
     *
     * @param {VendorsState} state - Current state
     *
     * @example
     * // Close vendor details modal
     * dispatch(clearSelectedVendor());
     */
    clearSelectedVendor(state) {
      state.selectedVendor = null;
    },
    /**
     * Set active status filter
     *
     * Updates activeOnly filter and should trigger re-fetch of vendors.
     * Used by checkbox in vendor management page.
     *
     * @param {VendorsState} state - Current state
     * @param {PayloadAction<boolean>} action - New filter value
     *
     * @example
     * // Show all vendors (active and inactive)
     * dispatch(setActiveOnlyFilter(false));
     *
     * @example
     * // Show only active vendors
     * dispatch(setActiveOnlyFilter(true));
     */
    setActiveOnlyFilter(state, action) {
      state.activeOnly = action.payload;
    },
    /**
     * Clear error message
     *
     * Resets error to null. Used after dismissing error notification.
     *
     * @param {VendorsState} state - Current state
     *
     * @example
     * // Clear error after user dismisses alert
     * dispatch(clearError());
     */
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /**
     * Fetch vendors async thunk handlers
     *
     * pending: Set loading=true, clear error
     * fulfilled: Store vendors in state, set loading=false
     * rejected: Set error message, set loading=false
     */
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vendors';
      });

    /**
     * Fetch vendor by ID async thunk handlers
     *
     * pending: Set loading=true, clear error
     * fulfilled: Store vendor in selectedVendor, set loading=false
     * rejected: Set error message, set loading=false
     */
    builder
      .addCase(fetchVendorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedVendor = action.payload;
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vendor';
      });

    /**
     * Create vendor async thunk handlers
     *
     * pending: Set loading=true, clear error
     * fulfilled: Add new vendor to vendors array, set loading=false
     * rejected: Set error message, set loading=false
     */
    builder
      .addCase(createVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors.push(action.payload);
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create vendor';
      });

    /**
     * Update vendor async thunk handlers
     *
     * pending: Set loading=true, clear error
     * fulfilled: Replace vendor in vendors array and update selectedVendor if match
     * rejected: Set error message, set loading=false
     */
    builder
      .addCase(updateVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.vendors.findIndex((v) => v.id === action.payload.id);
        if (index !== -1) {
          state.vendors[index] = action.payload;
        }
        if (state.selectedVendor?.id === action.payload.id) {
          state.selectedVendor = action.payload;
        }
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update vendor';
      });

    /**
     * Delete vendor async thunk handlers
     *
     * pending: Set loading=true, clear error
     * fulfilled: Remove vendor from vendors array, set loading=false
     * rejected: Set error message, set loading=false
     */
    builder
      .addCase(deleteVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.loading = false;
        state.vendors = state.vendors.filter((v) => v.id !== action.payload);
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete vendor';
      });
  },
});

/**
 * Action creators exported from slice
 *
 * - clearSelectedVendor: Reset selected vendor
 * - setActiveOnlyFilter: Update active status filter
 * - clearError: Clear error message
 *
 * @example
 * import { clearSelectedVendor, setActiveOnlyFilter } from './vendors.slice';
 * dispatch(clearSelectedVendor());
 * dispatch(setActiveOnlyFilter(true));
 */
export const { clearSelectedVendor, setActiveOnlyFilter, clearError } =
  vendorsSlice.actions;

/**
 * Vendors reducer
 *
 * Export default reducer for store configuration.
 *
 * @example
 * // In store configuration
 * import vendorsReducer from './slices/vendors.slice';
 * const store = configureStore({
 *   reducer: {
 *     vendors: vendorsReducer,
 *   },
 * });
 */
export default vendorsSlice.reducer;
