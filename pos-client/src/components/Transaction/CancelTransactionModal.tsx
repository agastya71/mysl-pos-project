/**
 * CancelTransactionModal Component
 *
 * Smart modal that decides whether to offer a same-day VOID or a
 * post-settlement REFUND based on the transaction date.
 *
 * Decision logic:
 *   - transaction date == today AND status == 'completed' → show Void option
 *   - transaction date < today OR already past settlement  → show Refund option only
 *
 * Manager/admin role enforcement is the parent's responsibility.
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { voidTransaction, fetchTransactions } from '../../store/slices/transactions.slice';
import RefundModal from './RefundModal';

interface CancelTransactionModalProps {
  transactionId: string;
  transactionNumber: string;
  transactionDate: string;
  totalAmount: number;
  status: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CancelTransactionModal: React.FC<CancelTransactionModalProps> = ({
  transactionId,
  transactionNumber,
  transactionDate,
  totalAmount,
  status,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const isToday = (() => {
    const txnDate = new Date(transactionDate);
    const today = new Date();
    return (
      txnDate.getFullYear() === today.getFullYear() &&
      txnDate.getMonth() === today.getMonth() &&
      txnDate.getDate() === today.getDate()
    );
  })();

  const canVoid = isToday && status === 'completed';
  const [mode, setMode] = useState<'choose' | 'void' | 'refund'>(
    canVoid ? 'choose' : 'refund'
  );

  // Void flow state
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const handleVoidSubmit = async () => {
    if (!voidReason.trim()) {
      setVoidError('Reason is required.');
      return;
    }
    setIsVoiding(true);
    setVoidError(null);
    try {
      await dispatch(voidTransaction({ id: transactionId, reason: voidReason.trim() })).unwrap();
      await dispatch(fetchTransactions());
      onSuccess();
      onClose();
    } catch (err: any) {
      setVoidError(err || 'Void failed. Please try again.');
      setIsVoiding(false);
    }
  };

  // Choose screen
  if (mode === 'choose') {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <div style={styles.title}>Cancel Transaction</div>
            <div style={styles.subtitle}>
              Transaction <span style={styles.txnNum}>{transactionNumber}</span>
            </div>
          </div>

          <p style={styles.description}>
            This transaction was completed today. Choose how you want to cancel it:
          </p>

          <div style={styles.optionGrid}>
            <button style={styles.optionCard} onClick={() => setMode('void')}>
              <div style={styles.optionIcon}>↩️</div>
              <div style={styles.optionTitle}>Void (Instant)</div>
              <div style={styles.optionDesc}>
                Reverses the authorization immediately. Best for same-day errors.
              </div>
            </button>
            <button style={styles.optionCard} onClick={() => setMode('refund')}>
              <div style={styles.optionIcon}>💳</div>
              <div style={styles.optionTitle}>Refund (2–7 days)</div>
              <div style={styles.optionDesc}>
                Issues a refund through the payment processor. Use if already settled.
              </div>
            </button>
          </div>

          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <button style={{ ...styles.button, ...styles.cancelButton }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Void screen
  if (mode === 'void') {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <div style={{ ...styles.title, color: '#dc3545' }}>⚠️ Void Transaction</div>
            <div style={styles.subtitle}>
              Transaction <span style={styles.txnNum}>{transactionNumber}</span>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Reason <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding…"
              style={styles.textarea}
              disabled={isVoiding}
            />
          </div>

          {voidError && <div style={styles.error}>{voidError}</div>}

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.button, ...styles.cancelButton }}
              onClick={() => setMode('choose')}
              disabled={isVoiding}
            >
              Back
            </button>
            <button
              style={{
                ...styles.button,
                ...(isVoiding || !voidReason.trim() ? styles.disabledButton : styles.dangerButton),
              }}
              onClick={handleVoidSubmit}
              disabled={isVoiding || !voidReason.trim()}
            >
              {isVoiding ? 'Voiding…' : 'Void Transaction'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Refund screen — delegate to RefundModal
  return (
    <RefundModal
      transactionId={transactionId}
      transactionNumber={transactionNumber}
      totalAmount={totalAmount}
      onClose={onClose}
      onSuccess={async () => {
        await dispatch(fetchTransactions());
        onSuccess();
      }}
    />
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
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '520px',
    width: '90%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '16px',
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
  txnNum: {
    fontWeight: 600,
    color: '#007bff',
  },
  description: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '20px',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  optionCard: {
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px 16px',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s',
  },
  optionIcon: {
    fontSize: '1.75rem',
    marginBottom: '8px',
  },
  optionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '6px',
  },
  optionDesc: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.5',
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
  dangerButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#f8d7da',
    color: '#999',
    cursor: 'not-allowed',
  },
};

export default CancelTransactionModal;
