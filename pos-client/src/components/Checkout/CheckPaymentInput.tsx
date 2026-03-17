/**
 * CheckPaymentInput Component
 *
 * Collects check payment details: check number and amount.
 * Amount defaults to the remaining amount due.
 * Submit disabled until check number is non-empty and numeric.
 */

import React, { useState, useEffect } from 'react';

interface CheckPaymentInputProps {
  amount: number;
  onPaymentAdded: (checkNumber: string, amount: number) => void;
}

const CheckPaymentInput: React.FC<CheckPaymentInputProps> = ({ amount, onPaymentAdded }) => {
  const [checkNumber, setCheckNumber] = useState('');
  const [checkAmount, setCheckAmount] = useState(amount.toFixed(2));
  const [error, setError] = useState('');

  useEffect(() => {
    setCheckAmount(amount.toFixed(2));
  }, [amount]);

  const validate = (): boolean => {
    if (!checkNumber.trim()) {
      setError('Check number is required.');
      return false;
    }
    if (!/^\d+$/.test(checkNumber.trim())) {
      setError('Check number must be numeric.');
      return false;
    }
    const amt = parseFloat(checkAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be greater than zero.');
      return false;
    }
    if (amt > amount + 0.01) {
      setError(`Amount cannot exceed amount due ($${amount.toFixed(2)}).`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onPaymentAdded(checkNumber.trim(), parseFloat(checkAmount));
    setCheckNumber('');
    setCheckAmount(amount.toFixed(2));
  };

  const canSubmit =
    checkNumber.trim().length > 0 &&
    /^\d+$/.test(checkNumber.trim()) &&
    parseFloat(checkAmount) > 0 &&
    parseFloat(checkAmount) <= amount + 0.01;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Check Payment</h3>

      <div style={styles.field}>
        <label style={styles.label}>Amount Due:</label>
        <span style={styles.amountDue}>${Number(amount).toFixed(2)}</span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Check Number:</label>
        <input
          type="text"
          value={checkNumber}
          onChange={(e) => {
            setCheckNumber(e.target.value);
            setError('');
          }}
          placeholder="e.g. 1042"
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Amount:</label>
        <input
          type="number"
          value={checkAmount}
          onChange={(e) => {
            setCheckAmount(e.target.value);
            setError('');
          }}
          step="0.01"
          min="0.01"
          style={styles.input}
        />
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          ...styles.submitButton,
          ...(canSubmit ? {} : styles.submitButtonDisabled),
        }}
      >
        Add Check Payment
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
    textAlign: 'right',
  },
  error: {
    color: '#dc3545',
    fontSize: '0.8rem',
    marginBottom: '0.75rem',
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

export default CheckPaymentInput;
