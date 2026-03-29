import { configureStore } from '@reduxjs/toolkit';
import vendorPaymentsReducer, {
  fetchVendorPayments,
  approvePaymentThunk,
  voidPaymentThunk,
  setPage,
  clearError,
} from '../../../store/slices/vendorPayments.slice';
import * as vpApi from '../../../services/api/vendorPayments.api';

jest.mock('../../../services/api/vendorPayments.api');
const mockVpApi = vpApi as jest.Mocked<typeof vpApi>;

const makeStore = () =>
  configureStore({ reducer: { vendorPayments: vendorPaymentsReducer } });

const mockPayment = {
  id: 'vp1', payment_number: 'VP-001', vendor_id: 'v1',
  payment_date: '2026-03-01', payment_method: 'check' as const,
  reference_number: 'CHK-001', total_amount: '500.00',
  status: 'pending' as const, memo: null, approved_by: null,
  approved_at: null, created_by: null,
  created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
};

const emptyResult = { payments: [], total: 0, total_amount: 0, page: 1, pages: 1 };

describe('vendorPayments slice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has correct initial state', () => {
    const state = makeStore().getState().vendorPayments;
    expect(state.payments).toEqual([]);
    expect(state.vendors).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.page).toBe(1);
    expect(state.limit).toBe(20);
    expect(state.loading).toBe(false);
    expect(state.actionLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setPage updates page', () => {
    const store = makeStore();
    store.dispatch(setPage(3));
    expect(store.getState().vendorPayments.page).toBe(3);
  });

  it('clearError clears the error', () => {
    const store = makeStore();
    store.dispatch(clearError());
    expect(store.getState().vendorPayments.error).toBeNull();
  });

  describe('fetchVendorPayments', () => {
    it('sets loading=true while pending', () => {
      mockVpApi.getVendorPayments.mockResolvedValue(emptyResult);
      mockVpApi.getVPVendors.mockResolvedValue([]);
      const store = makeStore();
      const promise = store.dispatch(fetchVendorPayments({ page: 1, limit: 20 }));
      expect(store.getState().vendorPayments.loading).toBe(true);
      return promise;
    });

    it('populates payments and vendors on success', async () => {
      mockVpApi.getVendorPayments.mockResolvedValue({
        payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1,
      });
      mockVpApi.getVPVendors.mockResolvedValue([
        { id: 'v1', business_name: 'ABC Supplies', vendor_number: 'V001' },
      ]);
      const store = makeStore();
      await store.dispatch(fetchVendorPayments({ page: 1, limit: 20 }));
      const state = store.getState().vendorPayments;
      expect(state.payments).toHaveLength(1);
      expect(state.vendors).toHaveLength(1);
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('sets error on API failure', async () => {
      mockVpApi.getVendorPayments.mockRejectedValue(new Error('Network error'));
      mockVpApi.getVPVendors.mockResolvedValue([]);
      const store = makeStore();
      await store.dispatch(fetchVendorPayments({ page: 1, limit: 20 }));
      expect(store.getState().vendorPayments.error).toBe('Network error');
      expect(store.getState().vendorPayments.loading).toBe(false);
    });
  });

  describe('approvePaymentThunk', () => {
    it('updates matching payment status to cleared on success', async () => {
      const approved = { ...mockPayment, status: 'cleared' as const };
      mockVpApi.approvePayment.mockResolvedValue(approved);
      const store = makeStore();
      store.dispatch({
        type: fetchVendorPayments.fulfilled.type,
        payload: { result: { payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1 }, vendors: [] },
      });
      await store.dispatch(approvePaymentThunk('vp1'));
      const payment = store.getState().vendorPayments.payments.find(p => p.id === 'vp1');
      expect(payment?.status).toBe('cleared');
    });

    it('sets error on failure', async () => {
      mockVpApi.approvePayment.mockRejectedValue(new Error('Approve failed'));
      const store = makeStore();
      await store.dispatch(approvePaymentThunk('vp1'));
      expect(store.getState().vendorPayments.error).toBe('Approve failed');
    });
  });

  describe('voidPaymentThunk', () => {
    it('updates matching payment status to void on success', async () => {
      const voided = { ...mockPayment, status: 'void' as const };
      mockVpApi.voidPayment.mockResolvedValue(voided);
      const store = makeStore();
      store.dispatch({
        type: fetchVendorPayments.fulfilled.type,
        payload: { result: { payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1 }, vendors: [] },
      });
      await store.dispatch(voidPaymentThunk({ id: 'vp1', reason: 'Duplicate' }));
      const payment = store.getState().vendorPayments.payments.find(p => p.id === 'vp1');
      expect(payment?.status).toBe('void');
    });

    it('sets error on failure', async () => {
      mockVpApi.voidPayment.mockRejectedValue(new Error('Void failed'));
      const store = makeStore();
      await store.dispatch(voidPaymentThunk({ id: 'vp1', reason: 'test' }));
      expect(store.getState().vendorPayments.error).toBe('Void failed');
    });
  });
});
