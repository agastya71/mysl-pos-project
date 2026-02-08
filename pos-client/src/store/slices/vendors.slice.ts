/**
 * Vendors Redux Slice
 * State management for vendor CRUD operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorApi from '../../services/api/vendor.api';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../../services/api/vendor.api';

interface VendorsState {
  vendors: Vendor[];
  selectedVendor: Vendor | null;
  loading: boolean;
  error: string | null;
  activeOnly: boolean;
}

const initialState: VendorsState = {
  vendors: [],
  selectedVendor: null,
  loading: false,
  error: null,
  activeOnly: true,
};

// Async thunks
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (activeOnly: boolean = true) => {
    return await vendorApi.getVendors(activeOnly);
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchVendorById',
  async (id: string) => {
    return await vendorApi.getVendorById(id);
  }
);

export const createVendor = createAsyncThunk(
  'vendors/createVendor',
  async (data: CreateVendorRequest) => {
    return await vendorApi.createVendor(data);
  }
);

export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ id, data }: { id: string; data: UpdateVendorRequest }) => {
    return await vendorApi.updateVendor(id, data);
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async (id: string) => {
    await vendorApi.deleteVendor(id);
    return id;
  }
);

const vendorsSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    clearSelectedVendor(state) {
      state.selectedVendor = null;
    },
    setActiveOnlyFilter(state, action) {
      state.activeOnly = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch vendors
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

    // Fetch vendor by ID
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

    // Create vendor
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

    // Update vendor
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

    // Delete vendor
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

export const { clearSelectedVendor, setActiveOnlyFilter, clearError } =
  vendorsSlice.actions;

export default vendorsSlice.reducer;
