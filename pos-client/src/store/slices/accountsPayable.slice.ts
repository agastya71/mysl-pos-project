import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getAPInvoices, getAPVendors } from '../../services/api/accountsPayable.api';
import type { APInvoice, SimpleVendor } from '../../types/accountsPayable.types';

interface AccountsPayableState {
  invoices: APInvoice[];
  vendors: SimpleVendor[];
  selectedVendorId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AccountsPayableState = {
  invoices: [],
  vendors: [],
  selectedVendorId: null,
  loading: false,
  error: null,
};

export const fetchAPData = createAsyncThunk(
  'accountsPayable/fetchAPData',
  async (_, { rejectWithValue }) => {
    try {
      const [result, vendors] = await Promise.all([
        getAPInvoices({ limit: 1000 }),
        getAPVendors(),
      ]);
      return { result, vendors };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load AP data');
    }
  }
);

const accountsPayableSlice = createSlice({
  name: 'accountsPayable',
  initialState,
  reducers: {
    setSelectedVendorId(state, action: PayloadAction<string | null>) {
      state.selectedVendorId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAPData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAPData.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.result.invoices;
        state.vendors = action.payload.vendors;
      })
      .addCase(fetchAPData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setSelectedVendorId, clearError } = accountsPayableSlice.actions;
export default accountsPayableSlice.reducer;
