/**
 * @fileoverview Shopping Cart Redux Slice - Manages POS cart state
 *
 * This slice handles all shopping cart operations for the point-of-sale system.
 * It manages cart items, quantities, discounts, and automatically calculates
 * taxes and totals with every change.
 *
 * Key features:
 * - Add products to cart (increments quantity if already exists)
 * - Update item quantities (removes item if quantity set to 0)
 * - Apply line-item discounts
 * - Automatic tax calculation based on product tax rate
 * - Automatic subtotal, tax, and total recalculation
 * - Customer association with cart
 * - Cart clearing for next transaction
 *
 * Calculation order:
 * 1. Line total = (quantity × unit_price) - discount
 * 2. Tax amount = line_total × (tax_rate / 100)
 * 3. Line total with tax = line_total + tax_amount
 * 4. Cart subtotal = Σ(quantity × unit_price)
 * 5. Cart tax = Σ(tax_amount)
 * 6. Cart total = subtotal + tax - discount
 *
 * All monetary values are rounded to 2 decimal places.
 *
 * @module store/slices/cart
 * @requires @reduxjs/toolkit - Redux state management with reducers
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../types/product.types';

/**
 * Shopping cart item interface
 *
 * Represents a single line item in the shopping cart with quantity,
 * pricing, discounts, and calculated tax/totals.
 *
 * @interface CartItem
 * @property {string} product_id - UUID of the product
 * @property {Product} product - Full product object (for display info)
 * @property {number} quantity - Number of units (must be > 0)
 * @property {number} unit_price - Price per unit (copied from product.base_price)
 * @property {number} discount_amount - Line-item discount in dollars
 * @property {number} tax_amount - Calculated tax for this line
 * @property {number} line_total - Total for this line including tax: (qty × price - discount) + tax
 */
export interface CartItem {
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

/**
 * Shopping cart state interface
 *
 * Contains cart items and aggregated totals (subtotal, tax, discount, total).
 * Optionally associates a customer with the cart for checkout.
 *
 * @interface CartState
 * @property {CartItem[]} items - Array of cart items
 * @property {number} subtotal - Sum of all (quantity × unit_price) before tax/discount
 * @property {number} tax_amount - Sum of all line tax amounts
 * @property {number} discount_amount - Sum of all line discounts
 * @property {number} total_amount - Final total: subtotal + tax - discount
 * @property {string | undefined} customer_id - Optional UUID of associated customer
 */
export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  customer_id?: string;
}

// Initial empty cart state
const initialState: CartState = {
  items: [],
  subtotal: 0,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 0,
};

/**
 * Calculates tax amount and line total for a cart item
 *
 * Calculation formula:
 * 1. Subtotal = (quantity × unit_price) - discount
 * 2. Tax = subtotal × (tax_rate / 100)
 * 3. Line total = subtotal + tax
 *
 * Both values are rounded to 2 decimal places.
 *
 * @param {number} quantity - Number of units
 * @param {number} unit_price - Price per unit
 * @param {number} discount - Line-item discount amount
 * @param {number} tax_rate - Tax rate as percentage (e.g., 8.5 for 8.5%)
 * @returns {object} Calculated tax and line total
 * @returns {number} returns.tax_amount - Calculated tax (rounded to 2 decimals)
 * @returns {number} returns.line_total - Line total including tax (rounded to 2 decimals)
 *
 * @example
 * const totals = calculateLineTotals(2, 10.00, 1.00, 8.5);
 * // Returns: { tax_amount: 1.62, line_total: 20.62 }
 * // Calculation: (2 × $10.00 - $1.00) × 0.085 = $1.615 → $1.62 tax
 * //              $19.00 + $1.62 = $20.62 total
 */
