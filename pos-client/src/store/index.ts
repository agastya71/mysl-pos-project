import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import productsReducer from './slices/products.slice';
import cartReducer from './slices/cart.slice';
import checkoutReducer from './slices/checkout.slice';
import transactionsReducer from './slices/transactions.slice';
import customersReducer from './slices/customers.slice';
import categoriesReducer from './slices/categories.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    checkout: checkoutReducer,
    transactions: transactionsReducer,
    customers: customersReducer,
    categories: categoriesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
