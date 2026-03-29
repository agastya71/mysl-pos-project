# AP+VP Frontend — admin-dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD for Accounts Payable and Vendor Payments to the admin-dashboard, including list pages, create/edit modals, a batch payment page, and a Finance nav group.

**Architecture:** Two new Redux slices (`accountsPayable`, `vendorPayments`) follow the existing `product.slice.ts` pattern. Pages and modals use inline styles. Vitest is added for unit testing (the admin-dashboard had no test runner).

**Tech Stack:** React 18, Redux Toolkit 2, React Router v6, TypeScript strict, Vite, Vitest (added in Task 8)

**Working directory for all commands:** `admin-dashboard/` unless stated otherwise.

---

## File Structure

**Create:**
- `admin-dashboard/vitest.config.ts`
- `admin-dashboard/src/types/accountsPayable.types.ts`
- `admin-dashboard/src/types/vendorPayments.types.ts`
- `admin-dashboard/src/services/ap.service.ts`
- `admin-dashboard/src/services/vp.service.ts`
- `admin-dashboard/src/store/slices/accountsPayable.slice.ts`
- `admin-dashboard/src/store/slices/vendorPayments.slice.ts`
- `admin-dashboard/src/__tests__/accountsPayable.slice.test.ts`
- `admin-dashboard/src/__tests__/vendorPayments.slice.test.ts`
- `admin-dashboard/src/pages/AccountsPayable/APListPage.tsx`
- `admin-dashboard/src/pages/AccountsPayable/APFormModal.tsx`
- `admin-dashboard/src/pages/AccountsPayable/APDetailModal.tsx`
- `admin-dashboard/src/pages/VendorPayments/VPListPage.tsx`
- `admin-dashboard/src/pages/VendorPayments/VPCreateModal.tsx`
- `admin-dashboard/src/pages/VendorPayments/ApprovePaymentModal.tsx`
- `admin-dashboard/src/pages/VendorPayments/VoidPaymentModal.tsx`
- `admin-dashboard/src/pages/VendorPayments/VPBatchPage.tsx`

**Modify:**
- `admin-dashboard/package.json` — add vitest devDeps + test scripts
- `admin-dashboard/src/store/index.ts` — register 2 new slices
- `admin-dashboard/src/components/Layout/AppLayout.tsx` — Finance nav group
- `admin-dashboard/src/routes/AppRoutes.tsx` — Finance routes

---

## Task 8: Add Vitest + AP Types + AP Service

**Files:**
- Modify: `admin-dashboard/package.json`
- Create: `admin-dashboard/vitest.config.ts`
- Create: `admin-dashboard/src/types/accountsPayable.types.ts`
- Create: `admin-dashboard/src/services/ap.service.ts`

- [ ] **Step 1: Add Vitest to package.json**

Replace `admin-dashboard/package.json` with:

```json
{
  "name": "admin-dashboard",
  "version": "1.0.0",
  "description": "POS System Admin Dashboard",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3002",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3002",
    "clean": "rm -rf dist",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "vitest": "^1.2.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules` updated, vitest installed.

- [ ] **Step 3: Create vitest config**

```typescript
// admin-dashboard/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Create AP types file**

```typescript
// admin-dashboard/src/types/accountsPayable.types.ts
export interface APInvoice {
  id: string;
  ap_number: string;
  vendor_id: string;
  purchase_order_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string;
  status: 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  invoice_amount: string;
  amount_paid: string;
  amount_due: string;
  discount_available: string;
  discount_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface APPaymentSummary {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_method: string;
  allocated_amount: string;
  status: string;
}

export interface APInvoiceWithDetails extends APInvoice {
  vendor: { id: string; vendor_number: string; business_name: string };
  purchase_order: { id: string; po_number: string } | null;
  payments: APPaymentSummary[];
}

export interface APListQuery {
  vendor_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface APListResult {
  invoices: APInvoice[];
  total: number;
  total_due: number;
  overdue_total: number;
  page: number;
  pages: number;
}

export interface CreateAPInput {
  vendor_id: string;
  purchase_order_id?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  invoice_amount: number;
  discount_available?: number;
  discount_date?: string;
  payment_terms?: string;
  notes?: string;
  internal_notes?: string;
}

export interface UpdateAPInput {
  due_date?: string;
  payment_terms?: string;
  discount_available?: number;
  discount_date?: string;
  notes?: string;
  internal_notes?: string;
}

export interface SimpleVendor {
  id: string;
  vendor_number: string;
  business_name: string;
}
```

- [ ] **Step 5: Create AP service**

```typescript
// admin-dashboard/src/services/ap.service.ts
import { apiClient } from './api.client';
import type {
  APListQuery, APListResult, APInvoice, APInvoiceWithDetails,
  CreateAPInput, UpdateAPInput, SimpleVendor,
} from '../types/accountsPayable.types';

export async function fetchAPEntries(query: APListQuery = {}): Promise<APListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/accounts-payable', { params });
  return response.data.data;
}

export async function fetchAPEntry(id: string): Promise<APInvoiceWithDetails> {
  const response = await apiClient.get(`/accounts-payable/${id}`);
  return response.data.data;
}

export async function createAPEntry(data: CreateAPInput): Promise<APInvoice> {
  const response = await apiClient.post('/accounts-payable', data);
  return response.data.data;
}

export async function updateAPEntry(id: string, data: UpdateAPInput): Promise<APInvoice> {
  const response = await apiClient.put(`/accounts-payable/${id}`, data);
  return response.data.data;
}

export async function fetchAPServiceVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  return response.data.data as SimpleVendor[];
}
```

- [ ] **Step 6: Commit**

```bash
git add \
  admin-dashboard/package.json \
  admin-dashboard/vitest.config.ts \
  admin-dashboard/src/types/accountsPayable.types.ts \
  admin-dashboard/src/services/ap.service.ts