const calculateLineTotals = (
  quantity: number,
  unit_price: number,
  discount: number,
  tax_rate: number
): { tax_amount: number; line_total: number } => {
  // Calculate subtotal after discount
  const subtotal = quantity * unit_price - discount;

  // Calculate tax on discounted subtotal
  const tax_amount = subtotal * (tax_rate / 100);

  // Calculate line total including tax
  const line_total = subtotal + tax_amount;

  // Round to 2 decimal places to avoid floating point errors
  return {
    tax_amount: Math.round(tax_amount * 100) / 100,
    line_total: Math.round(line_total * 100) / 100,
  };
};

/**
 * Recalculates cart totals from all line items
 *
 * Aggregates subtotal, tax, and discount from all cart items and
 * calculates the final total amount. This function mutates the state
 * (safe within Redux Toolkit due to Immer).
 *
 * Called automatically after any cart item change (add, update, remove, discount).
 *
 * Calculation:
 * - Subtotal = Σ(quantity × unit_price) for all items
 * - Tax amount = Σ(tax_amount) for all items
 * - Discount amount = Σ(discount_amount) for all items
 * - Total amount = subtotal + tax - discount
 *
 * All values rounded to 2 decimal places.
 *
 * @param {CartState} state - Mutable cart state (Redux Toolkit + Immer)
 * @returns {void} Mutates state in place
 *
 * @example
 * // Called internally after adding item to cart
 * recalculateTotals(state);
 * // state.subtotal, state.tax_amount, state.total_amount now updated
 */
const recalculateTotals = (state: CartState) => {
  // Reset totals to 0
  state.subtotal = 0;
  state.tax_amount = 0;
  state.discount_amount = 0;

  // Sum all line items
  state.items.forEach((item) => {
    state.subtotal += item.unit_price * item.quantity;
    state.tax_amount += item.tax_amount;
    state.discount_amount += item.discount_amount;
  });

  // Round to 2 decimal places
  state.subtotal = Math.round(state.subtotal * 100) / 100;
  state.tax_amount = Math.round(state.tax_amount * 100) / 100;
  state.discount_amount = Math.round(state.discount_amount * 100) / 100;

  // Calculate final total
  state.total_amount = Math.round((state.subtotal + state.tax_amount - state.discount_amount) * 100) / 100;
};

