import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import {
  TransactionWithDetails,
  CreateTransactionRequest,
  CreatePaymentRequest,
} from '../../types/transaction.types';
import { transactionApi } from '../../services/api/transaction.api';
import { RootState } from '../index';
import { clearCart } from './cart.slice';

export interface PaymentInput {
  id: string;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'check';
  amount: number;
  payment_details?: {
    cash_received?: number;
    cash_change?: number;
    card_last_four?: string;
    card_type?: string;
    check_number?: string;
  };
}

export interface CheckoutState {
  payments: PaymentInput[];
  totalPaid: number;
  amountDue: number;
  isProcessing: boolean;
  error: string | null;
  completedTransaction?: TransactionWithDetails;
}

const initialState: CheckoutState = {
  payments: [],
  totalPaid: 0,
  amountDue: 0,
  isProcessing: false,
  error: null,
};

export const completeCheckout = createAsyncThunk(
  'checkout/complete',
  async (
    { terminal_id, customer_id }: { terminal_id: string; customer_id?: string },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const { cart, checkout } = state;

      // Build items array from cart
      const items = cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount_amount: item.discount_amount,
      }));

      // Build payments array
      const payments: CreatePaymentRequest[] = checkout.payments.map((payment) => ({
        payment_method: payment.payment_method,
        amount: payment.amount,
        payment_details: payment.payment_details,
      }));

      const request: CreateTransactionRequest = {
        terminal_id,
        customer_id,
        items,
        payments,
      };

      const transaction = await transactionApi.createTransaction(request);

      // Clear cart after successful transaction
      dispatch(clearCart());

      return transaction;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Transaction failed');
    }
  }
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    addPayment: (state, action: PayloadAction<Omit<PaymentInput, 'id'>>) => {
      const payment: PaymentInput = {
        id: uuidv4(),
        ...action.payload,
      };

      // Calculate change for cash payments
      if (payment.payment_method === 'cash' && payment.payment_details?.cash_received) {
        payment.payment_details.cash_change = payment.payment_details.cash_received - payment.amount;
      }

      state.payments.push(payment);
      state.totalPaid = Math.round((state.totalPaid + payment.amount) * 100) / 100;
    },

    removePayment: (state, action: PayloadAction<string>) => {
      const payment = state.payments.find((p) => p.id === action.payload);
      if (payment) {
        state.totalPaid = Math.round((state.totalPaid - payment.amount) * 100) / 100;
        state.payments = state.payments.filter((p) => p.id !== action.payload);
      }
    },

    updatePayment: (state, action: PayloadAction<{ id: string; updates: Partial<PaymentInput> }>) => {
      const { id, updates } = action.payload;
      const payment = state.payments.find((p) => p.id === id);

      if (payment) {
        const oldAmount = payment.amount;
        Object.assign(payment, updates);

        if (updates.amount !== undefined) {
          state.totalPaid = Math.round((state.totalPaid - oldAmount + updates.amount) * 100) / 100;
        }

        // Recalculate change for cash payments
        if (payment.payment_method === 'cash' && payment.payment_details?.cash_received) {
          payment.payment_details.cash_change = payment.payment_details.cash_received - payment.amount;
        }
      }
    },

    setAmountDue: (state, action: PayloadAction<number>) => {
      state.amountDue = action.payload;
    },

    clearCheckout: (state) => {
      state.payments = [];
      state.totalPaid = 0;
      state.amountDue = 0;
      state.error = null;
      state.completedTransaction = undefined;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(completeCheckout.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(completeCheckout.fulfilled, (state, action: PayloadAction<TransactionWithDetails>) => {
        state.isProcessing = false;
        state.completedTransaction = action.payload;
        state.payments = [];
        state.totalPaid = 0;
        state.amountDue = 0;
        state.error = null;
      })
      .addCase(completeCheckout.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { addPayment, removePayment, updatePayment, setAmountDue, clearCheckout, clearError } =
  checkoutSlice.actions;
export default checkoutSlice.reducer;
