import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { voidTransaction, fetchTransactions } from '../../store/slices/transactions.slice';

interface VoidTransactionModalProps {
  transactionId: string;
  transactionNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

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

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await dispatch(voidTransaction({ id: transactionId, reason: reason.trim() })).unwrap();
      await dispatch(fetchTransactions());
      onSuccess();
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
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>⚠️ Void Transaction</div>
          <div style={styles.subtitle}>
            Are you sure you want to void transaction{' '}
            <span style={styles.transactionNumber}>{transactionNumber}</span>?
          </div>
        </div>

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

        {error && <div style={styles.error}>{error}</div>}

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