git commit -m "feat(ap): add Vitest, AP types, and AP service to admin-dashboard"
```

---

## Task 9: AP Redux Slice + Tests (admin-dashboard, TDD)

**Files:**
- Create: `admin-dashboard/src/__tests__/accountsPayable.slice.test.ts`
- Create: `admin-dashboard/src/store/slices/accountsPayable.slice.ts`
- Modify: `admin-dashboard/src/store/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// admin-dashboard/src/__tests__/accountsPayable.slice.test.ts
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test
```

Expected: FAIL — module `accountsPayable.slice` not found.

- [ ] **Step 3: Create the slice**

```typescript
// admin-dashboard/src/store/slices/accountsPayable.slice.ts
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
```

- [ ] **Step 4: Register slice in store (add stub for VP slice too)**

```typescript
// admin-dashboard/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import productReducer from './slices/product.slice';
import accountsPayableReducer from './slices/accountsPayable.slice';
import vendorPaymentsReducer from './slices/vendorPayments.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    product: productReducer,
    accountsPayable: accountsPayableReducer,
    vendorPayments: vendorPaymentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Note: `vendorPayments.slice.ts` is created in Task 10. Create it as an empty stub now to unblock compilation:

```typescript
// admin-dashboard/src/store/slices/vendorPayments.slice.ts (temporary stub)
import { createSlice } from '@reduxjs/toolkit';
const vendorPaymentsSlice = createSlice({ name: 'vendorPayments', initialState: {}, reducers: {} });
export default vendorPaymentsSlice.reducer;
```

This stub is replaced in Task 10.

- [ ] **Step 5: Run tests — verify AP slice tests pass**

```bash
npm test
```

Expected: PASS — all AP slice tests green.

- [ ] **Step 6: Commit**

```bash
git add \
  admin-dashboard/src/store/slices/accountsPayable.slice.ts \
  admin-dashboard/src/store/slices/vendorPayments.slice.ts \
  admin-dashboard/src/store/index.ts \
  admin-dashboard/src/__tests__/accountsPayable.slice.test.ts
git commit -m "feat(ap): add accountsPayable slice with tests (admin-dashboard)"
```

---

## Task 10: VP Types + Service + Slice + Tests (admin-dashboard, TDD)

**Files:**
- Create: `admin-dashboard/src/types/vendorPayments.types.ts`
- Create: `admin-dashboard/src/services/vp.service.ts`
- Create: `admin-dashboard/src/__tests__/vendorPayments.slice.test.ts`
- Replace: `admin-dashboard/src/store/slices/vendorPayments.slice.ts` (replaces stub)

- [ ] **Step 1: Create VP types file**

```typescript
// admin-dashboard/src/types/vendorPayments.types.ts
export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number: string | null;
  total_amount: string;
  status: 'pending' | 'cleared' | 'void' | 'cancelled';
  memo: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  ap_invoice_id: string;
  allocated_amount: string;
  discount_taken: string;
  created_at: string;
}

export interface VendorPaymentWithAllocations extends VendorPayment {
  vendor: { id: string; vendor_number: string; business_name: string };
  allocations: Array<{
    id: string;
    ap_invoice_id: string;
    ap_number: string;
    invoice_number: string | null;
    allocated_amount: string;
    discount_taken: string;
  }>;
}

export interface InvoiceAllocationInput {
  ap_invoice_id: string;
  allocated_amount: number;
  discount_taken?: number;
}

export interface CreatePaymentInput {
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
  invoice_allocations: InvoiceAllocationInput[];
}

export interface UpdatePaymentInput {
  payment_date?: string;
  payment_method?: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
}

export interface BatchPaymentInput {
  payments: CreatePaymentInput[];
}

export interface VPListQuery {
  vendor_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface VPListResult {
  payments: VendorPayment[];
  total: number;
  total_amount: number;
  page: number;
  pages: number;
}
```

