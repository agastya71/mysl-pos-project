/**
 * @fileoverview CartPanel Component - Complete shopping cart panel for POS
 *
 * Main cart container combining all cart-related components.
 * Manages cart state, item operations, and checkout flow.
 *
 * @module components/Cart/CartPanel
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateQuantity, removeFromCart, clearCart } from '../../store/slices/cart.slice';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import CartActions from './CartActions';

/**
 * CartPanel component props
 *
 * @interface CartPanelProps
 * @property {function} onCheckout - Callback when user clicks Checkout button
 */
interface CartPanelProps {
  onCheckout: () => void;
}

/**
 * CartPanel Component
 *
 * Right panel in POS interface showing complete shopping cart.
 * Combines CartItem list, CartSummary, and CartActions into unified panel.
 *
 * Features:
 * - Header showing item count
 * - Scrollable items list with quantity controls
 * - Empty state with helpful hint
 * - Financial summary (subtotal, tax, discount, total)
 * - Action buttons (Clear Cart with confirmation, Checkout)
 * - Redux integration for cart state management
 *
 * @component
 * @param {CartPanelProps} props - Component props
 * @returns {JSX.Element} Complete cart panel
 *
 * @example
 * // Used in POSPage
 * <div style={{ display: 'flex' }}>
 *   <ProductPanel />
 *   <CartPanel onCheckout={() => setShowCheckout(true)} />
 * </div>
 *
 * @example
 * // Cart with items
 * // Shows: header, scrollable items, summary, actions
 *
 * @example
 * // Empty cart
 * // Shows: "Cart is empty" message with hint
 *
 * @see {@link CartItem} - Individual cart line items
 * @see {@link CartSummary} - Financial breakdown
 * @see {@link CartActions} - Action buttons
 */
const CartPanel: React.FC<CartPanelProps> = ({ onCheckout }) => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);

  /**
   * Handle quantity update for cart item
   * Dispatches Redux action to update item quantity
   *
   * @param {string} product_id - Product ID to update
   * @param {number} quantity - New quantity value
   */
  const handleUpdateQuantity = (product_id: string, quantity: number) => {
    dispatch(updateQuantity({ product_id, quantity }));
  };

  /**
   * Handle remove item from cart
   * Dispatches Redux action to remove item completely
   *
   * @param {string} product_id - Product ID to remove
   */
  const handleRemove = (product_id: string) => {
    dispatch(removeFromCart(product_id));
  };

  /**
   * Handle clear all items from cart
   * Shows confirmation dialog before clearing
   * Prevents accidental cart clearing
   */
  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the cart?')) {
      dispatch(clearCart());
    }
  };

  return (
    <div style={styles.container}>
      {/* Header: Title and item count badge */}
      <div style={styles.header}>
        <h2 style={styles.title}>Shopping Cart</h2>
        <span style={styles.itemCount}>
          {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Scrollable items list or empty state */}
      <div style={styles.itemsContainer}>
        {cart.items.length === 0 ? (
          <div style={styles.empty}>
            <p>Cart is empty</p>
            <p style={styles.emptyHint}>Search and add products to start</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <CartItem
              key={item.product_id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {/* Financial summary section */}
      <CartSummary
        subtotal={cart.subtotal}
        tax_amount={cart.tax_amount}
        discount_amount={cart.discount_amount}
        total_amount={cart.total_amount}
      />

      {/* Action buttons (Clear and Checkout) */}
      <CartActions
        hasItems={cart.items.length > 0}
        onClearCart={handleClearCart}
        onCheckout={onCheckout}
      />
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'white',
  },
  header: {
    padding: '1rem',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  itemCount: {
    fontSize: '0.875rem',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
  },
  itemsContainer: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#999',
  },
  emptyHint: {
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
};

export default CartPanel;
