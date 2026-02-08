/**
 * @fileoverview PaymentMethodSelector Component - Payment method selection buttons
 *
 * Grid of payment method buttons with icons and labels.
 * Shows visual selection state (active button highlighted).
 *
 * @module components/Checkout/PaymentMethodSelector
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';

/**
 * PaymentMethodSelector component props
 *
 * @interface PaymentMethodSelectorProps
 * @property {string} selectedMethod - Currently selected payment method
 * @property {function} onSelect - Callback when method selected
 */
interface PaymentMethodSelectorProps {
  selectedMethod: 'cash' | 'credit_card' | 'debit_card' | 'check';
  onSelect: (method: 'cash' | 'credit_card' | 'debit_card' | 'check') => void;
}

/**
 * PaymentMethodSelector Component
 *
 * Grid of payment method buttons (2 columns) with icons and labels.
 * Active method highlighted with blue border and background.
 *
 * Payment Methods:
 * - Cash (💵) - MVP implementation, shows CashPaymentInput when selected
 * - Credit Card (💳) - Placeholder, no input form yet
 * - Debit Card (💳) - Placeholder, no input form yet
 * - Check (📝) - Placeholder, no input form yet
 *
 * Visual States:
 * - Default: White background, gray border
 * - Active: Blue border (#007bff), light blue background (#e7f3ff)
 * - Hover: Transition effect (0.2s)
 *
 * @component
 * @param {PaymentMethodSelectorProps} props - Component props
 * @returns {JSX.Element} Payment method selector grid
 *
 * @example
 * // Basic usage in CheckoutModal
 * const [method, setMethod] = useState<'cash' | ...>('cash');
 * <PaymentMethodSelector
 *   selectedMethod={method}
 *   onSelect={setMethod}
 * />
 *
 * @example
 * // With conditional payment input
 * <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />
 * {selectedMethod === 'cash' && <CashPaymentInput ... />}
 * {selectedMethod === 'credit_card' && <p>Card payment coming soon</p>}
 *
 * @see {@link CheckoutModal} - Parent component
 * @see {@link CashPaymentInput} - Cash payment form (shown when cash selected)
 */
const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ selectedMethod, onSelect }) => {
  /**
   * Available payment methods with display data
   * Cash is only fully implemented method (MVP)
   */
  const methods = [
    { value: 'cash' as const, label: 'Cash', icon: '💵' },
    { value: 'credit_card' as const, label: 'Credit Card', icon: '💳' },
    { value: 'debit_card' as const, label: 'Debit Card', icon: '💳' },
    { value: 'check' as const, label: 'Check', icon: '📝' },
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Select Payment Method</h3>
      {/* Payment method buttons grid (2 columns) */}
      <div style={styles.methods}>
        {methods.map((method) => (
          <button
            key={method.value}
            onClick={() => onSelect(method.value)}
            style={{
              ...styles.methodButton,
              ...(selectedMethod === method.value ? styles.methodButtonActive : {}),
            }}
          >
            {/* Method icon (emoji) */}
            <span style={styles.icon}>{method.icon}</span>
            {/* Method label */}
            <span style={styles.label}>{method.label}</span>
          </button>
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
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  methods: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  methodButton: {
    padding: '1rem',
    backgroundColor: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  methodButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  icon: {
    fontSize: '2rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
};

export default PaymentMethodSelector;
