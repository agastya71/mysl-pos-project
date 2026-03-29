# AP+VP Frontend — pos-client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Accounts Payable (read-only vendor summary + drill-down) and Vendor Payments (approve/void workflow) pages to the pos-client Electron app under a Finance nav group.

**Architecture:** Two new Redux slices (`accountsPayable`, `vendorPayments`) each fetch their own data independently. Pages use the existing inline-styles pattern and `useAppDispatch`/`useAppSelector` hooks. RBAC: cashiers are redirected to `/pos`; only manager/admin can access Finance pages.

**Tech Stack:** React 18, Redux Toolkit 2, React Router v6, TypeScript strict, Jest (already configured)

**Working directory for all commands:** `pos-client/` unless stated otherwise.

---

## File Structure

**Create:**
- `pos-client/src/types/accountsPayable.types.ts`
- `pos-client/src/services/api/accountsPayable.api.ts`
- `pos-client/src/store/slices/accountsPayable.slice.ts`
- `pos-client/src/types/vendorPayments.types.ts`
- `pos-client/src/services/api/vendorPayments.api.ts`
- `pos-client/src/store/slices/vendorPayments.slice.ts`
- `pos-client/src/components/AccountsPayable/APVendorDetailModal.tsx`
- `pos-client/src/pages/AccountsPayablePage.tsx`
- `pos-client/src/components/VendorPayments/ApprovePaymentModal.tsx`
- `pos-client/src/components/VendorPayments/VoidPaymentModal.tsx`
- `pos-client/src/pages/VendorPaymentsPage.tsx`
- `pos-client/src/__tests__/unit/slices/accountsPayable.slice.test.ts`
- `pos-client/src/__tests__/unit/slices/vendorPayments.slice.test.ts`

**Modify:**
- `pos-client/src/store/index.ts` — register 2 new slices
- `pos-client/src/App.tsx` — add 2 Finance routes

---

## Task 1: AP Types + API Service

**Files:**
- Create: `pos-client/src/types/accountsPayable.types.ts`
- Create: `pos-client/src/services/api/accountsPayable.api.ts`

- [ ] **Step 1: Create AP types file**

```typescript
// pos-client/src/types/accountsPayable.types.ts
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
  overdue?: string;
  start_date?: string;
  end_date?: string;
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

export interface SimpleVendor {
  id: string;
  vendor_number: string;
  business_name: string;
}

export interface APSummary {
  vendor_id: string;
  vendor_name: string;
  total_outstanding: number;
  oldest_invoice_date: string;
  invoice_count: number;
}
```

- [ ] **Step 2: Create AP API service**

```typescript
// pos-client/src/services/api/accountsPayable.api.ts
import { apiClient } from './api.client';
import type { APListQuery, APListResult, SimpleVendor } from '../../types/accountsPayable.types';

export async function getAPInvoices(query: APListQuery = {}): Promise<APListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/accounts-payable', { params });
  return response.data.data;
}

export async function getAPVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  // GET /vendors returns { success: true, data: Vendor[] } — data is a plain array
  return response.data.data as SimpleVendor[];
}
```

- [ ] **Step 3: Commit**

```bash
git add pos-client/src/types/accountsPayable.types.ts pos-client/src/services/api/accountsPayable.api.ts
git commit -m "feat(ap): add pos-client AP types and API service"
```

---

## Task 2: AP Redux Slice (TDD)

**Files:**
- Create: `pos-client/src/__tests__/unit/slices/accountsPayable.slice.test.ts`
- Create: `pos-client/src/store/slices/accountsPayable.slice.ts`
- Modify: `pos-client/src/store/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// pos-client/src/__tests__/unit/slices/accountsPayable.slice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import accountsPayableReducer, {
  fetchAPData,
  setSelectedVendorId,
  clearError,
} from '../../../../store/slices/accountsPayable.slice';
import * as apApi from '../../../../services/api/accountsPayable.api';

jest.mock('../../../../services/api/accountsPayable.api');
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern="accountsPayable.slice" --watchAll=false
```

Expected: FAIL — module `accountsPayable.slice` not found.

- [ ] **Step 3: Create the slice**

