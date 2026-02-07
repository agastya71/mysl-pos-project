import React from 'react';
import { PaymentInput } from '../../store/slices/checkout.slice';

interface PaymentListProps {
  payments: PaymentInput[];
  onRemove: (id: string) => void;
}

const PaymentList: React.FC<PaymentListProps> = ({ payments, onRemove }) => {
  if (payments.length === 0) {
    return null;
  }

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
      <div style={styles.list}>
        {payments.map((payment) => (
          <div key={payment.id} style={styles.paymentItem}>
            <div style={styles.paymentInfo}>
              <span style={styles.method}>{getMethodLabel(payment.payment_method)}</span>
              <span style={styles.amount}>${Number(payment.amount).toFixed(2)}</span>
            </div>
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
