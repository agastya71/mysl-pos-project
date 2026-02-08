/**
 * Purchase Orders Redux Slice
 * Combines list management (like transactions.slice) + draft editing (like cart.slice)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import * as purchaseOrderAPI from '../../services/api/purchaseOrder.api';
import {
  PurchaseOrderWithDetails,
  CreatePORequest,
  UpdatePORequest,
  ReceiveItemsRequest,
  POListQuery,
  POStatus,
  POOrderType,
  DraftPO,
  DraftPOItem,
  ReorderSuggestionsByVendor,
  Vendor,
} from '../../types/purchaseOrder.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * State shape
 */
interface PurchaseOrdersState {
  // List view
  list: PurchaseOrderWithDetails[];
  filters: {
    vendor_id: string;
    status: POStatus | '';
    order_type: POOrderType | '';
    start_date: string;
    end_date: string;
    search: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Detail view
  selectedPO: PurchaseOrderWithDetails | null;

  // Draft editing (create/edit form)
  draft: DraftPO | null;

  // Reorder suggestions
  reorderSuggestions: ReorderSuggestionsByVendor[];

  // Vendors list
  vendors: Vendor[];

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: PurchaseOrdersState = {
  list: [],
  filters: {
    vendor_id: '',
    status: '',
    order_type: '',
    start_date: '',
    end_date: '',
    search: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  selectedPO: null,
  draft: null,
  reorderSuggestions: [],
  vendors: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

/**
 * Async Thunks - API calls
 */

export const fetchPOs = createAsyncThunk(
  'purchaseOrders/fetchPOs',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const { filters, pagination } = state.purchaseOrders;

    const query: POListQuery = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (filters.vendor_id) query.vendor_id = filters.vendor_id;
    if (filters.status) query.status = filters.status as POStatus;
    if (filters.order_type) query.order_type = filters.order_type as POOrderType;
    if (filters.start_date) query.start_date = filters.start_date;
    if (filters.end_date) query.end_date = filters.end_date;
    if (filters.search) query.search = filters.search;

    return await purchaseOrderAPI.getPOs(query);
  }
);

export const fetchPOById = createAsyncThunk(
  'purchaseOrders/fetchPOById',
  async (id: string) => {
    return await purchaseOrderAPI.getPOById(id);
  }
);

export const createPOThunk = createAsyncThunk(
  'purchaseOrders/createPO',
  async (data: CreatePORequest) => {
    return await purchaseOrderAPI.createPO(data);
  }
);

export const updatePOThunk = createAsyncThunk(
  'purchaseOrders/updatePO',
  async ({ id, data }: { id: string; data: UpdatePORequest }) => {
    return await purchaseOrderAPI.updatePO(id, data);
  }
);

export const deletePOThunk = createAsyncThunk(
  'purchaseOrders/deletePO',
  async (id: string) => {
    await purchaseOrderAPI.deletePO(id);
    return id;
  }
);

export const submitPOThunk = createAsyncThunk(
  'purchaseOrders/submitPO',
  async (id: string) => {
    return await purchaseOrderAPI.submitPO(id);
  }
);

export const approvePOThunk = createAsyncThunk(
  'purchaseOrders/approvePO',
  async (id: string) => {
    return await purchaseOrderAPI.approvePO(id);
  }
);

export const receiveItemsThunk = createAsyncThunk(
  'purchaseOrders/receiveItems',
  async ({ id, data }: { id: string; data: ReceiveItemsRequest }) => {
    return await purchaseOrderAPI.receiveItems(id, data);
  }
);

export const cancelPOThunk = createAsyncThunk(
  'purchaseOrders/cancelPO',
  async ({ id, reason }: { id: string; reason: string }) => {
    return await purchaseOrderAPI.cancelPO(id, reason);
  }
);

export const closePOThunk = createAsyncThunk(
  'purchaseOrders/closePO',
  async (id: string) => {
    return await purchaseOrderAPI.closePO(id);
  }
);

export const fetchReorderSuggestions = createAsyncThunk(
  'purchaseOrders/fetchReorderSuggestions',
  async () => {
    return await purchaseOrderAPI.getReorderSuggestions();
  }
);

export const fetchVendors = createAsyncThunk(
  'purchaseOrders/fetchVendors',
  async () => {
    return await purchaseOrderAPI.getVendors();
  }
);

/**
 * Helper: Calculate draft totals
 */
function calculateDraftTotals(draft: DraftPO): void {
  // Calculate subtotal and tax from items
  draft.subtotal = draft.items.reduce(
    (sum, item) => sum + item.unit_cost * item.quantity_ordered,
    0
  );
  draft.tax_amount = draft.items.reduce((sum, item) => sum + item.tax_amount, 0);

  // Calculate total
  draft.total_amount =
    draft.subtotal +
    draft.tax_amount +
    draft.shipping_cost +
    draft.other_charges -
    draft.discount_amount;
}

/**
 * Slice
 */
const purchaseOrdersSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {
    // Filters
    setVendorFilter(state, action: PayloadAction<string>) {
      state.filters.vendor_id = action.payload;
      state.pagination.page = 1; // Reset to first page
    },
    setStatusFilter(state, action: PayloadAction<POStatus | ''>) {
      state.filters.status = action.payload;
      state.pagination.page = 1;
    },
    setOrderTypeFilter(state, action: PayloadAction<POOrderType | ''>) {
      state.filters.order_type = action.payload;
      state.pagination.page = 1;
    },
    setDateRangeFilter(
      state,
      action: PayloadAction<{ start_date: string; end_date: string }>
    ) {
      state.filters.start_date = action.payload.start_date;
      state.filters.end_date = action.payload.end_date;
      state.pagination.page = 1;
    },
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      state.pagination.page = 1;
    },
    clearFilters(state) {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },

    // Pagination
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },

    // Selected PO
    selectPO(state, action: PayloadAction<PurchaseOrderWithDetails | null>) {
      state.selectedPO = action.payload;
    },

    // Draft management
    initializeDraft(state, action: PayloadAction<Partial<DraftPO>>) {
      const newDraft: DraftPO = {
        vendor_id: action.payload.vendor_id || '',
        order_type: action.payload.order_type || 'purchase',
        expected_delivery_date: action.payload.expected_delivery_date || '',
        shipping_address: action.payload.shipping_address || '',
        billing_address: action.payload.billing_address || '',
        payment_terms: action.payload.payment_terms || '',
        notes: action.payload.notes || '',
        items: action.payload.items || [],
        subtotal: 0,
        tax_amount: 0,
        shipping_cost: action.payload.shipping_cost || 0,
        other_charges: action.payload.other_charges || 0,
        discount_amount: action.payload.discount_amount || 0,
        total_amount: 0,
      };
      if (action.payload.id) {
        newDraft.id = action.payload.id;
      }
      calculateDraftTotals(newDraft);
      state.draft = newDraft;
    },

    clearDraft(state) {
      state.draft = null;
    },

    updateDraftField(
      state,
      action: PayloadAction<{ field: keyof DraftPO; value: any }>
    ) {
      if (state.draft) {
        (state.draft as any)[action.payload.field] = action.payload.value;
        calculateDraftTotals(state.draft);
      }
    },

    // Line items management
    addDraftItem(
      state,
      action: PayloadAction<{
        product_id: string;
        sku: string;
        product_name: string;
        quantity_ordered: number;
        unit_cost: number;
        tax_amount?: number;
        notes?: string;
      }>
    ) {
      if (state.draft) {
        const item: DraftPOItem = {
          temp_id: uuidv4(),
          product_id: action.payload.product_id,
          sku: action.payload.sku,
          product_name: action.payload.product_name,
          quantity_ordered: action.payload.quantity_ordered,
          unit_cost: action.payload.unit_cost,
          tax_amount: action.payload.tax_amount || 0,
          line_total:
            action.payload.quantity_ordered * action.payload.unit_cost +
            (action.payload.tax_amount || 0),
          notes: action.payload.notes || '',
        };
        state.draft.items.push(item);
        calculateDraftTotals(state.draft);
      }
    },

    updateDraftItem(
      state,
      action: PayloadAction<{
        temp_id: string;
        updates: Partial<DraftPOItem>;
      }>
    ) {
      if (state.draft) {
        const itemIndex = state.draft.items.findIndex(
          (item) => item.temp_id === action.payload.temp_id
        );
        if (itemIndex !== -1) {
          const item = state.draft.items[itemIndex];
          Object.assign(item, action.payload.updates);

          // Recalculate line total
          item.line_total =
            item.quantity_ordered * item.unit_cost + item.tax_amount;

          calculateDraftTotals(state.draft);
        }
      }
    },

    removeDraftItem(state, action: PayloadAction<string>) {
      if (state.draft) {
        state.draft.items = state.draft.items.filter(
          (item) => item.temp_id !== action.payload
        );
        calculateDraftTotals(state.draft);
      }
    },

    clearDraftItems(state) {
      if (state.draft) {
        state.draft.items = [];
        calculateDraftTotals(state.draft);
      }
    },

    // Error handling
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch POs
    builder
      .addCase(fetchPOs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPOs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPOs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch purchase orders';
      });

