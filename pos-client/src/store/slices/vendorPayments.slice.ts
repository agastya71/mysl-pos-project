import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getVendorPayments,
  approvePayment,
  voidPayment,
  getVPVendors,
} from '../../services/api/vendorPayments.api';
import type { VendorPayment, VPListQuery } from '../../types/vendorPayments.types';
import type { SimpleVendor } from '../../types/accountsPayable.types';

interface VendorPaymentsState {
  payments: VendorPayment[];
  vendors: SimpleVendor[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: VendorPaymentsState = {
  payments: [],
  vendors: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchVendorPayments = createAsyncThunk(
  'vendorPayments/fetchVendorPayments',
  async (params: VPListQuery, { rejectWithValue }) => {
    try {
      const [result, vendors] = await Promise.all([
        getVendorPayments(params),
        getVPVendors(),
      ]);
      return { result, vendors };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load payments');
    }
  }
);

export const approvePaymentThunk = createAsyncThunk(
  'vendorPayments/approve',
  async (id: string, { rejectWithValue }) => {
    try {
      return await approvePayment(id);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to approve payment');
    }
  }
);

export const voidPaymentThunk = createAsyncThunk(
  'vendorPayments/void',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      return await voidPayment(id, reason);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to void payment');
    }
  }
);

const vendorPaymentsSlice = createSlice({
  name: 'vendorPayments',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.result.payments;
        state.vendors = action.payload.vendors;
        state.total = action.payload.result.total;
        state.page = action.payload.result.page;
      })
      .addCase(fetchVendorPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(approvePaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(approvePaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.payments.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.payments[idx] = action.payload;
      })
      .addCase(approvePaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(voidPaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(voidPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.payments.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.payments[idx] = action.payload;
      })
      .addCase(voidPaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setPage, clearError } = vendorPaymentsSlice.actions;
export default vendorPaymentsSlice.reducer;
