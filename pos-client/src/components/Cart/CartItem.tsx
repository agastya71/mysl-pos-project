/**
 * @fileoverview CartItem Component - Individual line item in shopping cart
 *
 * Displays a cart item with product info, quantity controls, and remove button.
 * Provides increment/decrement buttons and manual quantity input.
 *
 * Features:
 * - Product name, SKU, unit price display
 * - Quantity controls: - button, manual input, + button
 * - Line total calculation (unit_price × quantity)
 * - Remove button (✕)
 * - Minimum quantity: 1 (decrement disabled at 1)
 * - Manual input validation (positive integers only)
 *
 * Quantity Behavior:
 * - Increment (+): Adds 1 to quantity
 * - Decrement (-): Subtracts 1 (disabled when quantity = 1)
 * - Manual input: Accepts positive integers, updates on valid input
 * - Invalid input: Ignored (NaN or <= 0)
 *
 * @module components/Cart/CartItem
 * @requires react
 * @requires ../../store/slices/cart.slice
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { CartItem as CartItemType } from '../../store/slices/cart.slice';

/**
 * CartItem component props
 *
 * @interface CartItemProps
 * @property {CartItemType} item - Cart item data (product, quantity, totals)
 * @property {function} onUpdateQuantity - Callback when quantity changes
 * @property {function} onRemove - Callback when item removed
 */
interface CartItemProps {
  /** Cart item data including product, quantity, unit_price, line_total */
  item: CartItemType;
  /** Callback fired when quantity updated (product_id, new quantity) */
  onUpdateQuantity: (product_id: string, quantity: number) => void;
  /** Callback fired when item removed (product_id) */
  onRemove: (product_id: string) => void;
}

/**
 * CartItem Component
 *
 * Line item in shopping cart with quantity controls and remove button.
 * Displays product info, allows quantity adjustment, shows line total.
 *
 * @component
 * @param {CartItemProps} props - Component props
 * @returns {JSX.Element} Rendered cart item
 *
 * @example
 * // Basic usage in CartPanel
 * <CartItem
 *   item={item}
 *   onUpdateQuantity={handleUpdateQuantity}
 *   onRemove={handleRemove}
 * />
 *
 * @example
 * // List of cart items
 * {cartItems.map(item => (
 *   <CartItem
 *     key={item.product_id}
 *     item={item}
 *     onUpdateQuantity={handleUpdateQuantity}
 *     onRemove={handleRemove}
 *   />
 * ))}
 */
const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const [quantity, setQuantity] = useState(item.quantity.toString());

  /**
   * Handle manual quantity input change
   * Validates input and updates quantity if valid positive integer
   */
  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdateQuantity(item.product_id, numValue);
    }
  };

  /**
   * Handle increment button (+)
   * Adds 1 to current quantity
   */
  const handleIncrement = () => {
    const newQuantity = item.quantity + 1;
    setQuantity(newQuantity.toString());
    onUpdateQuantity(item.product_id, newQuantity);
  };

  /**
   * Handle decrement button (-)
   * Subtracts 1 from current quantity (minimum: 1)
   */
  const handleDecrement = () => {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      setQuantity(newQuantity.toString());
      onUpdateQuantity(item.product_id, newQuantity);
    }
  };

  return (
    <div style={styles.container}>
      {/* Product info: Name, SKU, unit price */}
      <div style={styles.info}>
        <h4 style={styles.name}>{item.product.name}</h4>
        <p style={styles.sku}>SKU: {item.product.sku}</p>
        <p style={styles.price}>${Number(item.unit_price).toFixed(2)} each</p>
      </div>

      {/* Controls: Quantity adjustment + line total + remove */}
      <div style={styles.controls}>
        {/* Quantity controls: - [input] + */}
        <div style={styles.quantityControls}>
          <button onClick={handleDecrement} style={styles.quantityButton}>
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            style={styles.quantityInput}
            min="1"
          />
          <button onClick={handleIncrement} style={styles.quantityButton}>
            +
          </button>
        </div>

        {/* Line total and remove button */}
        <div style={styles.totals}>
          <p style={styles.lineTotal}>${Number(item.line_total).toFixed(2)}</p>
          <button onClick={() => onRemove(item.product_id)} style={styles.removeButton}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '0.75rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: '0 0 0.25rem 0',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sku: {
    fontSize: '0.75rem',
    color: '#666',
    margin: '0 0 0.25rem 0',
  },
  price: {
    fontSize: '0.75rem',
    color: '#666',
    margin: 0,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    alignItems: 'flex-end',
  },
  quantityControls: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
  },
  quantityButton: {
    width: '28px',
    height: '28px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  quantityInput: {
    width: '50px',
    padding: '0.25rem',
    textAlign: 'center' as const,
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  totals: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  lineTotal: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#007bff',
    margin: 0,
  },
  removeButton: {
    border: 'none',
    background: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.25rem',
    lineHeight: 1,
  },
};

export default CartItem;