    // Fetch PO by ID
    builder
      .addCase(fetchPOById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPOById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPO = action.payload;
      })
      .addCase(fetchPOById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch purchase order';
      });

    // Create PO
    builder
      .addCase(createPOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createPOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.draft = null; // Clear draft on success
        state.list.unshift(action.payload); // Add to list
      })
      .addCase(createPOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to create purchase order';
      });

    // Update PO
    builder
      .addCase(updatePOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updatePOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.draft = null;
        // Update in list
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        // Update selected if viewing
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(updatePOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to update purchase order';
      });

    // Delete PO
    builder
      .addCase(deletePOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(deletePOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.list = state.list.filter((po) => po.id !== action.payload);
      })
      .addCase(deletePOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to delete purchase order';
      });

    // Submit PO
    builder
      .addCase(submitPOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(submitPOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(submitPOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to submit purchase order';
      });

    // Approve PO
    builder
      .addCase(approvePOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(approvePOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(approvePOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to approve purchase order';
      });

    // Receive items
    builder
      .addCase(receiveItemsThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(receiveItemsThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(receiveItemsThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to receive items';
      });

    // Cancel PO
    builder
      .addCase(cancelPOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(cancelPOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(cancelPOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to cancel purchase order';
      });

    // Close PO
    builder
      .addCase(closePOThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(closePOThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const index = state.list.findIndex((po) => po.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedPO?.id === action.payload.id) {
          state.selectedPO = action.payload;
        }
      })
      .addCase(closePOThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.error.message || 'Failed to close purchase order';
      });

    // Fetch reorder suggestions
    builder
      .addCase(fetchReorderSuggestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReorderSuggestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reorderSuggestions = action.payload;
      })
      .addCase(fetchReorderSuggestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          action.error.message || 'Failed to fetch reorder suggestions';
      });

    // Fetch vendors
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vendors = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch vendors';
      });
  },
});