/**
 * Shopping Cart Redux Slice
 *
 * Manages cart state with 6 synchronous reducers:
 * - addToCart: Add product or increment quantity
 * - updateQuantity: Change quantity (removes if 0)
 * - removeFromCart: Remove item by product_id
 * - applyDiscount: Set line-item discount
 * - setCustomer: Associate customer with cart
 * - clearCart: Reset to empty cart
 *
 * @slice cart
 * @state CartState
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Adds product to cart or increments quantity if already in cart
     *
     * If product already exists in cart, increments quantity. Otherwise,
     * creates new cart item with given quantity. Automatically recalculates
     * line totals (including tax) and cart totals.
     *
     * @param {CartState} state - Current cart state
     * @param {PayloadAction<object>} action - Product and quantity to add
     * @param {Product} action.payload.product - Product to add
     * @param {number} action.payload.quantity - Number of units to add (must be > 0)
     *
     * @example
     * // Add 2 units of a product
     * import { useAppDispatch } from '../../store/hooks';
     * import { addToCart } from '../../store/slices/cart.slice';
     *
     * const dispatch = useAppDispatch();
     * dispatch(addToCart({ product: productObj, quantity: 2 }));
     * // Cart item created with quantity=2, or existing quantity incremented by 2
     */
    addToCart: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload;

      // Check if product already in cart
      const existingItem = state.items.find((item) => item.product_id === product.id);

      if (existingItem) {
        // Product exists: increment quantity and recalculate line totals
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
        // New product: create cart item with base price
        const unit_price = product.base_price;
        const totals = calculateLineTotals(quantity, unit_price, 0, product.tax_rate);

        state.items.push({
          product_id: product.id,
          product,
          quantity,
          unit_price,
          discount_amount: 0, // No discount by default
          tax_amount: totals.tax_amount,
          line_total: totals.line_total,
        });
      }

      // Recalculate cart totals (subtotal, tax, total)
      recalculateTotals(state);
    },

    /**
     * Updates quantity of an existing cart item
     *
     * Changes the quantity of a cart item. If quantity is set to 0 or negative,
     * removes the item from cart. Automatically recalculates line totals and
     * cart totals.
     *
     * @param {CartState} state - Current cart state
     * @param {PayloadAction<object>} action - Product ID and new quantity
     * @param {string} action.payload.product_id - UUID of product to update
     * @param {number} action.payload.quantity - New quantity (removes if <= 0)
     *
     * @example
     * // Update quantity to 5
     * dispatch(updateQuantity({ product_id: 'product-uuid', quantity: 5 }));
     *
     * @example
     * // Remove item by setting quantity to 0
     * dispatch(updateQuantity({ product_id: 'product-uuid', quantity: 0 }));
     */
    updateQuantity: (state, action: PayloadAction<{ product_id: string; quantity: number }>) => {
      const { product_id, quantity } = action.payload;
      const item = state.items.find((item) => item.product_id === product_id);

      if (item) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          state.items = state.items.filter((item) => item.product_id !== product_id);
        } else {
          // Update quantity and recalculate line totals
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
        // Recalculate cart totals
        recalculateTotals(state);
      }
    },

    /**
     * Removes item from cart by product ID
     *
     * Filters out the cart item matching the given product_id and recalculates
     * cart totals.
     *
     * @param {CartState} state - Current cart state
     * @param {PayloadAction<string>} action - Product ID to remove
     *
     * @example
     * // Remove item from cart
     * dispatch(removeFromCart('product-uuid'));
     */
    removeFromCart: (state, action: PayloadAction<string>) => {
      // Filter out item by product_id
      state.items = state.items.filter((item) => item.product_id !== action.payload);

      // Recalculate cart totals
      recalculateTotals(state);
    },

    /**
     * Applies line-item discount to a cart item
     *
     * Sets discount amount for a specific cart item and recalculates line
     * totals (tax is calculated on discounted subtotal). Cart totals are
     * automatically recalculated.
     *
     * @param {CartState} state - Current cart state
     * @param {PayloadAction<object>} action - Product ID and discount amount
     * @param {string} action.payload.product_id - UUID of product to discount
     * @param {number} action.payload.amount - Discount amount in dollars (e.g., 5.00 for $5 off)
     *
     * @example
     * // Apply $5 discount to an item
     * dispatch(applyDiscount({ product_id: 'product-uuid', amount: 5.00 }));
     */
    applyDiscount: (state, action: PayloadAction<{ product_id: string; amount: number }>) => {
      const { product_id, amount } = action.payload;
      const item = state.items.find((item) => item.product_id === product_id);

      if (item) {
        // Set discount amount
        item.discount_amount = amount;

        // Recalculate line totals (tax is calculated on discounted subtotal)
        const totals = calculateLineTotals(
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.product.tax_rate
        );
        item.tax_amount = totals.tax_amount;
        item.line_total = totals.line_total;

        // Recalculate cart totals
        recalculateTotals(state);
      }
    },

    /**
     * Associates a customer with the cart
     *
     * Sets the customer_id for the current cart. This is used during checkout
     * to link the transaction to a customer record.
     *
     * @param {CartState} state - Current cart state
     * @param {PayloadAction<string | undefined>} action - Customer UUID or undefined to clear
     *
     * @example
     * // Set customer
     * dispatch(setCustomer('customer-uuid'));
     *
     * @example
     * // Clear customer
     * dispatch(setCustomer(undefined));
     */
    setCustomer: (state, action: PayloadAction<string | undefined>) => {
      state.customer_id = action.payload;
    },

    /**
     * Clears cart and resets to initial state
     *
     * Removes all items, resets all totals to 0, and clears customer association.
     * Typically called after successful checkout to prepare for next transaction.
     *
     * @param {CartState} state - Current cart state
     *
     * @example
     * // Clear cart after checkout
     * dispatch(clearCart());
     */
    clearCart: (state) => {
      // Reset all state to initial values
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
