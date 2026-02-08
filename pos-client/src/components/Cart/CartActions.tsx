/**
 * @fileoverview CartActions Component - Cart action buttons (Clear and Checkout)
 *
 * Provides Clear Cart and Checkout buttons for cart management.
 * Both buttons disabled when cart is empty.
 *
 * @module components/Cart/CartActions
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';

/**
 * CartActions component props
 *
 * @interface CartActionsProps
 * @property {boolean} hasItems - Whether cart has items (enables/disables buttons)
 * @property {function} onClearCart - Callback to clear all cart items
 * @property {function} onCheckout - Callback to initiate checkout flow
 */
interface CartActionsProps {
  hasItems: boolean;
  onClearCart: () => void;
  onCheckout: () => void;
}

/**
 * CartActions Component
 *
 * Action buttons for cart: Clear Cart (left) and Checkout (right).
 * Both buttons disabled when cart empty (hasItems = false).
 *
 * @component
 * @param {CartActionsProps} props - Component props
 * @returns {JSX.Element} Cart action buttons
 *
 * @example
 * <CartActions
 *   hasItems={cartItems.length > 0}
 *   onClearCart={handleClearCart}
 *   onCheckout={handleCheckout}
 * />
 */
const CartActions: React.FC<CartActionsProps> = ({ hasItems, onClearCart, onCheckout }) => {
  return (
    <div style={styles.container}>
      <button
        onClick={onClearCart}
        disabled={!hasItems}
        style={{
          ...styles.button,
          ...styles.clearButton,
          ...(hasItems ? {} : styles.buttonDisabled),
        }}
      >
        Clear Cart
      </button>
      <button
        onClick={onCheckout}
        disabled={!hasItems}
        style={{
          ...styles.button,
          ...styles.checkoutButton,
          ...(hasItems ? {} : styles.buttonDisabled),
        }}
      >
        Checkout
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #e0e0e0',
  },
  button: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    color: '#333',
    border: '1px solid #ddd',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CartActions;
