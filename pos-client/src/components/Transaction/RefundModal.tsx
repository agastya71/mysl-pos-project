/**
 * RefundModal Component
 *
 * Post-settlement refund flow. Shows original transaction summary,
 * amount input (full or partial), and required reason field.
 * Manager/admin role only — role check is done by the parent.
 */

import React, { useState } from 'react';
import { transactionApi } from '../../services/api/transaction.api';

interface RefundModalProps {
  transactionId: string;
  transactionNumber: string;
  totalAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  transactionId,
  transactionNumber,
  totalAmount,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState(totalAmount.toFixed(2));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const canSubmit =
    !isSubmitting &&
    reason.trim().length > 0 &&
    parsedAmount > 0 &&
    parsedAmount <= totalAmount + 0.01;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await transactionApi.refundTransaction(transactionId, parsedAmount, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || err?.message || 'Refund failed. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>💳 Issue Refund</div>
          <div style={styles.subtitle}>
            Transaction{' '}
            <span style={styles.txnNumber}>{transactionNumber}</span>
          </div>
        </div>

        <div style={styles.summaryBox}>
          <div style={styles.summaryRow}>
            <span>Original Total:</span>
            <span style={styles.summaryValue}>${Number(totalAmount).toFixed(2)}</span>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Refund Amount <span style={styles.required}>*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            step="0.01"
            min="0.01"
            max={totalAmount}
            style={styles.input}
          />
          <small style={styles.hint}>Full or partial refund up to ${totalAmount.toFixed(2)}</small>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Reason <span style={styles.required}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            placeholder="Enter reason for this refund..."
            style={styles.textarea}
            disabled={isSubmitting}
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.buttonGroup}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ ...styles.button, ...styles.cancelButton }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              ...styles.button,
              ...(canSubmit ? styles.refundButton : styles.refundButtonDisabled),
            }}
          >
            {isSubmitting ? 'Processing…' : 'Issue Refund'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
  },
  txnNumber: {
    fontWeight: 600,
    color: '#007bff',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  summaryValue: {
    fontWeight: 600,
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    color: '#333',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    display: 'block',
    marginTop: '4px',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '90px',
    boxSizing: 'border-box',
  },
  error: {
    color: '#dc3545',
    fontSize: '13px',
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
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  refundButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  refundButtonDisabled: {
    backgroundColor: '#c3e6cb',
    color: '#999',
    cursor: 'not-allowed',
  },
};

export default RefundModal;