```typescript
// pos-client/src/store/slices/accountsPayable.slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getAPInvoices, getAPVendors } from '../../services/api/accountsPayable.api';
import type { APInvoice, SimpleVendor } from '../../types/accountsPayable.types';

interface AccountsPayableState {
  invoices: APInvoice[];
  vendors: SimpleVendor[];
  selectedVendorId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AccountsPayableState = {
  invoices: [],
  vendors: [],
  selectedVendorId: null,
  loading: false,
  error: null,
};

export const fetchAPData = createAsyncThunk(
  'accountsPayable/fetchAPData',
  async (_, { rejectWithValue }) => {
    try {
      const [result, vendors] = await Promise.all([
        getAPInvoices({ limit: 1000 }),
        getAPVendors(),
      ]);
      return { result, vendors };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load AP data');
    }
  }
);

const accountsPayableSlice = createSlice({
  name: 'accountsPayable',
  initialState,
  reducers: {
    setSelectedVendorId(state, action: PayloadAction<string | null>) {
      state.selectedVendorId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAPData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAPData.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.result.invoices;
        state.vendors = action.payload.vendors;
      })
      .addCase(fetchAPData.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unknown error';
      });
  },
});

export const { setSelectedVendorId, clearError } = accountsPayableSlice.actions;
export default accountsPayableSlice.reducer;
```

- [ ] **Step 4: Register slice in store**

In `pos-client/src/store/index.ts`, add:

```typescript
import accountsPayableReducer from './slices/accountsPayable.slice';
// ...add to configureStore reducer map:
accountsPayable: accountsPayableReducer,
```

Full updated file:

```typescript
// pos-client/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import productsReducer from './slices/products.slice';
import cartReducer from './slices/cart.slice';
import checkoutReducer from './slices/checkout.slice';
import transactionsReducer from './slices/transactions.slice';
import customersReducer from './slices/customers.slice';
import categoriesReducer from './slices/categories.slice';
import inventoryReducer from './slices/inventory.slice';
import inventoryReportsReducer from './slices/inventory-reports.slice';
import purchaseOrdersReducer from './slices/purchaseOrders.slice';
import vendorsReducer from './slices/vendors.slice';
import employeesReducer from './slices/employees.slice';
import rolesReducer from './slices/roles.slice';
import accountsPayableReducer from './slices/accountsPayable.slice';
import vendorPaymentsReducer from './slices/vendorPayments.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    checkout: checkoutReducer,
    transactions: transactionsReducer,
    customers: customersReducer,
    categories: categoriesReducer,
    inventory: inventoryReducer,
    inventoryReports: inventoryReportsReducer,
    purchaseOrders: purchaseOrdersReducer,
    vendors: vendorsReducer,
    employees: employeesReducer,
    roles: rolesReducer,
    accountsPayable: accountsPayableReducer,
    vendorPayments: vendorPaymentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Note: `vendorPayments.slice.ts` will be created in Task 4. The store will fail to compile until that file exists — create it as a stub first if needed, or complete Task 3–4 before registering both slices.

- [ ] **Step 5: Run test — verify it passes**

```bash
npm test -- --testPathPattern="accountsPayable.slice" --watchAll=false
```

Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add pos-client/src/store/slices/accountsPayable.slice.ts pos-client/src/__tests__/unit/slices/accountsPayable.slice.test.ts
git commit -m "feat(ap): add accountsPayable Redux slice with tests"
```

---

## Task 3: VP Types + API Service

**Files:**
- Create: `pos-client/src/types/vendorPayments.types.ts`
- Create: `pos-client/src/services/api/vendorPayments.api.ts`

- [ ] **Step 1: Create VP types file**

```typescript
// pos-client/src/types/vendorPayments.types.ts
import type { SimpleVendor } from './accountsPayable.types';

export type { SimpleVendor };

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

- [ ] **Step 2: Create VP API service**

```typescript
// pos-client/src/services/api/vendorPayments.api.ts
import { apiClient } from './api.client';
import type { VPListQuery, VPListResult, VendorPayment } from '../../types/vendorPayments.types';
import type { SimpleVendor } from '../../types/accountsPayable.types';

export async function getVendorPayments(query: VPListQuery = {}): Promise<VPListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/vendor-payments', { params });
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