- [ ] **Step 2: Create VP service**

```typescript
// admin-dashboard/src/services/vp.service.ts
import { apiClient } from './api.client';
import type {
  VPListQuery, VPListResult, VendorPayment, VendorPaymentWithAllocations,
  CreatePaymentInput, UpdatePaymentInput, BatchPaymentInput,
} from '../types/vendorPayments.types';

export async function fetchVendorPayments(query: VPListQuery = {}): Promise<VPListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/vendor-payments', { params });
  return response.data.data;
}

export async function fetchVendorPayment(id: string): Promise<VendorPaymentWithAllocations> {
  const response = await apiClient.get(`/vendor-payments/${id}`);
  return response.data.data;
}

export async function createPayment(data: CreatePaymentInput): Promise<VendorPayment> {
  const response = await apiClient.post('/vendor-payments', data);
  return response.data.data;
}

export async function createBatchPayment(data: BatchPaymentInput): Promise<VendorPayment[]> {
  const response = await apiClient.post('/vendor-payments/batch', data);
  return response.data.data;
}

export async function approvePayment(id: string): Promise<VendorPayment> {
  const response = await apiClient.post(`/vendor-payments/${id}/approve`);
  return response.data.data;
}

export async function voidPayment(id: string, reason: string): Promise<VendorPayment> {
  const response = await apiClient.post(`/vendor-payments/${id}/void`, { reason });
  return response.data.data;
}

export async function updatePayment(id: string, data: UpdatePaymentInput): Promise<VendorPayment> {
  const response = await apiClient.put(`/vendor-payments/${id}`, data);
  return response.data.data;
}
```

- [ ] **Step 3: Write the failing VP slice test**

```typescript
// admin-dashboard/src/__tests__/vendorPayments.slice.test.ts
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
  beforeEach(() => vi.clearAllMocks());

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
```

- [ ] **Step 4: Run test — verify it fails**

```bash
npm test
```

Expected: FAIL — vendorPayments.slice exports not found (stub has no exports).

- [ ] **Step 5: Replace stub with full VP slice**

```typescript
// admin-dashboard/src/store/slices/vendorPayments.slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchVendorPayments as apiFetchPayments,
  approvePayment,
  voidPayment,
  createPayment,
} from '../../services/vp.service';
import type { VendorPayment, VPListQuery, CreatePaymentInput } from '../../types/vendorPayments.types';

interface VendorPaymentsState {
  payments: VendorPayment[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: VendorPaymentsState = {
  payments: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchVendorPayments = createAsyncThunk(
  'vendorPayments/fetchPayments',
  async (query: VPListQuery, { rejectWithValue }) => {
    try {
      return await apiFetchPayments(query);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load payments');
    }
  }
);

export const approvePaymentThunk = createAsyncThunk(
  'vendorPayments/approve',
  async (id: string, { rejectWithValue }) => {
    try { return await approvePayment(id); }
    catch (err: any) { return rejectWithValue(err.message ?? 'Failed to approve'); }
  }
);

export const voidPaymentThunk = createAsyncThunk(
  'vendorPayments/void',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try { return await voidPayment(id, reason); }
    catch (err: any) { return rejectWithValue(err.message ?? 'Failed to void'); }
  }
);

export const createPaymentThunk = createAsyncThunk(
  'vendorPayments/create',
  async (data: CreatePaymentInput, { rejectWithValue }) => {
    try { return await createPayment(data); }
    catch (err: any) { return rejectWithValue(err.message ?? 'Failed to create payment'); }
  }
);

const vendorPaymentsSlice = createSlice({
  name: 'vendorPayments',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) { state.page = action.payload; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorPayments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchVendorPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.payments;
        state.total = action.payload.total;
        state.page = action.payload.page;
      })
      .addCase(fetchVendorPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(approvePaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(approvePaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.payments.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.payments[idx] = action.payload;
      })
      .addCase(approvePaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(voidPaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(voidPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.payments.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.payments[idx] = action.payload;
      })
      .addCase(voidPaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      })
      .addCase(createPaymentThunk.pending, (state) => { state.actionLoading = true; })
      .addCase(createPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.payments.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createPaymentThunk.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setPage, clearError } = vendorPaymentsSlice.actions;
export default vendorPaymentsSlice.reducer;
```

- [ ] **Step 6: Run all tests — verify pass**

```bash
npm test
```

Expected: PASS — AP and VP slice tests all green.

- [ ] **Step 7: Commit**

```bash
git add \
  admin-dashboard/src/types/vendorPayments.types.ts \
  admin-dashboard/src/services/vp.service.ts \
  admin-dashboard/src/store/slices/vendorPayments.slice.ts \
  admin-dashboard/src/__tests__/vendorPayments.slice.test.ts
git commit -m "feat(ap): add VP types, service, and slice with tests (admin-dashboard)"
```

