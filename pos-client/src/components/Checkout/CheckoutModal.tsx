/**
 * @fileoverview CheckoutModal Component - Complete checkout flow modal
 *
 * Full-featured checkout modal managing payments, customer selection, and transaction completion.
 * Supports multiple payment methods, calculates change, shows receipt, and handles errors.
 *
 * @module components/Checkout/CheckoutModal
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addPayment,
  removePayment,
  setAmountDue,
  clearCheckout,
  completeCheckout,
} from '../../store/slices/checkout.slice';
import { clearSearchResults, fetchProducts } from '../../store/slices/products.slice';
import PaymentMethodSelector from './PaymentMethodSelector';
import CashPaymentInput from './CashPaymentInput';
import PaymentList from './PaymentList';
import CustomerSelector from '../Customer/CustomerSelector';
import { CustomerSearchResult } from '../../types/customer.types';

/**
 * CheckoutModal component props
 *
 * @interface CheckoutModalProps
 * @property {boolean} isOpen - Whether modal is visible
 * @property {function} onClose - Callback when modal closes
 */
interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CheckoutModal Component
 *
 * Full-screen modal managing complete checkout flow for POS transactions.
 * Handles payment collection, customer assignment, transaction completion, and receipt display.
 *
 * Features:
 * - Multi-step checkout flow (payment → complete → receipt)
 * - Customer selection (optional)
 * - Multiple payment methods (cash MVP, others placeholders)
 * - Real-time amount due calculation
 * - Payment list with remove capability
 * - Complete Transaction button (enabled when paid in full)
 * - Success receipt with transaction number
 * - New Transaction flow (clears cart, refreshes products)
 * - Click outside to close (with confirmation)
 * - Error display for failed transactions
 *
 * State Management:
 * - Uses checkout slice for payments, amount due, transaction completion
 * - Uses cart slice for transaction totals
 * - Uses auth slice for terminal_id
 *
 * @component
 * @param {CheckoutModalProps} props - Component props
 * @returns {JSX.Element | null} Checkout modal or null when closed
 *
 * @example
 * // Basic usage in POSPage
 * const [showCheckout, setShowCheckout] = useState(false);
 * <CheckoutModal
 *   isOpen={showCheckout}
 *   onClose={() => setShowCheckout(false)}
 * />
 *
 * @example
 * // Payment flow
 * // 1. Modal opens with cart total
 * // 2. Optionally select customer
 * // 3. Add payments until amount due = 0
 * // 4. Click Complete Transaction
 * // 5. Receipt shown with transaction number
 * // 6. Click New Transaction to clear and start fresh
 *
 * @see {@link PaymentMethodSelector} - Payment method buttons
 * @see {@link CashPaymentInput} - Cash payment form
 * @see {@link PaymentList} - List of added payments
 * @see {@link CustomerSelector} - Customer search and selection
 */
