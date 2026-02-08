/**
 * @fileoverview Checkout Redux Slice - Manages payment collection and transaction completion
 *
 * This slice handles the checkout process for point-of-sale transactions:
 * - Payment collection (cash, credit card, debit card, check)
 * - Split payment support (multiple payment methods per transaction)
 * - Automatic change calculation for cash payments
 * - Transaction creation and submission to backend
 * - Post-checkout cart clearing
 *
 * Checkout flow:
 * 1. User adds cart items (managed in cart.slice)
 * 2. User opens checkout modal and adds payments
 * 3. Each payment added updates totalPaid
 * 4. When totalPaid >= amountDue, user can complete checkout
 * 5. completeCheckout thunk sends transaction to backend
 * 6. On success: cart cleared, transaction stored, receipt displayed
 *
 * Payment methods supported (MVP):
 * - Cash (with change calculation)
 * - Credit card (placeholder - integration needed)
 * - Debit card (placeholder - integration needed)
 * - Check (placeholder)
 *
 * @module store/slices/checkout
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @requires uuid - Unique ID generation for payments
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

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

/**
 * Payment input interface for checkout
 *
 * Represents a single payment method applied to the transaction.
 * Multiple payments can be added (split payment).
 *
 * @interface PaymentInput
 * @property {string} id - Unique ID for this payment (generated with uuid)
 * @property {'cash' | 'credit_card' | 'debit_card' | 'check'} payment_method - Payment method type
 * @property {number} amount - Amount to charge this payment method
 * @property {object} [payment_details] - Optional payment-specific details
 * @property {number} [payment_details.cash_received] - Cash received from customer (for cash payments)
 * @property {number} [payment_details.cash_change] - Change to give customer (auto-calculated)
 * @property {string} [payment_details.card_last_four] - Last 4 digits of card (for card payments)
 * @property {string} [payment_details.card_type] - Card type: Visa, Mastercard, etc. (for card payments)
 * @property {string} [payment_details.check_number] - Check number (for check payments)
 */
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

/**
 * Checkout state interface
 *
 * Manages payment collection state during checkout process.
 *
 * @interface CheckoutState
 * @property {PaymentInput[]} payments - Array of payments added so far
 * @property {number} totalPaid - Sum of all payment amounts
 * @property {number} amountDue - Total amount owed (from cart total)
 * @property {boolean} isProcessing - True while transaction is being submitted
 * @property {string | null} error - Error message if checkout fails
 * @property {TransactionWithDetails} [completedTransaction] - Completed transaction details (for receipt)
 */
export interface CheckoutState {
  payments: PaymentInput[];
  totalPaid: number;
  amountDue: number;
  isProcessing: boolean;
  error: string | null;
  completedTransaction?: TransactionWithDetails;
}

// Initial empty checkout state
const initialState: CheckoutState = {
  payments: [],
  totalPaid: 0,
  amountDue: 0,
  isProcessing: false,
  error: null,
};

/**
 * Async thunk: Complete checkout and create transaction
 *
 * Submits the transaction to the backend with all cart items and payments.
 * On success, dispatches clearCart action to reset cart for next transaction.
 *
 * This implements the MVP single-operation checkout:
 * - No draft → complete flow
 * - Transaction created and completed atomically
 * - Inventory automatically deducted via database trigger
 *
 * Flow:
 * 1. Read cart items and checkout payments from Redux state
 * 2. Build CreateTransactionRequest with items and payments
 * 3. Submit to backend API (POST /api/v1/transactions)
 * 4. On success: dispatch clearCart and return transaction
 * 5. On failure: return error message via rejectWithValue
 *
 * @async
 * @function completeCheckout
 * @param {object} params - Checkout parameters
 * @param {string} params.terminal_id - UUID of terminal processing transaction
 * @param {string} [params.customer_id] - Optional UUID of customer
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<TransactionWithDetails>} Completed transaction with details
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Complete checkout from CheckoutModal
 * import { useAppDispatch, useAppSelector } from '../../store/hooks';
 * import { completeCheckout } from '../../store/slices/checkout.slice';
 *
 * const dispatch = useAppDispatch();
 * const user = useAppSelector((state) => state.auth.user);
 *
 * const result = await dispatch(completeCheckout({
 *   terminal_id: user!.assigned_terminal_id,
 *   customer_id: cart.customer_id
 * }));
 *
 * if (completeCheckout.fulfilled.match(result)) {
 *   console.log('Transaction complete:', result.payload.transaction_number);
 * } else {
 *   console.error('Checkout failed:', result.payload);
 * }
 *
 * @see CreateTransactionRequest interface in types/transaction.types.ts
 * @see transactionApi.createTransaction for backend API call
 */