export async function getVPVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  return response.data.data as SimpleVendor[];
}
```

- [ ] **Step 3: Commit**

```bash
git add pos-client/src/types/vendorPayments.types.ts pos-client/src/services/api/vendorPayments.api.ts
git commit -m "feat(ap): add pos-client VP types and API service"
```

---

## Task 4: VP Redux Slice (TDD)

**Files:**
- Create: `pos-client/src/__tests__/unit/slices/vendorPayments.slice.test.ts`
- Create: `pos-client/src/store/slices/vendorPayments.slice.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// pos-client/src/__tests__/unit/slices/vendorPayments.slice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import vendorPaymentsReducer, {
  fetchVendorPayments,
  approvePaymentThunk,
  voidPaymentThunk,
  setPage,
  clearError,
} from '../../../../store/slices/vendorPayments.slice';
import * as vpApi from '../../../../services/api/vendorPayments.api';

jest.mock('../../../../services/api/vendorPayments.api');
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
      // Pre-populate state via fulfilled action
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- --testPathPattern="vendorPayments.slice" --watchAll=false
```

Expected: FAIL — module `vendorPayments.slice` not found.

- [ ] **Step 3: Create the slice**

```typescript
// pos-client/src/store/slices/vendorPayments.slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getVendorPayments,
  approvePayment,
  voidPayment,
  getVPVendors,
} from '../../services/api/vendorPayments.api';
import type { VendorPayment, VPListQuery } from '../../types/vendorPayments.types';
import type { SimpleVendor } from '../../types/accountsPayable.types';

interface VendorPaymentsState {
  payments: VendorPayment[];
  vendors: SimpleVendor[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: VendorPaymentsState = {
  payments: [],
  vendors: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchVendorPayments = createAsyncThunk(
  'vendorPayments/fetchVendorPayments',
  async (params: VPListQuery, { rejectWithValue }) => {
    try {
      const [result, vendors] = await Promise.all([
        getVendorPayments(params),
        getVPVendors(),
      ]);
      return { result, vendors };
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to load payments');
    }
  }
);

export const approvePaymentThunk = createAsyncThunk(
  'vendorPayments/approve',
  async (id: string, { rejectWithValue }) => {
    try {
      return await approvePayment(id);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to approve payment');
    }
  }
);

export const voidPaymentThunk = createAsyncThunk(
  'vendorPayments/void',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      return await voidPayment(id, reason);
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to void payment');
    }
  }
);

const vendorPaymentsSlice = createSlice({
  name: 'vendorPayments',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.result.payments;
        state.vendors = action.payload.vendors;
        state.total = action.payload.result.total;
        state.page = action.payload.result.page;
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
      });
  },
});

export const { setPage, clearError } = vendorPaymentsSlice.actions;
export default vendorPaymentsSlice.reducer;
```

- [ ] **Step 4: Run tests — verify both slice tests pass**

```bash
npm test -- --testPathPattern="(accountsPayable|vendorPayments).slice" --watchAll=false
```

Expected: PASS — both test files, all tests green.

- [ ] **Step 5: Commit**

```bash
git add pos-client/src/store/slices/vendorPayments.slice.ts pos-client/src/__tests__/unit/slices/vendorPayments.slice.test.ts pos-client/src/store/index.ts
git commit -m "feat(ap): add vendorPayments Redux slice with tests; register both slices in store"
```

---

## Task 5: AccountsPayablePage + APVendorDetailModal

**Files:**
- Create: `pos-client/src/components/AccountsPayable/APVendorDetailModal.tsx`
- Create: `pos-client/src/pages/AccountsPayablePage.tsx`

- [ ] **Step 1: Create APVendorDetailModal**

```typescript
// pos-client/src/components/AccountsPayable/APVendorDetailModal.tsx
import React from 'react';
import type { APInvoice } from '../../types/accountsPayable.types';

interface Props {
  vendorName: string;
  invoices: APInvoice[];
  onClose: () => void;
}

