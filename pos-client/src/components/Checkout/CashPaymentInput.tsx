/**
 * @fileoverview CashPaymentInput Component - Cash payment input form with change calculation
 *
 * Interactive form for collecting cash payments with quick amount buttons,
 * real-time change calculation, and validation.
 *
 * @module components/Checkout/CashPaymentInput
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState, useEffect } from 'react';

/**
 * CashPaymentInput component props
 *
 * @interface CashPaymentInputProps
 * @property {number} amount - Amount due (payment amount to collect)
 * @property {function} onPaymentAdded - Callback when payment submitted (cashReceived, amount)
 */
interface CashPaymentInputProps {
  amount: number;
  onPaymentAdded: (cashReceived: number, amount: number) => void;
}

/**
 * CashPaymentInput Component
 *
 * Cash payment form with quick amount buttons and automatic change calculation.
 * Used in CheckoutModal when cash payment method is selected.
 *
 * Features:
 * - Shows amount due prominently
 * - Manual cash received input (numeric, 2 decimal places)
 * - Quick amount buttons ($5, $10, $20, $50, $100)
 * - Real-time change calculation (green if positive, red if negative)
 * - Submit button enabled only when received ≥ amount due
 * - Clears input after successful payment addition
 *
 * Change Calculation:
 * - change = cashReceived - amount
 * - Updates automatically when either value changes
 * - Shown only when cashReceived has value
 *
 * @component
 * @param {CashPaymentInputProps} props - Component props
 * @returns {JSX.Element} Cash payment input form
 *
 * @example
 * // Basic usage in CheckoutModal
 * <CashPaymentInput
 *   amount={42.50}
 *   onPaymentAdded={(received, amount) => {
 *     dispatch(addPayment({ payment_method: 'cash', amount, ... }));
 *   }}
 * />
 *
 * @example
 * // Flow: amount due = $42.50
 * // 1. User clicks $50 button → input shows 50.00
 * // 2. Change shows $7.50 (green)
 * // 3. User clicks Add Payment → payment added, input clears
 *
 * @see {@link CheckoutModal} - Parent component
 */
const CashPaymentInput: React.FC<CashPaymentInputProps> = ({ amount, onPaymentAdded }) => {
  const [cashReceived, setCashReceived] = useState('');
  const [change, setChange] = useState(0);

  /**
   * Calculate change automatically when cashReceived or amount changes
   * change = received - amount
   */
  useEffect(() => {
    const received = parseFloat(cashReceived) || 0;
    setChange(received - amount);
  }, [cashReceived, amount]);

  /**
   * Handle submitting payment
   * Validates received ≥ amount, calls onPaymentAdded, clears input
   */
  const handleSubmit = () => {
    const received = parseFloat(cashReceived) || 0;
    if (received >= amount) {
      onPaymentAdded(received, amount);
      setCashReceived('');
    }
  };

  /**
   * Handle quick amount button click
   * Sets cashReceived to predefined amount ($5, $10, $20, $50, $100)
   *
   * @param {number} quickAmount - Quick amount value
   */
  const handleQuickAmount = (quickAmount: number) => {
    setCashReceived(quickAmount.toString());
  };

  // Submit button enabled only when received ≥ amount due
  const canSubmit = parseFloat(cashReceived) >= amount;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Cash Payment</h3>

      {/* Amount Due display */}
      <div style={styles.field}>
        <label style={styles.label}>Amount Due:</label>
        <span style={styles.amountDue}>${Number(amount).toFixed(2)}</span>
      </div>

      {/* Cash Received input (numeric, 2 decimals) */}
      <div style={styles.field}>
        <label style={styles.label}>Cash Received:</label>
        <input
          type="number"
          value={cashReceived}
          onChange={(e) => setCashReceived(e.target.value)}
          placeholder="0.00"
          step="0.01"
          style={styles.input}
        />
      </div>

      {/* Quick amount buttons ($5, $10, $20, $50, $100) */}
      <div style={styles.quickAmounts}>
        {[5, 10, 20, 50, 100].map((quickAmount) => (
          <button
            key={quickAmount}
            onClick={() => handleQuickAmount(quickAmount)}
            style={styles.quickButton}
          >
            ${quickAmount}
          </button>
        ))}
      </div>

      {/* Change display (green if positive, red if negative) */}
      {cashReceived && (
        <div style={styles.field}>
          <label style={styles.label}>Change:</label>
          <span style={{...styles.change, color: change >= 0 ? '#28a745' : '#dc3545'}}>
            ${Number(change).toFixed(2)}
          </span>
        </div>
      )}

      {/* Add Payment button (enabled when received ≥ amount) */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          ...styles.submitButton,
          ...(canSubmit ? {} : styles.submitButtonDisabled),
        }}
      >
        Add Payment
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  field: {
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.875rem',
    color: '#666',
    fontWeight: 500,
  },
  amountDue: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#007bff',
  },
  input: {
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '150px',
    textAlign: 'right' as const,
  },
  quickAmounts: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  quickButton: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  change: {
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  submitButton: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CashPaymentInput;