export const completeCheckout = createAsyncThunk(
  'checkout/complete',
  async (
    { terminal_id, customer_id }: { terminal_id: string; customer_id?: string },
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      // Get current Redux state (cart items and payments)
      const state = getState() as RootState;
      const { cart, checkout } = state;

      // Build items array from cart (product_id, quantity, discount)
      const items = cart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount_amount: item.discount_amount,
      }));

      // Build payments array (payment_method, amount, details)
      const payments: CreatePaymentRequest[] = checkout.payments.map((payment) => ({
        payment_method: payment.payment_method,
        amount: payment.amount,
        payment_details: payment.payment_details,
      }));

      // Build transaction request
      const request: CreateTransactionRequest = {
        terminal_id,
        customer_id,
        items,
        payments,
      };

      // Submit transaction to backend (creates and completes atomically)
      const transaction = await transactionApi.createTransaction(request);

      // Clear cart after successful transaction (prepare for next sale)
      dispatch(clearCart());

      return transaction;
    } catch (error: any) {
      // Extract error message from API response
      return rejectWithValue(error.response?.data?.error?.message || 'Transaction failed');
    }
  }
);

/**
 * Checkout Redux Slice
 *
 * Manages checkout state with 6 synchronous reducers and 1 async thunk:
 * - addPayment: Add payment method with amount
 * - removePayment: Remove payment by ID
 * - updatePayment: Modify payment amount/details
 * - setAmountDue: Set total amount owed (from cart)
 * - clearCheckout: Reset checkout state
 * - clearError: Clear error message
 * - completeCheckout: Submit transaction (async)
 *
 * @slice checkout
 * @state CheckoutState
 */