---

## Task 11: AP Pages (APListPage + APFormModal + APDetailModal)

**Files:**
- Create: `admin-dashboard/src/pages/AccountsPayable/APListPage.tsx`
- Create: `admin-dashboard/src/pages/AccountsPayable/APFormModal.tsx`
- Create: `admin-dashboard/src/pages/AccountsPayable/APDetailModal.tsx`

- [ ] **Step 1: Create APFormModal**

```typescript
// admin-dashboard/src/pages/AccountsPayable/APFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { createAPEntryThunk, updateAPEntryThunk } from '../../store/slices/accountsPayable.slice';
import type { APInvoice, CreateAPInput } from '../../types/accountsPayable.types';

interface Props {
  entry?: APInvoice;  // undefined = create mode, defined = edit mode
  onClose: () => void;
  onSuccess: () => void;
}

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  fullWidth: { gridColumn: '1 / -1' as const },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

export default function APFormModal({ entry, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { vendors, saving, error } = useSelector((s: RootState) => s.accountsPayable);

  const [form, setForm] = useState({
    vendor_id: entry?.vendor_id ?? '',
    invoice_number: entry?.invoice_number ?? '',
    invoice_date: entry?.invoice_date ?? new Date().toISOString().split('T')[0],
    due_date: entry?.due_date ?? '',
    invoice_amount: entry ? parseFloat(entry.invoice_amount) : 0,
    payment_terms: entry?.payment_terms ?? '',
    notes: entry?.notes ?? '',
  });

  const set = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.vendor_id || !form.due_date || form.invoice_amount <= 0) return;
    const result = entry
      ? await dispatch(updateAPEntryThunk({
          id: entry.id,
          data: { due_date: form.due_date, payment_terms: form.payment_terms || undefined, notes: form.notes || undefined },
        }))
      : await dispatch(createAPEntryThunk({
          vendor_id: form.vendor_id,
          invoice_number: form.invoice_number || undefined,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          invoice_amount: form.invoice_amount,
          payment_terms: form.payment_terms || undefined,
          notes: form.notes || undefined,
        } as CreateAPInput));
    if ((entry ? updateAPEntryThunk : createAPEntryThunk).fulfilled.match(result)) {
      onSuccess();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>{entry ? 'Edit AP Entry' : 'New AP Entry'}</h2>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.grid}>
          {!entry && (
            <div style={{ ...styles.field, ...styles.fullWidth }}>
              <label style={styles.label}>Vendor *</label>
              <select style={styles.input} value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
              </select>
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Invoice #</label>
            <input style={styles.input} value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Optional" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Invoice Date *</label>
            <input type="date" style={styles.input} value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} disabled={!!entry} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Due Date *</label>
            <input type="date" style={styles.input} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          {!entry && (
            <div style={styles.field}>
              <label style={styles.label}>Amount *</label>
              <input type="number" min="0.01" step="0.01" style={styles.input} value={form.invoice_amount} onChange={e => set('invoice_amount', parseFloat(e.target.value))} />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Payment Terms</label>
            <input style={styles.input} value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="e.g. Net 30" />
          </div>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Notes</label>
            <textarea style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.vendor_id || !form.due_date}
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: saving ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            {saving ? 'Saving...' : entry ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create APDetailModal**

```typescript
// admin-dashboard/src/pages/AccountsPayable/APDetailModal.tsx
import React from 'react';
import type { APInvoiceWithDetails } from '../../types/accountsPayable.types';

interface Props { entry: APInvoiceWithDetails; onClose: () => void; }

const statusColors: Record<string, string> = {
  overdue: '#dc2626', open: '#f59e0b', partial: '#3b82f6',
  paid: '#16a34a', cancelled: '#94a3b8', disputed: '#7c3aed',
};

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' },
  row: { fontSize: '14px', color: '#1e293b' },
  label: { color: '#64748b', marginRight: '6px' },
  badge: (status: string) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '600', color: '#fff',
    background: statusColors[status] ?? '#94a3b8',
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '8px' },
  th: { padding: '8px 10px', textAlign: 'left' as const, background: '#f8fafc', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 10px', fontSize: '13px', color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
};

