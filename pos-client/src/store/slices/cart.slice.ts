import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../types/product.types';

export interface CartItem {
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  customer_id?: string;
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 0,
};

const calculateLineTotals = (
  quantity: number,
  unit_price: number,
  discount: number,
  tax_rate: number
): { tax_amount: number; line_total: number } => {
  const subtotal = quantity * unit_price - discount;
  const tax_amount = subtotal * (tax_rate / 100);
  const line_total = subtotal + tax_amount;

  return {
    tax_amount: Math.round(tax_amount * 100) / 100,
    line_total: Math.round(line_total * 100) / 100,
  };
};

const recalculateTotals = (state: CartState) => {
  state.subtotal = 0;
  state.tax_amount = 0;
  state.discount_amount = 0;

  state.items.forEach((item) => {
    state.subtotal += item.unit_price * item.quantity;
    state.tax_amount += item.tax_amount;
    state.discount_amount += item.discount_amount;
  });

  state.subtotal = Math.round(state.subtotal * 100) / 100;
  state.tax_amount = Math.round(state.tax_amount * 100) / 100;
  state.discount_amount = Math.round(state.discount_amount * 100) / 100;
  state.total_amount = Math.round((state.subtotal + state.tax_amount - state.discount_amount) * 100) / 100;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.product_id === product.id);

      if (existingItem) {
        existingItem.quantity += quantity;
        const totals = calculateLineTotals(
          existingItem.quantity,
          existingItem.unit_price,
          existingItem.discount_amount,
          existingItem.product.tax_rate
        );
        existingItem.tax_amount = totals.tax_amount;
        existingItem.line_total = totals.line_total;
      } else {
        const unit_price = product.base_price;
        const totals = calculateLineTotals(quantity, unit_price, 0, product.tax_rate);

        state.items.push({
          product_id: product.id,
          product,
          quantity,
          unit_price,
          discount_amount: 0,
          tax_amount: totals.tax_amount,
          line_total: totals.line_total,
        });
      }

      recalculateTotals(state);
    },

    updateQuantity: (state, action: PayloadAction<{ product_id: string; quantity: number }>) => {
      const { product_id, quantity } = action.payload;
      const item = state.items.find((item) => item.product_id === product_id);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.product_id !== product_id);
        } else {
          item.quantity = quantity;
          const totals = calculateLineTotals(
            item.quantity,
            item.unit_price,
            item.discount_amount,
            item.product.tax_rate
          );
          item.tax_amount = totals.tax_amount;
          item.line_total = totals.line_total;
        }
        recalculateTotals(state);
      }
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.product_id !== action.payload);
      recalculateTotals(state);
    },

    applyDiscount: (state, action: PayloadAction<{ product_id: string; amount: number }>) => {
      const { product_id, amount } = action.payload;
      const item = state.items.find((item) => item.product_id === product_id);

      if (item) {
        item.discount_amount = amount;
        const totals = calculateLineTotals(
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.product.tax_rate
        );
        item.tax_amount = totals.tax_amount;
        item.line_total = totals.line_total;
        recalculateTotals(state);
      }
    },

    setCustomer: (state, action: PayloadAction<string | undefined>) => {
      state.customer_id = action.payload;
    },

    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.tax_amount = 0;
      state.discount_amount = 0;
      state.total_amount = 0;
      state.customer_id = undefined;
    },
  },
});

export const { addToCart, updateQuantity, removeFromCart, applyDiscount, setCustomer, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
