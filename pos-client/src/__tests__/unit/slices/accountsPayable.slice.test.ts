import { configureStore } from '@reduxjs/toolkit';
import accountsPayableReducer, {
  fetchAPData,
  setSelectedVendorId,
  clearError,
} from '../../../store/slices/accountsPayable.slice';
import * as apApi from '../../../services/api/accountsPayable.api';

jest.mock('../../../services/api/accountsPayable.api');
const mockApApi = apApi as jest.Mocked<typeof apApi>;

const makeStore = () =>
  configureStore({ reducer: { accountsPayable: accountsPayableReducer } });

const mockVendors = [
  { id: 'v1', business_name: 'ABC Supplies', vendor_number: 'V001' },
];
const mockInvoices = [
  {
    id: 'ap1', ap_number: 'AP-001', vendor_id: 'v1',
    purchase_order_id: null, invoice_number: 'INV-001',
    invoice_date: '2026-01-15', due_date: '2026-02-15',
    status: 'open' as const, invoice_amount: '1000.00', amount_paid: '0.00',
    amount_due: '1000.00', discount_available: '0.00',
    discount_date: null, payment_terms: 'Net 30', notes: null,
    internal_notes: null, created_by: null,
    created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
  },
];

describe('accountsPayable slice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has correct initial state', () => {
    const state = makeStore().getState().accountsPayable;
    expect(state.invoices).toEqual([]);
    expect(state.vendors).toEqual([]);
    expect(state.selectedVendorId).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setSelectedVendorId sets the vendor id', () => {
    const store = makeStore();
    store.dispatch(setSelectedVendorId('v1'));
    expect(store.getState().accountsPayable.selectedVendorId).toBe('v1');
  });

  it('setSelectedVendorId accepts null to clear selection', () => {
    const store = makeStore();
    store.dispatch(setSelectedVendorId('v1'));
    store.dispatch(setSelectedVendorId(null));
    expect(store.getState().accountsPayable.selectedVendorId).toBeNull();
  });

  it('clearError clears the error field', () => {
    const store = makeStore();
    store.dispatch(clearError());
    expect(store.getState().accountsPayable.error).toBeNull();
  });

  describe('fetchAPData', () => {
    it('sets loading=true while pending', () => {
      mockApApi.getAPInvoices.mockResolvedValue({
        invoices: [], total: 0, total_due: 0, overdue_total: 0, page: 1, pages: 1,
      });
      mockApApi.getAPVendors.mockResolvedValue([]);
      const store = makeStore();
      const promise = store.dispatch(fetchAPData());
      expect(store.getState().accountsPayable.loading).toBe(true);
      return promise;
    });

    it('populates invoices and vendors on success', async () => {
      mockApApi.getAPInvoices.mockResolvedValue({
        invoices: mockInvoices, total: 1, total_due: 1000, overdue_total: 0, page: 1, pages: 1,
      });
      mockApApi.getAPVendors.mockResolvedValue(mockVendors);
      const store = makeStore();
      await store.dispatch(fetchAPData());
      const state = store.getState().accountsPayable;
      expect(state.invoices).toEqual(mockInvoices);
      expect(state.vendors).toEqual(mockVendors);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on API failure', async () => {
      mockApApi.getAPInvoices.mockRejectedValue(new Error('Network error'));
      mockApApi.getAPVendors.mockResolvedValue([]);
      const store = makeStore();
      await store.dispatch(fetchAPData());
      const state = store.getState().accountsPayable;
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
    });
  });
});
