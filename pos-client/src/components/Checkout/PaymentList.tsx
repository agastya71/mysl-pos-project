/**
 * @fileoverview PaymentList Component - List of added payments with remove buttons
 *
 * Displays list of payments added to checkout with method label, amount, and remove button.
 * Returns null when no payments (hidden state).
 *
 * @module components/Checkout/PaymentList
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { PaymentInput } from '../../store/slices/checkout.slice';

/**
 * PaymentList component props
 *
 * @interface PaymentListProps
 * @property {PaymentInput[]} payments - Array of added payments
 * @property {function} onRemove - Callback when payment removed (receives payment ID)
 */
interface PaymentListProps {
  payments: PaymentInput[];
  onRemove: (id: string) => void;
}

/**
 * PaymentList Component
 *
 * Displays list of payments added to current transaction.
 * Each payment shows method label, amount, and remove button.
 *
 * Features:
 * - Hidden when no payments (returns null)
 * - Shows "Added Payments" header when payments exist
 * - Each payment: method label, amount (green, bold), remove button (red X)
 * - Method labels: cash → "Cash", credit_card → "Credit Card", etc.
 *
 * @component
 * @param {PaymentListProps} props - Component props
 * @returns {JSX.Element | null} Payment list or null if no payments
 *
 * @example
 * // Basic usage in CheckoutModal
 * <PaymentList
 *   payments={checkout.payments}
 *   onRemove={(id) => dispatch(removePayment(id))}
 * />
 *
 * @example
 * // With payments
 * // Shows: Cash $50.00 [✕]
 * //        Credit Card $25.50 [✕]
 *
 * @example
 * // Without payments
 * // Renders: null (component hidden)
 *
 * @see {@link CheckoutModal} - Parent component
 */
const PaymentList: React.FC<PaymentListProps> = ({ payments, onRemove }) => {
  if (payments.length === 0) {
    return null;
  }

  /**
   * Get human-readable label for payment method
   * Converts method codes to display labels
   *
   * @param {string} method - Payment method code (cash, credit_card, etc.)
   * @returns {string} Display label (Cash, Credit Card, etc.)
   */
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'credit_card':
        return 'Credit Card';
      case 'debit_card':
        return 'Debit Card';
      case 'check':
        return 'Check';
      default:
        return method;
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Added Payments</h3>
      {/* List of payment items with remove buttons */}
      <div style={styles.list}>
        {payments.map((payment) => (
          <div key={payment.id} style={styles.paymentItem}>
            {/* Payment info: method label and amount */}
            <div style={styles.paymentInfo}>
              <span style={styles.method}>{getMethodLabel(payment.payment_method)}</span>
              <span style={styles.amount}>${Number(payment.amount).toFixed(2)}</span>
            </div>
            {/* Remove button (red X) */}
            <button onClick={() => onRemove(payment.id)} style={styles.removeButton}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '1.5rem',
  },
  title: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#666',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  },
  paymentInfo: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flex: 1,
  },
  method: {
    fontSize: '0.875rem',
    color: '#666',
  },
  amount: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#28a745',
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

export default PaymentList;
