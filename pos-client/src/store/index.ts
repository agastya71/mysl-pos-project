import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import productsReducer from './slices/products.slice';
import cartReducer from './slices/cart.slice';
import checkoutReducer from './slices/checkout.slice';
import transactionsReducer from './slices/transactions.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    checkout: checkoutReducer,
    transactions: transactionsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
