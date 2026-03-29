import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAPEntries as apiFetchEntries,
  fetchAPEntry,
  createAPEntry,
  updateAPEntry,
  fetchAPServiceVendors,
} from '../../services/ap.service';
import type {
  APInvoice, APInvoiceWithDetails, APListQuery,
  CreateAPInput, UpdateAPInput, SimpleVendor,
} from '../../types/accountsPayable.types';

interface AccountsPayableState {
  entries: APInvoice[];
  vendors: SimpleVendor[];
  selected: APInvoiceWithDetails | null;
  total: number;
  page: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AccountsPayableState = {
  entries: [],
  vendors: [],
  selected: null,
  total: 0,
  page: 1,
  loading: false,
  saving: false,
  error: null,
};

export const fetchAPEntries = createAsyncThunk(
  'accountsPayable/fetchEntries',
  async (query: APListQuery, { rejectWithValue }) => {
    try {
      const [result, vendors] = await Promise.all([
        apiFetchEntries(query),
        fetchAPServiceVendors(),
      ]);
      return { result, vendors };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load AP entries');
    }
  }
);

export const fetchAPEntryDetail = createAsyncThunk(
  'accountsPayable/fetchDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      return await fetchAPEntry(id);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load AP entry');
    }
  }
);

export const createAPEntryThunk = createAsyncThunk(
  'accountsPayable/create',
  async (data: CreateAPInput, { rejectWithValue }) => {
    try {
      return await createAPEntry(data);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to create AP entry');
    }
  }
);

export const updateAPEntryThunk = createAsyncThunk(
  'accountsPayable/update',
  async ({ id, data }: { id: string; data: UpdateAPInput }, { rejectWithValue }) => {
    try {
      return await updateAPEntry(id, data);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to update AP entry');
    }
  }
);

const accountsPayableSlice = createSlice({
  name: 'accountsPayable',
  initialState,
  reducers: {
    setSelectedEntry(state, action: PayloadAction<APInvoiceWithDetails | null>) {
      state.selected = action.payload;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAPEntries.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAPEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload.result.invoices;
        state.vendors = action.payload.vendors;
        state.total = action.payload.result.total;
        state.page = action.payload.result.page;
      })
      .addCase(fetchAPEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(fetchAPEntryDetail.fulfilled, (state, action) => {
        state.selected = action.payload;
      })
      .addCase(createAPEntryThunk.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(createAPEntryThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.entries.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createAPEntryThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(updateAPEntryThunk.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(updateAPEntryThunk.fulfilled, (state, action) => {
        state.saving = false;
        const idx = state.entries.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) state.entries[idx] = action.payload;
      })
      .addCase(updateAPEntryThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setSelectedEntry, setPage, clearError } = accountsPayableSlice.actions;
export default accountsPayableSlice.reducer;
