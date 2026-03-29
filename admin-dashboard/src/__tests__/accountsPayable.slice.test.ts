import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import accountsPayableReducer, {
  fetchAPEntries,
  fetchAPEntryDetail,
  createAPEntryThunk,
  updateAPEntryThunk,
  setSelectedEntry,
  setPage,
  clearError,
} from '../store/slices/accountsPayable.slice';
import * as apService from '../services/ap.service';

vi.mock('../services/ap.service');

const makeStore = () =>
  configureStore({ reducer: { accountsPayable: accountsPayableReducer } });

const mockVendors = [{ id: 'v1', business_name: 'ABC Supplies', vendor_number: 'V001' }];
const mockInvoice = {
  id: 'ap1', ap_number: 'AP-001', vendor_id: 'v1',
  purchase_order_id: null, invoice_number: 'INV-001',
  invoice_date: '2026-01-15', due_date: '2026-02-15',
  status: 'open' as const, invoice_amount: '1000.00', amount_paid: '0.00',
  amount_due: '1000.00', discount_available: '0.00',
  discount_date: null, payment_terms: 'Net 30', notes: null,
  internal_notes: null, created_by: null,
  created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
};
const mockWithDetails = {
  ...mockInvoice,
  vendor: { id: 'v1', vendor_number: 'V001', business_name: 'ABC Supplies' },
  purchase_order: null,
  payments: [],
};
const emptyResult = { invoices: [], total: 0, total_due: 0, overdue_total: 0, page: 1, pages: 1 };

describe('accountsPayable slice (admin-dashboard)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('has correct initial state', () => {
    const state = makeStore().getState().accountsPayable;
    expect(state.entries).toEqual([]);
    expect(state.vendors).toEqual([]);
    expect(state.selected).toBeNull();
    expect(state.total).toBe(0);
    expect(state.page).toBe(1);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setPage updates page', () => {
    const store = makeStore();
    store.dispatch(setPage(3));
    expect(store.getState().accountsPayable.page).toBe(3);
  });

  it('setSelectedEntry sets and clears selection', () => {
    const store = makeStore();
    store.dispatch(setSelectedEntry(mockWithDetails));
    expect(store.getState().accountsPayable.selected).toEqual(mockWithDetails);
    store.dispatch(setSelectedEntry(null));
    expect(store.getState().accountsPayable.selected).toBeNull();
  });

  it('clearError clears the error field', () => {
    const store = makeStore();
    store.dispatch(clearError());
    expect(store.getState().accountsPayable.error).toBeNull();
  });

  describe('fetchAPEntries', () => {
    it('sets loading=true while pending', () => {
      vi.spyOn(apService, 'fetchAPEntries').mockResolvedValue(emptyResult);
      vi.spyOn(apService, 'fetchAPServiceVendors').mockResolvedValue([]);
      const store = makeStore();
      const promise = store.dispatch(fetchAPEntries({}));
      expect(store.getState().accountsPayable.loading).toBe(true);
      return promise;
    });

    it('populates entries and vendors on success', async () => {
      vi.spyOn(apService, 'fetchAPEntries').mockResolvedValue({
        invoices: [mockInvoice], total: 1, total_due: 1000, overdue_total: 0, page: 1, pages: 1,
      });
      vi.spyOn(apService, 'fetchAPServiceVendors').mockResolvedValue(mockVendors);
      const store = makeStore();
      await store.dispatch(fetchAPEntries({}));
      const state = store.getState().accountsPayable;
      expect(state.entries).toHaveLength(1);
      expect(state.vendors).toHaveLength(1);
      expect(state.total).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      vi.spyOn(apService, 'fetchAPEntries').mockRejectedValue(new Error('Network error'));
      vi.spyOn(apService, 'fetchAPServiceVendors').mockResolvedValue([]);
      const store = makeStore();
      await store.dispatch(fetchAPEntries({}));
      expect(store.getState().accountsPayable.error).toBe('Network error');
    });
  });

  describe('fetchAPEntryDetail', () => {
    it('sets selected entry on success', async () => {
      vi.spyOn(apService, 'fetchAPEntry').mockResolvedValue(mockWithDetails);
      const store = makeStore();
      await store.dispatch(fetchAPEntryDetail('ap1'));
      expect(store.getState().accountsPayable.selected).toEqual(mockWithDetails);
    });
  });

  describe('createAPEntryThunk', () => {
    it('prepends new entry to list on success', async () => {
      vi.spyOn(apService, 'createAPEntry').mockResolvedValue(mockInvoice);
      const store = makeStore();
      await store.dispatch(createAPEntryThunk({
        vendor_id: 'v1', invoice_date: '2026-01-15', due_date: '2026-02-15', invoice_amount: 1000,
      }));
      expect(store.getState().accountsPayable.entries).toContainEqual(mockInvoice);
    });
  });

  describe('updateAPEntryThunk', () => {
    it('replaces updated entry in list on success', async () => {
      const updated = { ...mockInvoice, due_date: '2026-03-15' };
      vi.spyOn(apService, 'updateAPEntry').mockResolvedValue(updated);
      const store = makeStore();
      store.dispatch({
        type: fetchAPEntries.fulfilled.type,
        payload: { result: { invoices: [mockInvoice], total: 1, total_due: 1000, overdue_total: 0, page: 1, pages: 1 }, vendors: [] },
      });
      await store.dispatch(updateAPEntryThunk({ id: 'ap1', data: { due_date: '2026-03-15' } }));
      const entry = store.getState().accountsPayable.entries.find(e => e.id === 'ap1');
      expect(entry?.due_date).toBe('2026-03-15');
    });
  });
});
