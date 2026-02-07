import React, { useState, useEffect } from 'react';

interface CashPaymentInputProps {
  amount: number;
  onPaymentAdded: (cashReceived: number, amount: number) => void;
}

const CashPaymentInput: React.FC<CashPaymentInputProps> = ({ amount, onPaymentAdded }) => {
  const [cashReceived, setCashReceived] = useState('');
  const [change, setChange] = useState(0);

  useEffect(() => {
    const received = parseFloat(cashReceived) || 0;
    setChange(received - amount);
  }, [cashReceived, amount]);

  const handleSubmit = () => {
    const received = parseFloat(cashReceived) || 0;
    if (received >= amount) {
      onPaymentAdded(received, amount);
      setCashReceived('');
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setCashReceived(quickAmount.toString());
  };

  const canSubmit = parseFloat(cashReceived) >= amount;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Cash Payment</h3>

      <div style={styles.field}>
        <label style={styles.label}>Amount Due:</label>
        <span style={styles.amountDue}>${Number(amount).toFixed(2)}</span>
      </div>

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

      {cashReceived && (
        <div style={styles.field}>
          <label style={styles.label}>Change:</label>
          <span style={{...styles.change, color: change >= 0 ? '#28a745' : '#dc3545'}}>
            ${Number(change).toFixed(2)}
          </span>
        </div>
      )}

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
