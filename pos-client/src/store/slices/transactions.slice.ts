import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { transactionApi } from '../../services/api/transaction.api';
import {
  Transaction,
  TransactionWithDetails,
  TransactionListQuery,
} from '../../types/transaction.types';

interface TransactionsState {
  items: Transaction[];
  selectedTransaction?: TransactionWithDetails;
  filters: {
    search: string;
    startDate?: string;
    endDate?: string;
    status?: 'completed' | 'voided' | 'refunded' | 'draft';
    cashierId?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  items: [],
  selectedTransaction: undefined,
  filters: {
    search: '',
    startDate: undefined,
    endDate: undefined,
    status: undefined,
    cashierId: undefined,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { transactions: TransactionsState };
      const { filters, pagination } = state.transactions;

      const query: TransactionListQuery = {
        page: pagination.page,
        limit: pagination.limit,
        transaction_number: filters.search || undefined,
        status: filters.status,
        start_date: filters.startDate,
        end_date: filters.endDate,
        cashier_id: filters.cashierId,
      };

      const response = await transactionApi.getTransactions(query);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const fetchTransactionById = createAsyncThunk(
  'transactions/fetchTransactionById',
  async (id: string, { rejectWithValue }) => {
    try {
      const transaction = await transactionApi.getTransactionById(id);
      return transaction;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction details');
    }
  }
);

export const voidTransaction = createAsyncThunk(
  'transactions/voidTransaction',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const transaction = await transactionApi.voidTransaction(id, reason);
      return transaction;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to void transaction');
    }
  }
);

// Slice
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<TransactionsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = undefined;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch transactions
    builder.addCase(fetchTransactions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTransactions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.transactions;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch transaction by ID
    builder.addCase(fetchTransactionById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTransactionById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedTransaction = action.payload;
    });
    builder.addCase(fetchTransactionById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Void transaction
    builder.addCase(voidTransaction.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(voidTransaction.fulfilled, (state, action) => {
      state.isLoading = false;
      // Update the transaction in the list if it exists
      const index = state.items.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      // Update selected transaction if it's the one being voided
      if (state.selectedTransaction?.id === action.payload.id) {
        state.selectedTransaction = {
          ...state.selectedTransaction,
          ...action.payload,
        };
      }
    });
    builder.addCase(voidTransaction.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setFilters, setPage, clearSelectedTransaction, clearError } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