export default function APDetailModal({ entry, onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{entry.ap_number}</h2>
            <span style={styles.badge(entry.status)}>{entry.status}</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Invoice Details</div>
          <div style={styles.grid}>
            <div style={styles.row}><span style={styles.label}>Vendor:</span>{entry.vendor.business_name}</div>
            <div style={styles.row}><span style={styles.label}>Invoice #:</span>{entry.invoice_number ?? '—'}</div>
            <div style={styles.row}><span style={styles.label}>Invoice Date:</span>{entry.invoice_date}</div>
            <div style={styles.row}><span style={styles.label}>Due Date:</span>{entry.due_date}</div>
            <div style={styles.row}><span style={styles.label}>Invoice Amount:</span>${parseFloat(entry.invoice_amount).toFixed(2)}</div>
            <div style={styles.row}><span style={styles.label}>Amount Paid:</span>${parseFloat(entry.amount_paid).toFixed(2)}</div>
            <div style={styles.row}><span style={styles.label}>Amount Due:</span><strong>${parseFloat(entry.amount_due).toFixed(2)}</strong></div>
            {entry.payment_terms && <div style={styles.row}><span style={styles.label}>Terms:</span>{entry.payment_terms}</div>}
          </div>
          {entry.notes && <div style={{ ...styles.row, marginTop: '10px' }}><span style={styles.label}>Notes:</span>{entry.notes}</div>}
        </div>
        {entry.payments.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Payment Allocations</div>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Payment #</th><th style={styles.th}>Date</th><th style={styles.th}>Method</th><th style={styles.th}>Allocated</th></tr></thead>
              <tbody>
                {entry.payments.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.payment_number}</td>
                    <td style={styles.td}>{p.payment_date}</td>
                    <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                    <td style={styles.td}>${parseFloat(p.allocated_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create APListPage**

```typescript
// admin-dashboard/src/pages/AccountsPayable/APListPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { fetchAPEntries, fetchAPEntryDetail, setPage, clearError } from '../../store/slices/accountsPayable.slice';
import type { APInvoice } from '../../types/accountsPayable.types';
import APFormModal from './APFormModal';
import APDetailModal from './APDetailModal';

const statusColors: Record<string, string> = {
  overdue: '#dc2626', open: '#f59e0b', partial: '#3b82f6',
  paid: '#16a34a', cancelled: '#94a3b8', disputed: '#7c3aed',
};

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  addBtn: { padding: '8px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { padding: '12px 16px', textAlign: 'left' as const, background: '#f1f5f9', fontWeight: '600', color: '#475569', fontSize: '13px', textTransform: 'uppercase' as const },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  actionBtn: (color: string) => ({ background: color, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }),
  errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', display: 'flex', justifyContent: 'space-between' },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
};

export default function APListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, vendors, selected, total, page, loading, error } = useSelector((s: RootState) => s.accountsPayable);
  const limit = 20;
  const [showCreate, setShowCreate] = useState(false);
  const [editEntry, setEditEntry] = useState<APInvoice | null>(null);

  useEffect(() => { dispatch(fetchAPEntries({ page, limit })); }, [dispatch, page]);

  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.business_name])), [vendors]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleView = async (entry: APInvoice) => {
    await dispatch(fetchAPEntryDetail(entry.id));
  };

  const handleSuccess = () => {
    setShowCreate(false);
    setEditEntry(null);
    dispatch(fetchAPEntries({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Accounts Payable</h1>
        <button style={styles.addBtn} onClick={() => setShowCreate(true)}>+ New Entry</button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>AP #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Amount Due</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No AP entries found.</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id}>
                  <td style={styles.td}>{entry.ap_number}</td>
                  <td style={styles.td}>{vendorMap.get(entry.vendor_id) ?? entry.vendor_id}</td>
                  <td style={styles.td}>{entry.invoice_number ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: '600', color: parseFloat(entry.amount_due) > 0 ? '#f59e0b' : '#16a34a' }}>
                    ${parseFloat(entry.amount_due).toFixed(2)}
                  </td>
                  <td style={styles.td}>{entry.due_date}</td>
                  <td style={styles.td}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', background: statusColors[entry.status] ?? '#94a3b8' }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn('#3b82f6')} onClick={() => handleView(entry)}>View</button>
                    <button style={styles.actionBtn('#64748b')} onClick={() => setEditEntry(entry)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.pagination}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>{total} total</span>
            <button disabled={page <= 1} onClick={() => dispatch(setPage(page - 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: '14px' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => dispatch(setPage(page + 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </>
      )}

      {(showCreate || editEntry) && (
        <APFormModal
          entry={editEntry ?? undefined}
          onClose={() => { setShowCreate(false); setEditEntry(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {selected && (
        <APDetailModal entry={selected} onClose={() => dispatch({ type: 'accountsPayable/setSelectedEntry', payload: null })} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add \
  admin-dashboard/src/pages/AccountsPayable/APListPage.tsx \
  admin-dashboard/src/pages/AccountsPayable/APFormModal.tsx \
  admin-dashboard/src/pages/AccountsPayable/APDetailModal.tsx
git commit -m "feat(ap): add AP list page, form modal, and detail modal (admin-dashboard)"
```

---

## Task 12: VP Pages (VPListPage + Modals + VPBatchPage) + Routes + Nav

**Files:**
- Create: `admin-dashboard/src/pages/VendorPayments/ApprovePaymentModal.tsx`
- Create: `admin-dashboard/src/pages/VendorPayments/VoidPaymentModal.tsx`
- Create: `admin-dashboard/src/pages/VendorPayments/VPCreateModal.tsx`
- Create: `admin-dashboard/src/pages/VendorPayments/VPListPage.tsx`
- Create: `admin-dashboard/src/pages/VendorPayments/VPBatchPage.tsx`
- Modify: `admin-dashboard/src/components/Layout/AppLayout.tsx`
- Modify: `admin-dashboard/src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create ApprovePaymentModal (admin-dashboard)**

```typescript
// admin-dashboard/src/pages/VendorPayments/ApprovePaymentModal.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { approvePaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props { payment: VendorPayment; vendorName: string; onClose: () => void; onSuccess: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

export default function ApprovePaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { actionLoading } = useSelector((s: RootState) => s.vendorPayments);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    const result = await dispatch(approvePaymentThunk(payment.id));
    if (approvePaymentThunk.fulfilled.match(result)) { onSuccess(); }
    else { setError((result.payload as string) ?? 'Approval failed'); }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>Approve Payment</h2>
        <p style={styles.subtitle}>This will mark the payment as cleared.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
          <div><strong>Method:</strong> {payment.payment_method.toUpperCase()}</div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button onClick={handleApprove} disabled={actionLoading} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: actionLoading ? '#86efac' : '#16a34a', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {actionLoading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create VoidPaymentModal (admin-dashboard)**

```typescript
// admin-dashboard/src/pages/VendorPayments/VoidPaymentModal.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { voidPaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props { payment: VendorPayment; vendorName: string; onClose: () => void; onSuccess: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#f59e0b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' },
  textarea: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', resize: 'vertical' as const, minHeight: '80px', boxSizing: 'border-box' as const },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginTop: '8px' },
};

export default function VoidPaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { actionLoading } = useSelector((s: RootState) => s.vendorPayments);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVoid = async () => {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    const result = await dispatch(voidPaymentThunk({ id: payment.id, reason: reason.trim() }));
    if (voidPaymentThunk.fulfilled.match(result)) { onSuccess(); }
    else { setError((result.payload as string) ?? 'Void failed'); }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>Void Payment</h2>
        <p style={styles.subtitle}>This action cannot be undone.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
        </div>
        <label style={styles.label}>Reason *</label>
        <textarea style={styles.textarea} value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..." disabled={actionLoading} />
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button onClick={handleVoid} disabled={actionLoading} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: actionLoading ? '#fca5a5' : '#ef4444', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {actionLoading ? 'Voiding...' : 'Void Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create VPCreateModal**

```typescript
// admin-dashboard/src/pages/VendorPayments/VPCreateModal.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { createPaymentThunk } from '../../store/slices/vendorPayments.slice';

interface Props { onClose: () => void; onSuccess: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  fullWidth: { gridColumn: '1 / -1' as const },
  note: { fontSize: '12px', color: '#94a3b8', marginBottom: '16px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

const METHODS = ['check', 'ach', 'wire', 'credit_card', 'cash', 'other'] as const;

export default function VPCreateModal({ onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { actionLoading, error } = useSelector((s: RootState) => s.vendorPayments);
  const vendors = useSelector((s: RootState) => s.accountsPayable.vendors);

  const [form, setForm] = useState({
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check' as typeof METHODS[number],
    reference_number: '',
    memo: '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.vendor_id) return;
    const result = await dispatch(createPaymentThunk({
      vendor_id: form.vendor_id,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
      memo: form.memo || undefined,
      invoice_allocations: [],
    }));
    if (createPaymentThunk.fulfilled.match(result)) { onSuccess(); }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>New Vendor Payment</h2>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.grid}>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Vendor *</label>
            <select style={styles.input} value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
              <option value="">Select vendor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Payment Date *</label>
            <input type="date" style={styles.input} value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Method *</label>
            <select style={styles.input} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reference #</label>
            <input style={styles.input} value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Memo</label>
            <input style={styles.input} value={form.memo} onChange={e => set('memo', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <p style={styles.note}>To allocate this payment to specific invoices, use Batch Payment instead.</p>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button onClick={handleCreate} disabled={actionLoading || !form.vendor_id} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: actionLoading ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: !form.vendor_id || actionLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {actionLoading ? 'Creating...' : 'Create Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create VPListPage**

```typescript
// admin-dashboard/src/pages/VendorPayments/VPListPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store';
import { fetchVendorPayments, setPage } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';
import ApprovePaymentModal from './ApprovePaymentModal';
import VoidPaymentModal from './VoidPaymentModal';
import VPCreateModal from './VPCreateModal';

const statusColors: Record<VendorPayment['status'], string> = {
  pending: '#f59e0b', cleared: '#16a34a', void: '#94a3b8', cancelled: '#ef4444',
};

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  headerBtns: { display: 'flex', gap: '10px' },
  btn: (color: string) => ({ padding: '8px 18px', background: color, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }),
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { padding: '12px 16px', textAlign: 'left' as const, background: '#f1f5f9', fontWeight: '600', color: '#475569', fontSize: '13px', textTransform: 'uppercase' as const },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  actionBtn: (color: string) => ({ background: color, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }),
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
};

export default function VPListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { payments, total, page, limit, loading, error } = useSelector((s: RootState) => s.vendorPayments);
  const vendors = useSelector((s: RootState) => s.accountsPayable.vendors);
  const [approveTarget, setApproveTarget] = useState<VendorPayment | null>(null);
  const [voidTarget, setVoidTarget] = useState<VendorPayment | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { dispatch(fetchVendorPayments({ page, limit })); }, [dispatch, page, limit]);

  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.business_name])), [vendors]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSuccess = () => {
    setApproveTarget(null);
    setVoidTarget(null);
    setShowCreate(false);
    dispatch(fetchVendorPayments({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Vendor Payments</h1>
        <div style={styles.headerBtns}>
          <button style={styles.btn('#64748b')} onClick={() => navigate('/finance/vendor-payments/batch')}>Batch Payment</button>
          <button style={styles.btn('#3b82f6')} onClick={() => setShowCreate(true)}>+ New Payment</button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#dc2626' }}>{error}</div>}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Payment #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No payments found.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.payment_number}</td>
                  <td style={styles.td}>{vendorMap.get(p.vendor_id) ?? p.vendor_id}</td>
                  <td style={styles.td}>${parseFloat(p.total_amount).toFixed(2)}</td>
                  <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                  <td style={styles.td}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', background: statusColors[p.status] }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={styles.td}>{p.payment_date}</td>
                  <td style={styles.td}>
                    {p.status === 'pending' && <button style={styles.actionBtn('#16a34a')} onClick={() => setApproveTarget(p)}>Approve</button>}
                    {(p.status === 'pending' || p.status === 'cleared') && <button style={styles.actionBtn('#ef4444')} onClick={() => setVoidTarget(p)}>Void</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.pagination}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>{total} total</span>
            <button disabled={page <= 1} onClick={() => dispatch(setPage(page - 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: '14px' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => dispatch(setPage(page + 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </>
      )}

      {approveTarget && <ApprovePaymentModal payment={approveTarget} vendorName={vendorMap.get(approveTarget.vendor_id) ?? approveTarget.vendor_id} onClose={() => setApproveTarget(null)} onSuccess={handleSuccess} />}
      {voidTarget && <VoidPaymentModal payment={voidTarget} vendorName={vendorMap.get(voidTarget.vendor_id) ?? voidTarget.vendor_id} onClose={() => setVoidTarget(null)} onSuccess={handleSuccess} />}
      {showCreate && <VPCreateModal onClose={() => setShowCreate(false)} onSuccess={handleSuccess} />}
    </div>
  );
}
```

- [ ] **Step 5: Create VPBatchPage**

```typescript
// admin-dashboard/src/pages/VendorPayments/VPBatchPage.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store';
import { fetchAPEntries } from '../../store/slices/accountsPayable.slice';
import { apiClient } from '../../services/api.client';
import type { APInvoice } from '../../types/accountsPayable.types';
import type { BatchPaymentInput } from '../../types/vendorPayments.types';

const METHODS = ['check', 'ach', 'wire', 'credit_card', 'cash', 'other'] as const;

const styles = {
  container: { padding: '24px', maxWidth: '800px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' },
  section: { background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '10px', textAlign: 'left' as const, background: '#f8fafc', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' },
  backBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' },
  submitBtn: (disabled: boolean) => ({ padding: '10px 24px', borderRadius: '6px', border: 'none', background: disabled ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '15px' }),
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '20px', textAlign: 'center' as const },
  error: { color: '#dc2626', fontSize: '14px', marginTop: '12px' },
};

export default function VPBatchPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { vendors } = useSelector((s: RootState) => s.accountsPayable);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorInvoices, setVendorInvoices] = useState<APInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<typeof METHODS[number]>('check');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load vendors via AP slice if not yet loaded
  useEffect(() => {
    if (vendors.length === 0) dispatch(fetchAPEntries({}));
  }, [dispatch, vendors.length]);

  // Load open invoices when vendor changes
  useEffect(() => {
    if (!selectedVendorId) { setVendorInvoices([]); setSelectedInvoiceIds(new Set()); return; }
    apiClient.get('/accounts-payable', { params: { vendor_id: selectedVendorId, status: 'open', limit: 200 } })
      .then(res => setVendorInvoices(res.data.data.invoices))
      .catch(() => setVendorInvoices([]));
  }, [selectedVendorId]);

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedVendorId || selectedInvoiceIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const payments: BatchPaymentInput['payments'] = Array.from(selectedInvoiceIds).map(ap_invoice_id => {
        const inv = vendorInvoices.find(i => i.id === ap_invoice_id)!;
        return {
          vendor_id: selectedVendorId,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: method,
          reference_number: reference || undefined,
          invoice_allocations: [{ ap_invoice_id, allocated_amount: parseFloat(inv.amount_due) }],
        };
      });
      const response = await apiClient.post('/vendor-payments/batch', { payments });
      setCreatedCount(response.data.data.length);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? err.message ?? 'Batch payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.success}>
          <div style={{ fontSize: '48px' }}>✓</div>
          <h2 style={{ color: '#16a34a', margin: '12px 0 8px' }}>Batch Payment Created</h2>
          <p style={{ color: '#64748b' }}>{createdCount} payment{createdCount !== 1 ? 's' : ''} created successfully.</p>
          <button onClick={() => navigate('/finance/vendor-payments')} style={{ marginTop: '16px', padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            View Payments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Batch Payment</h1>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Select Vendor</h2>
        <label style={styles.label}>Vendor</label>
        <select style={styles.input} value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}>
          <option value="">Select vendor...</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
        </select>
      </div>

      {selectedVendorId && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Select Invoices to Pay</h2>
          {vendorInvoices.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No open invoices for this vendor.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Select</th>
                  <th style={styles.th}>AP #</th>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {vendorInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={styles.td}>
                      <input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => toggleInvoice(inv.id)} />
                    </td>
                    <td style={styles.td}>{inv.ap_number}</td>
                    <td style={styles.td}>{inv.invoice_number ?? '—'}</td>
                    <td style={styles.td}>{inv.due_date}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>${parseFloat(inv.amount_due).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedInvoiceIds.size > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Payment Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Payment Method *</label>
              <select style={styles.input} value={method} onChange={e => setMethod(e.target.value as typeof METHODS[number])}>
                {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Reference #</label>
              <input style={styles.input} value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        <button style={styles.backBtn} onClick={() => navigate('/finance/vendor-payments')}>← Back</button>
        <button
          style={styles.submitBtn(!selectedVendorId || selectedInvoiceIds.size === 0 || submitting)}
          disabled={!selectedVendorId || selectedInvoiceIds.size === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting...' : `Submit ${selectedInvoiceIds.size > 0 ? `(${selectedInvoiceIds.size} invoice${selectedInvoiceIds.size !== 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add Finance nav group to AppLayout**

Read `admin-dashboard/src/components/Layout/AppLayout.tsx` first, then add the Finance nav group. The current sidebar has links for Dashboard, Products, Transactions, Users, Reports. Add Finance after Reports:

```typescript
// In the sidebar section, after the Reports NavLink, add:
<div style={{ marginTop: '8px' }}>
  <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
    Finance
  </div>
  <NavLink
    to="/finance/accounts-payable"
    style={({ isActive }) => ({
      display: 'block',
      padding: '8px 16px 8px 24px',
      textDecoration: 'none',
      color: isActive ? '#007bff' : '#333',
      borderLeft: isActive ? '3px solid #007bff' : '3px solid transparent',
      fontWeight: isActive ? 'bold' : 'normal',
    })}
  >
    Accounts Payable
  </NavLink>
  <NavLink
    to="/finance/vendor-payments"
    style={({ isActive }) => ({
      display: 'block',
      padding: '8px 16px 8px 24px',
      textDecoration: 'none',
      color: isActive ? '#007bff' : '#333',
      borderLeft: isActive ? '3px solid #007bff' : '3px solid transparent',
      fontWeight: isActive ? 'bold' : 'normal',
    })}
  >
    Vendor Payments
  </NavLink>
</div>
```

- [ ] **Step 7: Add Finance routes to AppRoutes**

In `admin-dashboard/src/routes/AppRoutes.tsx`, add imports and routes:

```typescript
import APListPage from '../pages/AccountsPayable/APListPage';
import VPListPage from '../pages/VendorPayments/VPListPage';
import VPBatchPage from '../pages/VendorPayments/VPBatchPage';
```

Add inside the protected routes (inside the AppLayout route, alongside existing routes):

```tsx
<Route path="/finance/accounts-payable" element={<APListPage />} />
<Route path="/finance/vendor-payments" element={<VPListPage />} />
<Route path="/finance/vendor-payments/batch" element={<VPBatchPage />} />
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: TypeScript check passes, Vite build succeeds with no errors.

- [ ] **Step 9: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add \
  admin-dashboard/src/pages/VendorPayments/ \
  admin-dashboard/src/components/Layout/AppLayout.tsx \
  admin-dashboard/src/routes/AppRoutes.tsx
git commit -m "feat(ap): add VP pages, batch page, Finance nav, and routes (admin-dashboard)"
```
