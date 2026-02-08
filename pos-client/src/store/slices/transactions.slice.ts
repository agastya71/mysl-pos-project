/**
 * @fileoverview Transactions Redux Slice - Manages transaction history and details
 *
 * This slice handles transaction management for the Transaction History page:
 * - Fetching transaction list with filters and pagination
 * - Searching transactions by transaction number
 * - Filtering by date range, status, and cashier
 * - Viewing transaction details (items, payments, totals)
 * - Voiding transactions with reason tracking
 * - Pagination support for large transaction lists
 *
 * State structure:
 * - `items`: Transaction list (paginated)
 * - `selectedTransaction`: Currently viewed transaction with full details
 * - `filters`: Search and filter criteria (transaction #, date range, status, cashier)
 * - `pagination`: Current page, limit, total count, total pages
 *
 * Transaction history flow:
 * 1. User navigates to Transaction History page
 * 2. fetchTransactions thunk loads transactions with current filters/pagination
 * 3. User can search, filter, and paginate results
 * 4. Click transaction → fetchTransactionById loads full details
 * 5. User can void transaction → voidTransaction updates status
 *
 * @module store/slices/transactions
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { transactionApi } from '../../services/api/transaction.api';
import {
  Transaction,
  TransactionWithDetails,
  TransactionListQuery,
} from '../../types/transaction.types';

/**
 * Transactions state interface
 *
 * Manages transaction list, filters, pagination, and selected transaction details.
 *
 * @interface TransactionsState
 * @property {Transaction[]} items - Array of transactions (paginated list)
 * @property {TransactionWithDetails} [selectedTransaction] - Currently viewed transaction with full details
 * @property {object} filters - Search and filter criteria
 * @property {string} filters.search - Transaction number search query
 * @property {string} [filters.startDate] - Date range start (YYYY-MM-DD)
 * @property {string} [filters.endDate] - Date range end (YYYY-MM-DD)
 * @property {'completed' | 'voided' | 'refunded' | 'draft'} [filters.status] - Transaction status filter
 * @property {string} [filters.cashierId] - Cashier/user ID filter
 * @property {object} pagination - Pagination state
 * @property {number} pagination.page - Current page number (1-indexed)
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of transactions
 * @property {number} pagination.totalPages - Total number of pages
 * @property {boolean} isLoading - True during async transaction operations
 * @property {string | null} error - Error message from failed operations
 */
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

// Initial state with empty filters and first page
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

