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