const statusColors: Record<APInvoice['status'], string> = {
  overdue: '#dc2626',
  open: '#f59e0b',
  partial: '#3b82f6',
  paid: '#16a34a',
  cancelled: '#94a3b8',
  disputed: '#7c3aed',
};

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    width: '720px', maxHeight: '80vh', overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '10px 12px', textAlign: 'left' as const,
    background: '#f8fafc', fontWeight: '600', color: '#475569',
    fontSize: '12px', textTransform: 'uppercase' as const,
    borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontSize: '14px' },
  empty: { padding: '10px 12px', color: '#94a3b8', textAlign: 'center' as const },
};

export default function APVendorDetailModal({ vendorName, invoices, onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{vendorName} — AP Invoices</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>AP #</th>
              <th style={styles.th}>Invoice #</th>
              <th style={styles.th}>Invoice Date</th>
              <th style={styles.th}>Due Date</th>
              <th style={styles.th}>Amount Due</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={styles.empty}>No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={styles.td}>{inv.ap_number}</td>
                  <td style={styles.td}>{inv.invoice_number ?? '—'}</td>
                  <td style={styles.td}>{inv.invoice_date}</td>
                  <td style={styles.td}>{inv.due_date}</td>
                  <td style={styles.td}>${parseFloat(inv.amount_due).toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                      fontSize: '12px', fontWeight: '600', color: '#fff',
                      background: statusColors[inv.status],
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AccountsPayablePage**

```typescript
// pos-client/src/pages/AccountsPayablePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAPData, clearError } from '../store/slices/accountsPayable.slice';
import type { APSummary } from '../types/accountsPayable.types';
import APVendorDetailModal from '../components/AccountsPayable/APVendorDetailModal';

const styles = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    background: '#fff', borderRadius: '8px', overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '12px 16px', textAlign: 'left' as const,
    background: '#f1f5f9', fontWeight: '600', color: '#475569',
    fontSize: '13px', textTransform: 'uppercase' as const,
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  clickableRow: { cursor: 'pointer' as const },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '12px 16px', marginBottom: '16px', color: '#dc2626',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  empty: { padding: '12px 16px', textAlign: 'center' as const, color: '#94a3b8' },
};

const amountColor = (amount: number) =>
  amount > 5000 ? '#dc2626' : amount > 0 ? '#f59e0b' : '#16a34a';

export default function AccountsPayablePage() {
  const dispatch = useAppDispatch();
  const { invoices, vendors, loading, error } = useAppSelector((state) => state.accountsPayable);
  const user = useAppSelector((state) => state.auth.user);
  const [modalVendorId, setModalVendorId] = useState<string | null>(null);

  if (user?.role === 'cashier') return <Navigate to="/pos" replace />;

  useEffect(() => {
    dispatch(fetchAPData());
  }, [dispatch]);

  const summaries = useMemo((): APSummary[] => {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.business_name]));
    const grouped = new Map<string, { total: number; dates: string[]; count: number }>();
    for (const inv of invoices) {
      const entry = grouped.get(inv.vendor_id) ?? { total: 0, dates: [], count: 0 };
      entry.total += parseFloat(inv.amount_due);
      entry.dates.push(inv.invoice_date);
      entry.count += 1;
      grouped.set(inv.vendor_id, entry);
    }
    return Array.from(grouped.entries())
      .map(([vendor_id, data]) => ({
        vendor_id,
        vendor_name: vendorMap.get(vendor_id) ?? vendor_id,
        total_outstanding: data.total,
        oldest_invoice_date: data.dates.reduce((a, b) => (a < b ? a : b)),
        invoice_count: data.count,
      }))
      .sort((a, b) => b.total_outstanding - a.total_outstanding);
  }, [invoices, vendors]);

  const modalInvoices = useMemo(
    () => (modalVendorId ? invoices.filter((inv) => inv.vendor_id === modalVendorId) : []),
    [invoices, modalVendorId]
  );
  const modalVendorName = summaries.find((s) => s.vendor_id === modalVendorId)?.vendor_name ?? '';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Accounts Payable</h1>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearError())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vendor</th>
              <th style={styles.th}>Outstanding Balance</th>
              <th style={styles.th}>Oldest Invoice</th>
              <th style={styles.th}>Open Invoices</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr><td colSpan={4} style={styles.empty}>No accounts payable records found.</td></tr>
            ) : (
              summaries.map((s) => (
                <tr
                  key={s.vendor_id}
                  style={styles.clickableRow}
                  onClick={() => setModalVendorId(s.vendor_id)}
                >
                  <td style={styles.td}>{s.vendor_name}</td>
                  <td style={{ ...styles.td, color: amountColor(s.total_outstanding), fontWeight: '600' }}>
                    ${s.total_outstanding.toFixed(2)}
                  </td>
                  <td style={styles.td}>{s.oldest_invoice_date}</td>
                  <td style={styles.td}>{s.invoice_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modalVendorId && (
        <APVendorDetailModal
          vendorName={modalVendorName}
          invoices={modalInvoices}
          onClose={() => setModalVendorId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pos-client/src/components/AccountsPayable/APVendorDetailModal.tsx pos-client/src/pages/AccountsPayablePage.tsx
git commit -m "feat(ap): add AccountsPayablePage and APVendorDetailModal"
```

---

## Task 6: VendorPaymentsPage + Modals

**Files:**
- Create: `pos-client/src/components/VendorPayments/ApprovePaymentModal.tsx`
- Create: `pos-client/src/components/VendorPayments/VoidPaymentModal.tsx`
- Create: `pos-client/src/pages/VendorPaymentsPage.tsx`

- [ ] **Step 1: Create ApprovePaymentModal**

```typescript
// pos-client/src/components/VendorPayments/ApprovePaymentModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { approvePaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props {
  payment: VendorPayment;
  vendorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

export default function ApprovePaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((state) => state.vendorPayments);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    const result = await dispatch(approvePaymentThunk(payment.id));
    if (approvePaymentThunk.fulfilled.match(result)) {
      onSuccess();
    } else {
      setError((result.payload as string) ?? 'Approval failed');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Approve Payment</h2>
        <p style={styles.subtitle}>This will mark the payment as cleared.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
          <div><strong>Method:</strong> {payment.payment_method.toUpperCase()}</div>
          {payment.reference_number && <div><strong>Reference:</strong> {payment.reference_number}</div>}
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none',
              background: actionLoading ? '#86efac' : '#16a34a',
              color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {actionLoading ? 'Approving...' : 'Approve Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create VoidPaymentModal**

```typescript
// pos-client/src/components/VendorPayments/VoidPaymentModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { voidPaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props {
  payment: VendorPayment;
  vendorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#f59e0b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' },
  textarea: {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid #e2e8f0', fontSize: '14px',
    resize: 'vertical' as const, minHeight: '80px', boxSizing: 'border-box' as const,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginTop: '8px' },
};

export default function VoidPaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((state) => state.vendorPayments);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVoid = async () => {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    const result = await dispatch(voidPaymentThunk({ id: payment.id, reason: reason.trim() }));
    if (voidPaymentThunk.fulfilled.match(result)) {
      onSuccess();
    } else {
      setError((result.payload as string) ?? 'Void failed');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Void Payment</h2>
        <p style={styles.subtitle}>This action cannot be undone.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
        </div>
        <div>
          <label style={styles.label}>Reason for voiding *</label>
          <textarea
            style={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason..."
            disabled={actionLoading}
          />
          {error && <div style={styles.error}>{error}</div>}
        </div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button
            onClick={handleVoid}
            disabled={actionLoading}
            style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none',
              background: actionLoading ? '#fca5a5' : '#ef4444',
              color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {actionLoading ? 'Voiding...' : 'Void Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create VendorPaymentsPage**

```typescript
// pos-client/src/pages/VendorPaymentsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchVendorPayments, setPage } from '../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../types/vendorPayments.types';
import ApprovePaymentModal from '../components/VendorPayments/ApprovePaymentModal';
import VoidPaymentModal from '../components/VendorPayments/VoidPaymentModal';

const statusColors: Record<VendorPayment['status'], string> = {
  pending: '#f59e0b',
  cleared: '#16a34a',
  void: '#94a3b8',
  cancelled: '#ef4444',
};

const styles = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  table: {
    width: '100%', borderCollapse: 'collapse' as const, background: '#fff',
    borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '12px 16px', textAlign: 'left' as const,
    background: '#f1f5f9', fontWeight: '600', color: '#475569',
    fontSize: '13px', textTransform: 'uppercase' as const,
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '12px 16px', marginBottom: '16px', color: '#dc2626',
  },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  empty: { padding: '12px 16px', textAlign: 'center' as const, color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
  pageInfo: { color: '#64748b', fontSize: '14px' },
};

export default function VendorPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, vendors, total, page, limit, loading, error } =
    useAppSelector((state) => state.vendorPayments);
  const user = useAppSelector((state) => state.auth.user);
  const [approveTarget, setApproveTarget] = useState<VendorPayment | null>(null);
  const [voidTarget, setVoidTarget] = useState<VendorPayment | null>(null);

  if (user?.role === 'cashier') return <Navigate to="/pos" replace />;

  useEffect(() => {
    dispatch(fetchVendorPayments({ page, limit }));
  }, [dispatch, page, limit]);

  const vendorMap = useMemo(
    () => new Map(vendors.map((v) => [v.id, v.business_name])),
    [vendors]
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSuccess = () => {
    setApproveTarget(null);
    setVoidTarget(null);
    dispatch(fetchVendorPayments({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Vendor Payments</h1>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

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
                <tr><td colSpan={7} style={styles.empty}>No payments found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.payment_number}</td>
                    <td style={styles.td}>{vendorMap.get(p.vendor_id) ?? p.vendor_id}</td>
                    <td style={styles.td}>${parseFloat(p.total_amount).toFixed(2)}</td>
                    <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                    <td style={styles.td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: '600', color: '#fff',
                        background: statusColors[p.status],
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>{p.payment_date}</td>
                    <td style={styles.td}>
                      {p.status === 'pending' && (
                        <button
                          onClick={() => setApproveTarget(p)}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }}
                        >
                          Approve
                        </button>
                      )}
                      {(p.status === 'pending' || p.status === 'cleared') && (
                        <button
                          onClick={() => setVoidTarget(p)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={styles.pagination}>
            <span style={styles.pageInfo}>{total} total</span>
            <button
              disabled={page <= 1}
              onClick={() => dispatch(setPage(page - 1))}
              style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#94a3b8' : '#1e293b' }}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => dispatch(setPage(page + 1))}
              style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: page >= totalPages ? '#94a3b8' : '#1e293b' }}
            >
              Next
            </button>
          </div>
        </>
      )}

      {approveTarget && (
        <ApprovePaymentModal
          payment={approveTarget}
          vendorName={vendorMap.get(approveTarget.vendor_id) ?? approveTarget.vendor_id}
          onClose={() => setApproveTarget(null)}
          onSuccess={handleSuccess}
        />
      )}

      {voidTarget && (
        <VoidPaymentModal
          payment={voidTarget}
          vendorName={vendorMap.get(voidTarget.vendor_id) ?? voidTarget.vendor_id}
          onClose={() => setVoidTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add \
  pos-client/src/components/VendorPayments/ApprovePaymentModal.tsx \
  pos-client/src/components/VendorPayments/VoidPaymentModal.tsx \
  pos-client/src/pages/VendorPaymentsPage.tsx
git commit -m "feat(ap): add VendorPaymentsPage with approve and void modals"
```

---

## Task 7: Register Routes

**Files:**
- Modify: `pos-client/src/App.tsx`

- [ ] **Step 1: Add Finance routes to App.tsx**

Add these two imports after the existing page imports:

```typescript
import AccountsPayablePage from './pages/AccountsPayablePage';
import VendorPaymentsPage from './pages/VendorPaymentsPage';
```

Add these two routes before `<Route path="/" element={<Navigate to="/login" />} />`:

```tsx
<Route
  path="/finance/accounts-payable"
  element={
    <PrivateRoute>
      <AccountsPayablePage />
    </PrivateRoute>
  }
/>
<Route
  path="/finance/vendor-payments"
  element={
    <PrivateRoute>
      <VendorPaymentsPage />
    </PrivateRoute>
  }
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Run all tests**

```bash
npm test -- --watchAll=false
```

Expected: all tests pass (existing + new AP/VP slice tests).

- [ ] **Step 4: Commit**

```bash
git add pos-client/src/App.tsx
git commit -m "feat(ap): register Finance routes in pos-client App.tsx"
```
