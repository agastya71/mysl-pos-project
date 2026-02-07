import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import productReducer from './slices/product.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    product: productReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
