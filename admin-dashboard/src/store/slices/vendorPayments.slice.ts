import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchVendorPayments as apiFetchPayments,
  approvePayment,
  voidPayment,
  createPayment,
} from '../../services/vp.service';
import type { VendorPayment, VPListQuery, CreatePaymentInput } from '../../types/vendorPayments.types';

interface VendorPaymentsState {
  payments: VendorPayment[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: VendorPaymentsState = {
  payments: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchVendorPayments = createAsyncThunk(
  'vendorPayments/fetchPayments',
  async (query: VPListQuery, { rejectWithValue }) => {
    try {
      return await apiFetchPayments(query);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      return rejectWithValue(e.response?.data?.error?.message ?? e.message ?? 'Failed to load payments');
    }
  }
);

export const approvePaymentThunk = createAsyncThunk(
  'vendorPayments/approve',
  async (id: string, { rejectWithValue }) => {
    try { return await approvePayment(id); }
    catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      return rejectWithValue(e.response?.data?.error?.message ?? e.message ?? 'Failed to approve');
    }
  }
);

export const voidPaymentThunk = createAsyncThunk(
  'vendorPayments/void',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try { return await voidPayment(id, reason); }
    catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      return rejectWithValue(e.response?.data?.error?.message ?? e.message ?? 'Failed to void');
    }
  }
);

export const createPaymentThunk = createAsyncThunk(
  'vendorPayments/create',
  async (data: CreatePaymentInput, { rejectWithValue }) => {
    try { return await createPayment(data); }
    catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      return rejectWithValue(e.response?.data?.error?.message ?? e.message ?? 'Failed to create payment');
    }
  }
);

const vendorPaymentsSlice = createSlice({
  name: 'vendorPayments',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) { state.page = action.payload; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorPayments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVendorPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.payments;
        state.total = action.payload.total;
        state.page = action.payload.page;
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
      })
      .addCase(createPaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(createPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.payments.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createPaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setPage, clearError } = vendorPaymentsSlice.actions;
export default vendorPaymentsSlice.reducer;