const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    /**
     * Adds a payment to the checkout
     *
     * Creates a new payment with unique ID and adds to payments array.
     * Automatically calculates change for cash payments (cash_received - amount).
     * Updates totalPaid with new payment amount (rounded to 2 decimals).
     *
     * @param {CheckoutState} state - Current checkout state
     * @param {PayloadAction<Omit<PaymentInput, 'id'>>} action - Payment data (id will be auto-generated)
     *
     * @example
     * // Add cash payment
     * dispatch(addPayment({
     *   payment_method: 'cash',
     *   amount: 50.00,
     *   payment_details: {
     *     cash_received: 60.00
     *     // cash_change will be calculated automatically (10.00)
     *   }
     * }));
     *
     * @example
     * // Add credit card payment
     * dispatch(addPayment({
     *   payment_method: 'credit_card',
     *   amount: 75.50,
     *   payment_details: {
     *     card_last_four: '1234',
     *     card_type: 'Visa'
     *   }
     * }));
     */
    addPayment: (state, action: PayloadAction<Omit<PaymentInput, 'id'>>) => {
      // Create payment with auto-generated UUID
      const payment: PaymentInput = {
        id: uuidv4(),
        ...action.payload,
      };

      // Calculate change for cash payments (received - amount)
      if (payment.payment_method === 'cash' && payment.payment_details?.cash_received) {
        payment.payment_details.cash_change = payment.payment_details.cash_received - payment.amount;
      }

      // Add payment to array
      state.payments.push(payment);

      // Update total paid (rounded to 2 decimals)
      state.totalPaid = Math.round((state.totalPaid + payment.amount) * 100) / 100;
    },

    /**
     * Removes a payment from the checkout
     *
     * Finds payment by ID, subtracts amount from totalPaid, and removes from array.
     * If payment not found, no action taken.
     *
     * @param {CheckoutState} state - Current checkout state
     * @param {PayloadAction<string>} action - Payment ID to remove
     *
     * @example
     * // Remove payment
     * dispatch(removePayment('payment-uuid'));
     */
    removePayment: (state, action: PayloadAction<string>) => {
      const payment = state.payments.find((p) => p.id === action.payload);
      if (payment) {
        // Subtract payment amount from total (rounded to 2 decimals)
        state.totalPaid = Math.round((state.totalPaid - payment.amount) * 100) / 100;

        // Remove payment from array
        state.payments = state.payments.filter((p) => p.id !== action.payload);
      }
    },

    /**
     * Updates an existing payment's amount or details
     *
     * Supports partial updates - only provided fields are changed.
     * If amount is updated, recalculates totalPaid.
     * If cash payment and cash_received changes, recalculates change.
     *
     * @param {CheckoutState} state - Current checkout state
     * @param {PayloadAction<object>} action - Payment ID and updates
     * @param {string} action.payload.id - Payment ID to update
     * @param {Partial<PaymentInput>} action.payload.updates - Fields to update
     *
     * @example
     * // Update payment amount
     * dispatch(updatePayment({
     *   id: 'payment-uuid',
     *   updates: { amount: 100.00 }
     * }));
     *
     * @example
     * // Update cash received (change will be recalculated)
     * dispatch(updatePayment({
     *   id: 'payment-uuid',
     *   updates: {
     *     payment_details: { cash_received: 120.00 }
     *   }
     * }));
     */
    updatePayment: (state, action: PayloadAction<{ id: string; updates: Partial<PaymentInput> }>) => {
      const { id, updates } = action.payload;
      const payment = state.payments.find((p) => p.id === id);

      if (payment) {
        // Store old amount for totalPaid adjustment
        const oldAmount = payment.amount;

        // Apply partial updates to payment
        Object.assign(payment, updates);

        // Recalculate totalPaid if amount changed
        if (updates.amount !== undefined) {
          state.totalPaid = Math.round((state.totalPaid - oldAmount + updates.amount) * 100) / 100;
        }

        // Recalculate change for cash payments
        if (payment.payment_method === 'cash' && payment.payment_details?.cash_received) {
          payment.payment_details.cash_change = payment.payment_details.cash_received - payment.amount;
        }
      }
    },

    /**
     * Sets the total amount due (from cart total)
     *
     * Called when checkout modal opens to set the target amount that needs
     * to be collected via payments.
     *
     * @param {CheckoutState} state - Current checkout state
     * @param {PayloadAction<number>} action - Total amount due
     *
     * @example
     * // Set amount due from cart total
     * dispatch(setAmountDue(cart.total_amount));
     */
    setAmountDue: (state, action: PayloadAction<number>) => {
      state.amountDue = action.payload;
    },

    /**
     * Clears checkout state (resets to initial)
     *
     * Removes all payments, resets totals to 0, clears error and completed
     * transaction. Used when canceling checkout or starting a new transaction.
     *
     * @param {CheckoutState} state - Current checkout state
     *
     * @example
     * // Cancel checkout
     * dispatch(clearCheckout());
     */
    clearCheckout: (state) => {
      state.payments = [];
      state.totalPaid = 0;
      state.amountDue = 0;
      state.error = null;
      state.completedTransaction = undefined;
    },

    /**
     * Clears checkout error message
     *
     * Resets error state after displaying error to user or before retrying.
     *
     * @param {CheckoutState} state - Current checkout state
     *
     * @example
     * // Clear error before retry
     * dispatch(clearError());
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // CompleteCheckout: pending - set processing state
      .addCase(completeCheckout.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      // CompleteCheckout: fulfilled - store transaction and reset checkout
      .addCase(completeCheckout.fulfilled, (state, action: PayloadAction<TransactionWithDetails>) => {
        state.isProcessing = false;
        state.completedTransaction = action.payload;
        // Clear payments and totals (ready for next transaction)
        state.payments = [];
        state.totalPaid = 0;
        state.amountDue = 0;
        state.error = null;
      })
      // CompleteCheckout: rejected - set error state
      .addCase(completeCheckout.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { addPayment, removePayment, updatePayment, setAmountDue, clearCheckout, clearError } =
  checkoutSlice.actions;
export default checkoutSlice.reducer;