// Export actions
export const {
  setVendorFilter,
  setStatusFilter,
  setOrderTypeFilter,
  setDateRangeFilter,
  setSearchFilter,
  clearFilters,
  setPage,
  setPageSize,
  selectPO,
  initializeDraft,
  clearDraft,
  updateDraftField,
  addDraftItem,
  updateDraftItem,
  removeDraftItem,
  clearDraftItems,
  clearError,
} = purchaseOrdersSlice.actions;

// Export selectors
export const selectPurchaseOrders = (state: RootState) =>
  state.purchaseOrders.list;
export const selectPOFilters = (state: RootState) => state.purchaseOrders.filters;
export const selectPOPagination = (state: RootState) =>
  state.purchaseOrders.pagination;
export const selectSelectedPO = (state: RootState) =>
  state.purchaseOrders.selectedPO;
export const selectDraftPO = (state: RootState) => state.purchaseOrders.draft;
export const selectReorderSuggestions = (state: RootState) =>
  state.purchaseOrders.reorderSuggestions;
export const selectVendors = (state: RootState) => state.purchaseOrders.vendors;
export const selectPOLoading = (state: RootState) =>
  state.purchaseOrders.isLoading;
export const selectPOSaving = (state: RootState) => state.purchaseOrders.isSaving;
export const selectPOError = (state: RootState) => state.purchaseOrders.error;

export default purchaseOrdersSlice.reducer;
