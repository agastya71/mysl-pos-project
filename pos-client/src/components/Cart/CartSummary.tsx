/**
 * @fileoverview CartSummary Component - Cart totals breakdown display
 *
 * Displays cart financial summary with subtotal, discount, tax, and total.
 * Shows discount only when applicable (discount_amount > 0).
 *
 * @module components/Cart/CartSummary
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';

/**
 * CartSummary component props
 *
 * @interface CartSummaryProps
 * @property {number} subtotal - Sum of all line totals before tax/discount
 * @property {number} tax_amount - Total tax amount
 * @property {number} discount_amount - Total discount amount (optional, shown if > 0)
 * @property {number} total_amount - Final total after tax and discount
 */
interface CartSummaryProps {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

/**
 * CartSummary Component
 *
 * Displays cart totals breakdown: subtotal, discount (if any), tax, total.
 * Used in CartPanel to show financial summary before checkout.
 *
 * @component
 * @param {CartSummaryProps} props - Cart totals
 * @returns {JSX.Element} Cart summary display
 *
 * @example
 * <CartSummary
 *   subtotal={100.00}
 *   tax_amount={8.00}
 *   discount_amount={10.00}
 *   total_amount={98.00}
 * />
 */
const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, tax_amount, discount_amount, total_amount }) => {
  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Subtotal:</span>
        <span style={styles.value}>${Number(subtotal).toFixed(2)}</span>
      </div>
      {discount_amount > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Discount:</span>
          <span style={{...styles.value, color: '#dc3545'}}>-${Number(discount_amount).toFixed(2)}</span>
        </div>
      )}
      <div style={styles.row}>
        <span style={styles.label}>Tax:</span>
        <span style={styles.value}>${Number(tax_amount).toFixed(2)}</span>
      </div>
      <div style={{...styles.row, ...styles.totalRow}}>
        <span style={styles.totalLabel}>Total:</span>
        <span style={styles.totalValue}>${Number(total_amount).toFixed(2)}</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    borderTop: '2px solid #e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    color: '#666',
  },
  value: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  totalRow: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #ddd',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  totalValue: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#007bff',
  },
};

export default CartSummary;
