import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import vendorPaymentsReducer, {
  fetchVendorPayments,
  approvePaymentThunk,
  voidPaymentThunk,
  createPaymentThunk,
  setPage,
  clearError,
} from '../store/slices/vendorPayments.slice';
import * as vpService from '../services/vp.service';

vi.mock('../services/vp.service');

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

describe('vendorPayments slice (admin-dashboard)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('has correct initial state', () => {
    const state = makeStore().getState().vendorPayments;
    expect(state.payments).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.page).toBe(1);
    expect(state.loading).toBe(false);
    expect(state.actionLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setPage updates page', () => {
    const store = makeStore();
    store.dispatch(setPage(2));
    expect(store.getState().vendorPayments.page).toBe(2);
  });

  it('clearError clears error', () => {
    const store = makeStore();
    store.dispatch(clearError());
    expect(store.getState().vendorPayments.error).toBeNull();
  });

  describe('fetchVendorPayments', () => {
    it('sets loading while pending', () => {
      vi.spyOn(vpService, 'fetchVendorPayments').mockResolvedValue(emptyResult);
      const store = makeStore();
      const promise = store.dispatch(fetchVendorPayments({}));
      expect(store.getState().vendorPayments.loading).toBe(true);
      return promise;
    });

    it('populates payments on success', async () => {
      vi.spyOn(vpService, 'fetchVendorPayments').mockResolvedValue({
        payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1,
      });
      const store = makeStore();
      await store.dispatch(fetchVendorPayments({}));
      const state = store.getState().vendorPayments;
      expect(state.payments).toHaveLength(1);
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      vi.spyOn(vpService, 'fetchVendorPayments').mockRejectedValue(new Error('Network error'));
      const store = makeStore();
      await store.dispatch(fetchVendorPayments({}));
      expect(store.getState().vendorPayments.error).toBe('Network error');
    });
  });

  describe('approvePaymentThunk', () => {
    it('updates payment status to cleared on success', async () => {
      vi.spyOn(vpService, 'approvePayment').mockResolvedValue({ ...mockPayment, status: 'cleared' });
      const store = makeStore();
      store.dispatch({
        type: fetchVendorPayments.fulfilled.type,
        payload: { payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1 },
      });
      await store.dispatch(approvePaymentThunk('vp1'));
      expect(store.getState().vendorPayments.payments[0].status).toBe('cleared');
    });
  });

  describe('voidPaymentThunk', () => {
    it('updates payment status to void on success', async () => {
      vi.spyOn(vpService, 'voidPayment').mockResolvedValue({ ...mockPayment, status: 'void' });
      const store = makeStore();
      store.dispatch({
        type: fetchVendorPayments.fulfilled.type,
        payload: { payments: [mockPayment], total: 1, total_amount: 500, page: 1, pages: 1 },
      });
      await store.dispatch(voidPaymentThunk({ id: 'vp1', reason: 'Duplicate' }));
      expect(store.getState().vendorPayments.payments[0].status).toBe('void');
    });
  });

  describe('createPaymentThunk', () => {
    it('prepends new payment to list on success', async () => {
      vi.spyOn(vpService, 'createPayment').mockResolvedValue(mockPayment);
      const store = makeStore();
      await store.dispatch(createPaymentThunk({
        vendor_id: 'v1', payment_date: '2026-03-01',
        payment_method: 'check', invoice_allocations: [],
      }));
      expect(store.getState().vendorPayments.payments).toContainEqual(mockPayment);
    });
  });
});
