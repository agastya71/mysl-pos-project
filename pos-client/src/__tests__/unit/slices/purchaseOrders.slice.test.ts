import { configureStore } from '@reduxjs/toolkit';
import purchaseOrdersReducer, {
  // Actions
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
  // Async thunks
  fetchPOs,
  fetchPOById,
  createPOThunk,
  updatePOThunk,
  deletePOThunk,
  submitPOThunk,
  approvePOThunk,
  receiveItemsThunk,
  cancelPOThunk,
  closePOThunk,
  fetchReorderSuggestions,
  fetchVendors,
} from '../../../store/slices/purchaseOrders.slice';
import {
  PurchaseOrderWithDetails,
  POStatus,
  POOrderType,
  DraftPOItem,
  Vendor,
  ReorderSuggestionsByVendor,
} from '../../../types/purchaseOrder.types';
import * as purchaseOrderAPI from '../../../services/api/purchaseOrder.api';

// Mock the API module
jest.mock('../../../services/api/purchaseOrder.api');

const mockAPI = purchaseOrderAPI as jest.Mocked<typeof purchaseOrderAPI>;

describe('purchaseOrders.slice', () => {
  // Mock data
  const mockVendor: Vendor = {
    id: 'vendor-123',
    vendor_number: 'VEND-000001',
    vendor_type: 'supplier',
    business_name: 'Test Vendor Inc',
    contact_person: 'John Doe',
    email: 'john@testvendor.com',
    phone: '555-0100',
    payment_terms: 'net_30',
    is_active: true,
  };

  const mockPO: PurchaseOrderWithDetails = {
    id: 'po-123',
    po_number: 'PO-20260208-0001',
    vendor_id: 'vendor-123',
    order_type: 'purchase' as POOrderType,
    status: 'draft' as POStatus,
    order_date: '2026-02-08',
    expected_delivery_date: '2026-02-15',
    delivery_date: null,
    subtotal: 100.0,
    tax_amount: 8.0,
    shipping_cost: 10.0,
    other_charges: 0,
    discount_amount: 0,
    total_amount: 118.0,
    shipping_address: null,
    billing_address: null,
    payment_terms: 'net_30',
    payment_status: null,
    amount_paid: 0,
    items: [],
    vendor_name: 'Test Vendor Inc',
    vendor_contact: 'John Doe',
    created_by: 'user-123',
    created_by_name: 'Test User',
    approved_by: null,
    approved_by_name: null,
    approved_at: null,
    notes: null,
    created_at: '2026-02-08T10:00:00Z',
    updated_at: '2026-02-08T10:00:00Z',
  };

  const mockReorderSuggestions: ReorderSuggestionsByVendor[] = [
    {
      vendor_id: 'vendor-123',
      vendor_name: 'Test Vendor Inc',
      vendor_contact: 'John Doe',
      products: [
        {
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Low Stock Product',
          quantity_in_stock: 5,
          reorder_level: 10,
          reorder_quantity: 50,
          vendor_id: 'vendor-123',
          vendor_name: 'Test Vendor Inc',
          unit_cost: 5.0,
        },
      ],
      total_items: 1,
      estimated_total: 250.0,
    },
  ];

  const initialState = {
    list: [],
    filters: {
      vendor_id: '',
      status: '' as POStatus | '',
      order_type: '' as POOrderType | '',
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

  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        purchaseOrders: purchaseOrdersReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = store.getState().purchaseOrders;
      expect(state).toEqual(initialState);
    });
  });

  describe('filter actions', () => {
    it('should set vendor filter and reset page to 1', () => {
      store.dispatch(setPage(3));
      store.dispatch(setVendorFilter('vendor-123'));
      const state = store.getState().purchaseOrders;

      expect(state.filters.vendor_id).toBe('vendor-123');
      expect(state.pagination.page).toBe(1);
    });

    it('should set status filter and reset page to 1', () => {
      store.dispatch(setPage(2));
      store.dispatch(setStatusFilter('approved'));
      const state = store.getState().purchaseOrders;

      expect(state.filters.status).toBe('approved');
      expect(state.pagination.page).toBe(1);
    });

    it('should set order type filter and reset page to 1', () => {
      store.dispatch(setOrderTypeFilter('purchase'));
      const state = store.getState().purchaseOrders;

      expect(state.filters.order_type).toBe('purchase');
      expect(state.pagination.page).toBe(1);
    });

    it('should set date range filter and reset page to 1', () => {
      store.dispatch(
        setDateRangeFilter({ start_date: '2026-01-01', end_date: '2026-01-31' })
      );
      const state = store.getState().purchaseOrders;

      expect(state.filters.start_date).toBe('2026-01-01');
      expect(state.filters.end_date).toBe('2026-01-31');
      expect(state.pagination.page).toBe(1);
    });

    it('should set search filter and reset page to 1', () => {
      store.dispatch(setSearchFilter('PO-2026'));
      const state = store.getState().purchaseOrders;

      expect(state.filters.search).toBe('PO-2026');
      expect(state.pagination.page).toBe(1);
    });

    it('should clear all filters and reset page to 1', () => {
      store.dispatch(setVendorFilter('vendor-123'));
      store.dispatch(setStatusFilter('approved'));
      store.dispatch(setSearchFilter('test'));
      store.dispatch(clearFilters());
      const state = store.getState().purchaseOrders;

      expect(state.filters).toEqual(initialState.filters);
      expect(state.pagination.page).toBe(1);
    });
  });

  describe('pagination actions', () => {
    it('should set page', () => {
      store.dispatch(setPage(3));
      const state = store.getState().purchaseOrders;

      expect(state.pagination.page).toBe(3);
    });

    it('should set page size and reset page to 1', () => {
      store.dispatch(setPage(3));
      store.dispatch(setPageSize(50));
      const state = store.getState().purchaseOrders;

      expect(state.pagination.limit).toBe(50);
      expect(state.pagination.page).toBe(1);
    });
  });

  describe('selection actions', () => {
    it('should select a PO', () => {
      store.dispatch(selectPO(mockPO));
      const state = store.getState().purchaseOrders;

      expect(state.selectedPO).toEqual(mockPO);
    });

    it('should clear selected PO', () => {
      store.dispatch(selectPO(mockPO));
      store.dispatch(selectPO(null));
      const state = store.getState().purchaseOrders;

      expect(state.selectedPO).toBeNull();
    });
  });

  describe('draft management', () => {
    it('should initialize draft with vendor and default values', () => {
      store.dispatch(
        initializeDraft({
          vendor_id: 'vendor-123',
          order_type: 'purchase',
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft).not.toBeNull();
      expect(state.draft?.vendor_id).toBe('vendor-123');
      expect(state.draft?.order_type).toBe('purchase');
      expect(state.draft?.items).toEqual([]);
      expect(state.draft?.subtotal).toBe(0);
      expect(state.draft?.total_amount).toBe(0);
    });

    it('should initialize draft with items and calculate totals', () => {
      const items: DraftPOItem[] = [
        {
          temp_id: 'temp-1',
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 10,
          unit_cost: 5.0,
          tax_amount: 4.0,
          line_total: 54.0,
          notes: '',
        },
      ];

      store.dispatch(
        initializeDraft({
          vendor_id: 'vendor-123',
          order_type: 'purchase',
          items: items,
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items).toHaveLength(1);
      expect(state.draft?.subtotal).toBe(50.0); // 10 * 5.0
      expect(state.draft?.tax_amount).toBe(4.0);
      expect(state.draft?.total_amount).toBe(54.0);
    });

    it('should clear draft', () => {
      store.dispatch(initializeDraft({ vendor_id: 'vendor-123' }));
      store.dispatch(clearDraft());
      const state = store.getState().purchaseOrders;

      expect(state.draft).toBeNull();
    });

    it('should update draft field and recalculate totals', () => {
      store.dispatch(initializeDraft({ vendor_id: 'vendor-123' }));
      store.dispatch(updateDraftField({ field: 'shipping_cost', value: 15.0 }));
      const state = store.getState().purchaseOrders;

      expect(state.draft?.shipping_cost).toBe(15.0);
      expect(state.draft?.total_amount).toBe(15.0); // 0 + 0 + 15 + 0 - 0
    });
  });

  describe('line items management', () => {
    beforeEach(() => {
      store.dispatch(initializeDraft({ vendor_id: 'vendor-123' }));
    });

    it('should add draft item and calculate totals', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 4.0,
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items).toHaveLength(1);
      expect(state.draft?.items[0].product_id).toBe('product-123');
      expect(state.draft?.items[0].line_total).toBe(54.0); // (5 * 10.0) + 4.0
      expect(state.draft?.subtotal).toBe(50.0);
      expect(state.draft?.tax_amount).toBe(4.0);
      expect(state.draft?.total_amount).toBe(54.0);
    });

    it('should add multiple items and calculate totals correctly', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Product 1',
          quantity_ordered: 2,
          unit_cost: 10.0,
          tax_amount: 1.6,
        })
      );
      store.dispatch(
        addDraftItem({
          product_id: 'product-456',
          sku: 'SKU-002',
          product_name: 'Product 2',
          quantity_ordered: 3,
          unit_cost: 15.0,
          tax_amount: 3.6,
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items).toHaveLength(2);
      expect(state.draft?.subtotal).toBe(65.0); // (2 * 10) + (3 * 15)
      expect(state.draft?.tax_amount).toBe(5.2); // 1.6 + 3.6
      expect(state.draft?.total_amount).toBe(70.2);
    });

    it('should update draft item quantity and recalculate', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 4.0,
        })
      );
      const tempId = store.getState().purchaseOrders.draft?.items[0].temp_id;

      store.dispatch(
        updateDraftItem({
          temp_id: tempId!,
          updates: { quantity_ordered: 10 },
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items[0].quantity_ordered).toBe(10);
      expect(state.draft?.items[0].line_total).toBe(104.0); // (10 * 10.0) + 4.0
      expect(state.draft?.subtotal).toBe(100.0);
      expect(state.draft?.total_amount).toBe(104.0);
    });

    it('should update draft item unit cost and recalculate', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 4.0,
        })
      );
      const tempId = store.getState().purchaseOrders.draft?.items[0].temp_id;

      store.dispatch(
        updateDraftItem({
          temp_id: tempId!,
          updates: { unit_cost: 15.0 },
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items[0].unit_cost).toBe(15.0);
      expect(state.draft?.items[0].line_total).toBe(79.0); // (5 * 15.0) + 4.0
      expect(state.draft?.subtotal).toBe(75.0);
    });

    it('should remove draft item and recalculate totals', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 4.0,
        })
      );
      const tempId = store.getState().purchaseOrders.draft?.items[0].temp_id;

      store.dispatch(removeDraftItem(tempId!));
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items).toHaveLength(0);
      expect(state.draft?.subtotal).toBe(0);
      expect(state.draft?.tax_amount).toBe(0);
      expect(state.draft?.total_amount).toBe(0);
    });

    it('should clear all draft items and reset totals', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Product 1',
          quantity_ordered: 2,
          unit_cost: 10.0,
        })
      );
      store.dispatch(
        addDraftItem({
          product_id: 'product-456',
          sku: 'SKU-002',
          product_name: 'Product 2',
          quantity_ordered: 3,
          unit_cost: 15.0,
        })
      );

      store.dispatch(clearDraftItems());
      const state = store.getState().purchaseOrders;

      expect(state.draft?.items).toHaveLength(0);
      expect(state.draft?.subtotal).toBe(0);
      expect(state.draft?.total_amount).toBe(0);
    });

    it('should handle adding item with shipping cost in total calculation', () => {
      store.dispatch(updateDraftField({ field: 'shipping_cost', value: 10.0 }));
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 4.0,
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.total_amount).toBe(64.0); // 50 + 4 + 10
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      // Manually set an error state
      const stateWithError = {
        ...initialState,
        error: 'Something went wrong',
      };
      const action = clearError();
      const state = purchaseOrdersReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('async thunks - fetchPOs', () => {
    it('should set loading state on pending', () => {
      const action = { type: fetchPOs.pending.type };
      const state = purchaseOrdersReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update list and pagination on fulfilled', async () => {
      const mockResponse = {
        data: [mockPO],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockAPI.getPOs.mockResolvedValueOnce(mockResponse);

      await store.dispatch(fetchPOs());
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.list).toEqual([mockPO]);
      expect(state.pagination.total).toBe(1);
    });

    it('should set error on rejected', async () => {
      mockAPI.getPOs.mockRejectedValueOnce(new Error('Network error'));

      await store.dispatch(fetchPOs());
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should read filters from state when fetching', async () => {
      store.dispatch(setVendorFilter('vendor-123'));
      store.dispatch(setStatusFilter('approved'));
      mockAPI.getPOs.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await store.dispatch(fetchPOs());

      expect(mockAPI.getPOs).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: 'vendor-123',
          status: 'approved',
        })
      );
    });
  });

  describe('async thunks - fetchPOById', () => {
    it('should set loading state on pending', () => {
      const action = { type: fetchPOById.pending.type };
      const state = purchaseOrdersReducer(initialState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set selectedPO on fulfilled', async () => {
      mockAPI.getPOById.mockResolvedValueOnce(mockPO);

      await store.dispatch(fetchPOById('po-123'));
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.selectedPO).toEqual(mockPO);
    });

    it('should set error on rejected', async () => {
      mockAPI.getPOById.mockRejectedValueOnce(new Error('Not found'));

      await store.dispatch(fetchPOById('invalid-id'));
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Not found');
    });
  });

  describe('async thunks - createPOThunk', () => {
    const createRequest = {
      vendor_id: 'vendor-123',
      order_type: 'purchase' as POOrderType,
      items: [],
    };

    it('should set saving state on pending', () => {
      const action = { type: createPOThunk.pending.type };
      const state = purchaseOrdersReducer(initialState, action);

      expect(state.isSaving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add PO to list and clear draft on fulfilled', async () => {
      store.dispatch(initializeDraft({ vendor_id: 'vendor-123' }));
      mockAPI.createPO.mockResolvedValueOnce(mockPO);

      await store.dispatch(createPOThunk(createRequest));
      const state = store.getState().purchaseOrders;

      expect(state.isSaving).toBe(false);
      expect(state.draft).toBeNull();
      expect(state.list).toContainEqual(mockPO);
    });

    it('should set error on rejected', async () => {
      mockAPI.createPO.mockRejectedValueOnce(new Error('Validation failed'));

      await store.dispatch(createPOThunk(createRequest));
      const state = store.getState().purchaseOrders;

      expect(state.isSaving).toBe(false);
      expect(state.error).toBe('Validation failed');
    });
  });

  describe('async thunks - updatePOThunk', () => {
    it('should update PO in list on fulfilled', async () => {
      const updatedPO = { ...mockPO, subtotal: 200.0 };
      mockAPI.updatePO.mockResolvedValueOnce(updatedPO);

      // Pre-populate list
      store.dispatch(selectPO(mockPO));
      const action = {
        type: updatePOThunk.fulfilled.type,
        payload: updatedPO,
      };
      let state = store.getState().purchaseOrders;
      state = { ...state, list: [mockPO] };
      state = purchaseOrdersReducer(state, action);

      const updatedItem = state.list.find((po) => po.id === mockPO.id);
      expect(updatedItem?.subtotal).toBe(200.0);
    });
  });

  describe('async thunks - deletePOThunk', () => {
    it('should remove PO from list on fulfilled', async () => {
      mockAPI.deletePO.mockResolvedValueOnce();

      // Pre-populate list
      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: deletePOThunk.fulfilled.type,
        payload: mockPO.id,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list).toHaveLength(0);
    });
  });

  describe('async thunks - status transitions', () => {
    it('should update PO status on submitPOThunk fulfilled', async () => {
      const submittedPO = { ...mockPO, status: 'submitted' as POStatus };
      mockAPI.submitPO.mockResolvedValueOnce(submittedPO);

      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: submitPOThunk.fulfilled.type,
        payload: submittedPO,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list[0].status).toBe('submitted');
    });

    it('should update PO status on approvePOThunk fulfilled', async () => {
      const approvedPO = { ...mockPO, status: 'approved' as POStatus };
      mockAPI.approvePO.mockResolvedValueOnce(approvedPO);

      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: approvePOThunk.fulfilled.type,
        payload: approvedPO,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list[0].status).toBe('approved');
    });

    it('should update PO status on cancelPOThunk fulfilled', async () => {
      const cancelledPO = { ...mockPO, status: 'cancelled' as POStatus };
      mockAPI.cancelPO.mockResolvedValueOnce(cancelledPO);

      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: cancelPOThunk.fulfilled.type,
        payload: cancelledPO,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list[0].status).toBe('cancelled');
    });

    it('should update PO status on closePOThunk fulfilled', async () => {
      const closedPO = { ...mockPO, status: 'closed' as POStatus };
      mockAPI.closePO.mockResolvedValueOnce(closedPO);

      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: closePOThunk.fulfilled.type,
        payload: closedPO,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list[0].status).toBe('closed');
    });
  });

  describe('async thunks - receiveItemsThunk', () => {
    it('should update PO on fulfilled', async () => {
      const receivedPO = {
        ...mockPO,
        status: 'partially_received' as POStatus,
      };
      mockAPI.receiveItems.mockResolvedValueOnce(receivedPO);

      let state = { ...initialState, list: [mockPO] };
      const action = {
        type: receiveItemsThunk.fulfilled.type,
        payload: receivedPO,
      };
      state = purchaseOrdersReducer(state, action);

      expect(state.list[0].status).toBe('partially_received');
    });
  });

  describe('async thunks - fetchReorderSuggestions', () => {
    it('should set reorderSuggestions on fulfilled', async () => {
      mockAPI.getReorderSuggestions.mockResolvedValueOnce(mockReorderSuggestions);

      await store.dispatch(fetchReorderSuggestions());
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.reorderSuggestions).toEqual(mockReorderSuggestions);
    });

    it('should set error on rejected', async () => {
      mockAPI.getReorderSuggestions.mockRejectedValueOnce(
        new Error('Failed to fetch')
      );

      await store.dispatch(fetchReorderSuggestions());
      const state = store.getState().purchaseOrders;

      expect(state.error).toBe('Failed to fetch');
    });
  });

  describe('async thunks - fetchVendors', () => {
    it('should set vendors on fulfilled', async () => {
      mockAPI.getVendors.mockResolvedValueOnce([mockVendor]);

      await store.dispatch(fetchVendors());
      const state = store.getState().purchaseOrders;

      expect(state.isLoading).toBe(false);
      expect(state.vendors).toEqual([mockVendor]);
    });

    it('should set error on rejected', async () => {
      mockAPI.getVendors.mockRejectedValueOnce(new Error('Failed to fetch vendors'));

      await store.dispatch(fetchVendors());
      const state = store.getState().purchaseOrders;

      expect(state.error).toBe('Failed to fetch vendors');
    });
  });

  describe('draft totals calculation', () => {
    beforeEach(() => {
      store.dispatch(initializeDraft({ vendor_id: 'vendor-123' }));
    });

    it('should calculate total with subtotal + tax + shipping - discount', () => {
      store.dispatch(updateDraftField({ field: 'shipping_cost', value: 15.0 }));
      store.dispatch(updateDraftField({ field: 'other_charges', value: 5.0 }));
      store.dispatch(updateDraftField({ field: 'discount_amount', value: 10.0 }));
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Test Product',
          quantity_ordered: 10,
          unit_cost: 5.0,
          tax_amount: 4.0,
        })
      );
      const state = store.getState().purchaseOrders;

      // subtotal = 10 * 5 = 50
      // tax = 4
      // shipping = 15
      // other = 5
      // discount = 10
      // total = 50 + 4 + 15 + 5 - 10 = 64
      expect(state.draft?.subtotal).toBe(50.0);
      expect(state.draft?.tax_amount).toBe(4.0);
      expect(state.draft?.total_amount).toBe(64.0);
    });

    it('should handle zero tax amount items', () => {
      store.dispatch(
        addDraftItem({
          product_id: 'product-123',
          sku: 'SKU-001',
          product_name: 'Tax Free Product',
          quantity_ordered: 5,
          unit_cost: 10.0,
          tax_amount: 0,
        })
      );
      const state = store.getState().purchaseOrders;

      expect(state.draft?.subtotal).toBe(50.0);
      expect(state.draft?.tax_amount).toBe(0);
      expect(state.draft?.total_amount).toBe(50.0);
    });
  });
});
