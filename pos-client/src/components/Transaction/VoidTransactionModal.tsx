/**
 * @fileoverview VoidTransactionModal Component - Void transaction confirmation modal
 *
 * Nested modal for voiding transactions with reason input and confirmation.
 * Opened from TransactionDetailsModal's Void Transaction button.
 *
 * @module components/Transaction/VoidTransactionModal
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { voidTransaction, fetchTransactions } from '../../store/slices/transactions.slice';

/**
 * VoidTransactionModal component props
 *
 * @interface VoidTransactionModalProps
 * @property {string} transactionId - Transaction ID to void
 * @property {string} transactionNumber - Transaction number (for display)
 * @property {function} onClose - Callback when modal closes (Cancel or success)
 * @property {function} onSuccess - Callback when void succeeds (before close)
 */
interface VoidTransactionModalProps {
  transactionId: string;
  transactionNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * VoidTransactionModal Component
 *
 * Confirmation modal for voiding transactions. Requires reason input (required field).
 * Nested modal opened from TransactionDetailsModal, higher z-index (1000).
 *
 * Features:
 * - Warning header with transaction number (red text, ⚠️ icon)
 * - Required reason textarea (multiline, resizable)
 * - Client-side validation (reason required)
 * - Void button disabled until reason entered
 * - Loading state ("Voiding..." button text)
 * - Error display (red text, shown below textarea)
 * - Cancel and Void Transaction buttons
 * - Click overlay to close (cancel)
 * - Click inside modal does NOT close
 *
 * Void Flow:
 * 1. User enters reason in textarea
 * 2. Clicks "Void Transaction"
 * 3. Dispatches voidTransaction API call
 * 4. On success: refreshes transaction list, calls onSuccess, closes modal
 * 5. On error: shows error message, keeps modal open
 *
 * Validation:
 * - Reason required (trimmed, cannot be empty/whitespace)
 * - Void button disabled when: isSubmitting OR reason empty
 *
 * @component
 * @param {VoidTransactionModalProps} props - Component props
 * @returns {JSX.Element} Void confirmation modal
 *
 * @example
 * // Used in TransactionDetailsModal
 * const [showVoid, setShowVoid] = useState(false);
 * {showVoid && (
 *   <VoidTransactionModal
 *     transactionId={transaction.id}
 *     transactionNumber={transaction.transaction_number}
 *     onClose={() => setShowVoid(false)}
 *     onSuccess={() => console.log('Voided!')}
 *   />
 * )}
 *
 * @example
 * // Complete flow
 * // 1. User clicks "Void Transaction" in details modal
 * // 2. This modal opens (nested, higher z-index)
 * // 3. User enters "Customer requested refund"
 * // 4. Clicks "Void Transaction"
 * // 5. API call succeeds, inventory restored automatically
 * // 6. onSuccess called, modal closes
 * // 7. Details modal refreshes, shows "Voided" status
 *
 * @see {@link TransactionDetailsModal} - Parent component
 */
const VoidTransactionModal: React.FC<VoidTransactionModalProps> = ({
  transactionId,
  transactionNumber,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle void transaction submission
   * Validates reason, calls API, refreshes list, closes modal on success
   *
   * @async
   */
  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Void transaction via API
      await dispatch(voidTransaction({ id: transactionId, reason: reason.trim() })).unwrap();
      // Refresh transaction list (to show updated status)
      await dispatch(fetchTransactions());
      // Notify parent (details modal) of success
      onSuccess();
      // Close this modal
      onClose();
    } catch (err: any) {
      setError(err || 'Failed to void transaction');
      setIsSubmitting(false);
    }
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
      borderRadius: '8px',
      padding: '30px',
      maxWidth: '500px',
      width: '90%',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    header: {
      marginBottom: '20px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#dc3545',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#666',
    },
    transactionNumber: {
      fontWeight: 600,
      color: '#007bff',
    },
    field: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      marginBottom: '8px',
      color: '#333',
    },
    required: {
      color: '#dc3545',
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
      resize: 'vertical' as const,
      minHeight: '100px',
    },
    error: {
      color: '#dc3545',
      fontSize: '14px',
      marginBottom: '16px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '10px 24px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    cancelButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    voidButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    voidButtonDisabled: {
      backgroundColor: '#f8d7da',
      color: '#999',
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* Modal content (click does NOT close) */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header: warning message with transaction number */}
        <div style={styles.header}>
          <div style={styles.title}>⚠️ Void Transaction</div>
          <div style={styles.subtitle}>
            Are you sure you want to void transaction{' '}
            <span style={styles.transactionNumber}>{transactionNumber}</span>?
          </div>
        </div>

        {/* Reason textarea (required field) */}
        <div style={styles.field}>
          <label style={styles.label}>
            Reason <span style={styles.required}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for voiding this transaction..."
            style={styles.textarea}
            disabled={isSubmitting}
          />
        </div>

        {/* Error message (shown if validation fails or API error) */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Action buttons (Cancel and Void Transaction) */}
        <div style={styles.buttonGroup}>
          <button
            onClick={onClose}
            style={{ ...styles.button, ...styles.cancelButton }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...styles.button,
              ...(isSubmitting || !reason.trim() ? styles.voidButtonDisabled : styles.voidButton),
            }}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? 'Voiding...' : 'Void Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoidTransactionModal;