const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);
  const checkout = useAppSelector((state) => state.checkout);
  const auth = useAppSelector((state) => state.auth);
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'check'>('cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);

  /**
   * Calculate and update amount due when modal opens or totals change
   * Ensures amount due never goes negative
   */
  useEffect(() => {
    if (isOpen) {
      const due = Math.max(0, cart.total_amount - checkout.totalPaid);
      dispatch(setAmountDue(due));
    }
  }, [isOpen, cart.total_amount, checkout.totalPaid, dispatch]);

  /**
   * Show receipt automatically when transaction completes successfully
   */
  useEffect(() => {
    if (checkout.completedTransaction) {
      setShowReceipt(true);
    }
  }, [checkout.completedTransaction]);

  if (!isOpen) return null;

  /**
   * Handle adding cash payment
   * Calculates change automatically (change = received - amount)
   *
   * @param {number} cashReceived - Cash received from customer
   * @param {number} amount - Payment amount to apply (may be less than received)
   */
  const handleAddCashPayment = (cashReceived: number, amount: number) => {
    dispatch(
      addPayment({
        payment_method: 'cash',
        amount,
        payment_details: {
          cash_received: cashReceived,
          cash_change: cashReceived - amount,
        },
      })
    );
  };

  /**
   * Handle removing payment from list
   * Recalculates amount due automatically via Redux
   *
   * @param {string} id - Payment ID (UUID)
   */
  const handleRemovePayment = (id: string) => {
    dispatch(removePayment(id));
  };

  /**
   * Handle completing transaction
   * Validates payment complete (amount due ≤ 0.01) and terminal assigned
   * Creates transaction via API, shows receipt on success
   *
   * @async
   */
  const handleCompleteTransaction = async () => {
    if (checkout.amountDue <= 0.01) {
      // Get terminal_id from authenticated user
      const terminal_id = auth.user?.assigned_terminal_id;
      if (terminal_id) {
        await dispatch(completeCheckout({
          terminal_id,
          customer_id: selectedCustomer?.id,
        }));
      } else {
        alert('Terminal ID not found. Please contact administrator.');
      }
    }
  };

  /**
   * Handle closing modal
   * Clears checkout state, resets receipt/customer, calls parent onClose
   */
  const handleClose = () => {
    dispatch(clearCheckout());
    setShowReceipt(false);
    setSelectedCustomer(null);
    onClose();
  };

  /**
   * Handle starting new transaction after completion
   * Refreshes product list (to show updated stock), clears checkout, closes modal
   */
  const handleNewTransaction = () => {
    // Clear search and refresh product list to show updated stock
    dispatch(clearSearchResults());
    dispatch(fetchProducts({ limit: 100 }));
    handleClose();
  };

  // Receipt view - shown after successful transaction completion
  if (showReceipt && checkout.completedTransaction) {
    return (
      <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
        <div style={styles.modal}>
          <div style={styles.receipt}>
            {/* Receipt header: success message, transaction number, customer info */}
            <div style={styles.receiptHeader}>
              <h2 style={styles.receiptTitle}>✓ Transaction Complete</h2>
              <p style={styles.transactionNumber}>
                Transaction #{checkout.completedTransaction.transaction_number}
              </p>
              {selectedCustomer && (
                <p style={styles.customerInfo}>
                  Customer: {selectedCustomer.full_name} ({selectedCustomer.customer_number})
                </p>
              )}
            </div>

            {/* Receipt details: financial breakdown */}
            <div style={styles.receiptDetails}>
              <div style={styles.receiptRow}>
                <span>Subtotal:</span>
                <span>${Number(checkout.completedTransaction.subtotal).toFixed(2)}</span>
              </div>
              <div style={styles.receiptRow}>
                <span>Tax:</span>
                <span>${Number(checkout.completedTransaction.tax_amount).toFixed(2)}</span>
              </div>
              <div style={{...styles.receiptRow, ...styles.receiptTotal}}>
                <span>Total:</span>
                <span>${Number(checkout.completedTransaction.total_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* New Transaction button - clears and closes */}
            <button onClick={handleNewTransaction} style={styles.newTransactionButton}>
              New Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Checkout view - main payment collection interface
  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={styles.modal}>
        {/* Header: title and close button */}
        <div style={styles.header}>
          <h2 style={styles.title}>Checkout</h2>
          <button onClick={handleClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Error banner (shown if transaction fails) */}
        {checkout.error && <div style={styles.error}>{checkout.error}</div>}

        <div style={styles.content}>
          {/* Customer selection (optional) */}
          <CustomerSelector
            selectedCustomerId={selectedCustomer?.id || null}
            onSelect={setSelectedCustomer}
          />

          {/* Payment summary: Total, Paid, Amount Due */}
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span>Total:</span>
              <span style={styles.summaryTotal}>${Number(cart.total_amount).toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Paid:</span>
              <span style={styles.summaryPaid}>${Number(checkout.totalPaid).toFixed(2)}</span>
            </div>
            <div style={{...styles.summaryRow, ...styles.summaryDue}}>
              <span>Amount Due:</span>
              <span style={{
                color: checkout.amountDue > 0.01 ? '#dc3545' : '#28a745',
                fontSize: '1.5rem',
                fontWeight: 600,
              }}>
                ${Number(checkout.amountDue).toFixed(2)}
              </span>
            </div>
          </div>

          {/* List of added payments (with remove buttons) */}
          <PaymentList payments={checkout.payments} onRemove={handleRemovePayment} />

          {/* Payment input - only show if amount due > 0 */}
          {checkout.amountDue > 0.01 && (
            <>
              <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

              {selectedMethod === 'cash' && (
                <CashPaymentInput amount={checkout.amountDue} onPaymentAdded={handleAddCashPayment} />
              )}
            </>
          )}

          {/* Complete Transaction button (enabled when paid in full) */}
          <button
            onClick={handleCompleteTransaction}
            disabled={checkout.amountDue > 0.01 || checkout.isProcessing}
            style={{
              ...styles.completeButton,
              ...(checkout.amountDue > 0.01 || checkout.isProcessing ? styles.completeButtonDisabled : {}),
            }}
          >
            {checkout.isProcessing ? 'Processing...' : 'Complete Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    padding: '1.5rem',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    border: 'none',
    background: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0.25rem',
    lineHeight: 1,
  },
  content: {
    padding: '1.5rem',
    overflowY: 'auto' as const,
    flex: 1,
  },
  error: {
    padding: '1rem 1.5rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderBottom: '1px solid #f5c6cb',
  },
  summary: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '1rem',
  },
  summaryTotal: {
    fontWeight: 600,
    color: '#333',
  },
  summaryPaid: {
    fontWeight: 600,
    color: '#28a745',
  },
  summaryDue: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '2px solid #ddd',
    marginBottom: 0,
  },
  completeButton: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.125rem',
    fontWeight: 600,
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1.5rem',
  },
  completeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  receipt: {
    padding: '2rem',
    textAlign: 'center' as const,
  },
  receiptHeader: {
    marginBottom: '2rem',
  },
  receiptTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#28a745',
  },
  transactionNumber: {
    margin: 0,
    fontSize: '1rem',
    color: '#666',
  },
  customerInfo: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.9rem',
    color: '#666',
  },
  receiptDetails: {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '1rem',
  },
  receiptTotal: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '2px solid #ddd',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#007bff',
    marginBottom: 0,
  },
  newTransactionButton: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.125rem',
    fontWeight: 600,
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default CheckoutModal;