/**
 * Async thunk: Fetch transactions with filters and pagination
 *
 * Retrieves transaction list from backend using current filters and pagination
 * from Redux state. Automatically reads state to build query parameters.
 *
 * Filters applied:
 * - transaction_number: Search by transaction number (partial match)
 * - status: Filter by transaction status
 * - start_date / end_date: Date range filter
 * - cashier_id: Filter by cashier/user
 *
 * Results are paginated (default 20 per page).
 *
 * @async
 * @function fetchTransactions
 * @param {void} _ - No parameters (reads state internally)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<object>} Transaction list and pagination metadata
 * @returns {Transaction[]} returns.transactions - Array of transactions
 * @returns {object} returns.pagination - Pagination metadata (page, limit, total, totalPages)
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch transactions with current filters/pagination
 * import { useAppDispatch } from '../../store/hooks';
 * import { fetchTransactions } from '../../store/slices/transactions.slice';
 *
 * const dispatch = useAppDispatch();
 * dispatch(fetchTransactions());
 *
 * @example
 * // Fetch after changing filters
 * dispatch(setFilters({ status: 'completed', startDate: '2026-02-01' }));
 * dispatch(fetchTransactions()); // Uses updated filters
 *
 * @see transactionApi.getTransactions for backend API call
 * @see TransactionListQuery interface in types/transaction.types.ts
 */
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Read current filters and pagination from Redux state
      const state = getState() as { transactions: TransactionsState };
      const { filters, pagination } = state.transactions;

      // Build API query from state
      const query: TransactionListQuery = {
        page: pagination.page,
        limit: pagination.limit,
        transaction_number: filters.search || undefined,
        status: filters.status,
        start_date: filters.startDate,
        end_date: filters.endDate,
        cashier_id: filters.cashierId,
      };

      // Fetch transactions from backend
      const response = await transactionApi.getTransactions(query);
      return response;
    } catch (error: any) {
      // Extract error message from API response
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

/**
 * Async thunk: Fetch transaction details by ID
 *
 * Retrieves full transaction details including items, payments, and totals.
 * Used when user clicks on a transaction to view details modal.
 *
 * @async
 * @function fetchTransactionById
 * @param {string} id - Transaction UUID
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<TransactionWithDetails>} Transaction with full details
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // View transaction details
 * dispatch(fetchTransactionById('transaction-uuid'));
 * // Result stored in state.transactions.selectedTransaction
 *
 * @see transactionApi.getTransactionById for backend API call
 * @see TransactionWithDetails interface in types/transaction.types.ts
 */
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

/**
 * Async thunk: Void a transaction
 *
 * Marks transaction as voided with reason. Inventory is automatically restored
 * via database trigger. Transaction status changes to 'voided' and void_reason
 * is recorded for audit trail.
 *
 * Updates both the transaction list and selectedTransaction if applicable.
 *
 * @async
 * @function voidTransaction
 * @param {object} params - Void parameters
 * @param {string} params.id - Transaction UUID to void
 * @param {string} params.reason - Reason for voiding (required for audit)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Transaction>} Updated transaction with status='voided'
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Void transaction with reason
 * dispatch(voidTransaction({
 *   id: 'transaction-uuid',
 *   reason: 'Customer requested refund'
 * }));
 *
 * @see transactionApi.voidTransaction for backend API call
 */
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

/**
 * Transactions Redux Slice
 *
 * Manages transaction history state with 4 synchronous reducers and 3 async thunks:
 * - setFilters: Update filter criteria (resets to page 1)
 * - setPage: Change current page
 * - clearSelectedTransaction: Clear detail view
 * - clearError: Clear error message
 * - fetchTransactions: Fetch transaction list (async)
 * - fetchTransactionById: Fetch transaction details (async)
 * - voidTransaction: Void transaction (async)
 *
 * @slice transactions
 * @state TransactionsState
 */
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    /**
     * Sets filter criteria
     *
     * Supports partial updates - only provided filter fields are changed.
     * Automatically resets pagination to page 1 when filters change.
     *
     * @param {TransactionsState} state - Current transactions state
     * @param {PayloadAction<Partial<TransactionsState['filters']>>} action - Filter updates
     *
     * @example
     * // Set search query
     * dispatch(setFilters({ search: 'TXN-001234' }));
     *
     * @example
     * // Set date range and status
     * dispatch(setFilters({
     *   startDate: '2026-02-01',
     *   endDate: '2026-02-08',
     *   status: 'completed'
     * }));
     */
    setFilters: (state, action: PayloadAction<Partial<TransactionsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to first page when filters change
    },

    /**
     * Sets current page number
     *
     * Used by pagination controls to navigate pages.
     * Triggers fetchTransactions to load new page.
     *
     * @param {TransactionsState} state - Current transactions state
     * @param {PayloadAction<number>} action - Page number (1-indexed)
     *
     * @example
     * // Go to page 2
     * dispatch(setPage(2));
     * dispatch(fetchTransactions()); // Load page 2
     */
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },

    /**
     * Clears selected transaction details
     *
     * Resets selectedTransaction to undefined when closing details modal.
     *
     * @param {TransactionsState} state - Current transactions state
     *
     * @example
     * // Close transaction details modal
     * dispatch(clearSelectedTransaction());
     */
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = undefined;
    },

    /**
     * Clears error message
     *
     * Resets error state after displaying error to user or before retrying.
     *
     * @param {TransactionsState} state - Current transactions state
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
    // FetchTransactions: pending - set loading state
    builder.addCase(fetchTransactions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // FetchTransactions: fulfilled - store transaction list and pagination
    builder.addCase(fetchTransactions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.transactions;
      state.pagination = action.payload.pagination;
    });
    // FetchTransactions: rejected - set error state
    builder.addCase(fetchTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // FetchTransactionById: pending - set loading state
    builder.addCase(fetchTransactionById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // FetchTransactionById: fulfilled - store selected transaction details
    builder.addCase(fetchTransactionById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedTransaction = action.payload;
    });
    // FetchTransactionById: rejected - set error state
    builder.addCase(fetchTransactionById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // VoidTransaction: pending - set loading state
    builder.addCase(voidTransaction.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    // VoidTransaction: fulfilled - update transaction in list and selected
    builder.addCase(voidTransaction.fulfilled, (state, action) => {
      state.isLoading = false;

      // Update transaction in list if it exists
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
    // VoidTransaction: rejected - set error state
    builder.addCase(voidTransaction.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setFilters, setPage, clearSelectedTransaction, clearError } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
