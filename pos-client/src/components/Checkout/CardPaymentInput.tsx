/**
 * CardPaymentInput Component
 *
 * Handles credit and debit card payments via Square Terminal API.
 * Card data is NEVER entered manually here — Square handles card capture
 * on the physical terminal. We collect the Square nonce/token that the
 * terminal returns after the customer taps/dips/swipes.
 *
 * In the MVP flow the cashier clicks "Charge Card", the terminal prompts
 * the customer, and when approved the terminal returns a payment token.
 * For the sandbox we simulate this with a test nonce.
 */

import React, { useState } from 'react';

interface CardPaymentInputProps {
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card';
  onPaymentAdded: (cardLastFour: string, cardType: string, amount: number) => void;
}

type CardStatus = 'idle' | 'pending' | 'approved' | 'declined';

const CardPaymentInput: React.FC<CardPaymentInputProps> = ({
  amount,
  paymentMethod,
  onPaymentAdded,
}) => {
  const [status, setStatus] = useState<CardStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // In production the terminal pushes back last-four and brand.
  // For the sandbox we let the cashier enter them manually so the
  // transaction record has real-looking data.
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardType, setCardType] = useState('Visa');

  const methodLabel = paymentMethod === 'credit_card' ? 'Credit Card' : 'Debit Card';

  const handleCharge = async () => {
    setErrorMsg('');

    if (cardLastFour.length !== 4 || !/^\d{4}$/.test(cardLastFour)) {
      setErrorMsg('Enter the last 4 digits of the card.');
      return;
    }

    setStatus('pending');

    // Simulate terminal round-trip (replace with real Square Terminal SDK call)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Simulate approval (always succeeds in sandbox)
    setStatus('approved');
    onPaymentAdded(cardLastFour, cardType, amount);
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMsg('');
    setCardLastFour('');
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{methodLabel} Payment</h3>

      <div style={styles.field}>
        <label style={styles.label}>Amount Due:</label>
        <span style={styles.amountDue}>${Number(amount).toFixed(2)}</span>
      </div>

      {status === 'idle' && (
        <>
          <div style={styles.field}>
            <label style={styles.label}>Card Type:</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              style={styles.select}
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
              <option>Discover</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Last 4 Digits:</label>
            <input
              type="text"
              value={cardLastFour}
              onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              style={styles.input}
            />
          </div>

          {errorMsg && <p style={styles.error}>{errorMsg}</p>}

          <button onClick={handleCharge} style={styles.chargeButton}>
            Charge {methodLabel}
          </button>
        </>
      )}

      {status === 'pending' && (
        <div style={styles.statusBox}>
          <div style={styles.spinner}>⏳</div>
          <p style={styles.statusText}>Processing on terminal…</p>
          <p style={styles.statusHint}>Customer is completing payment on the card reader.</p>
        </div>
      )}

      {status === 'approved' && (
        <div style={{ ...styles.statusBox, ...styles.approvedBox }}>
          <div style={styles.checkmark}>✓</div>
          <p style={{ ...styles.statusText, color: '#28a745' }}>Approved</p>
          <p style={styles.statusHint}>
            {cardType} ending in {cardLastFour} — ${Number(amount).toFixed(2)}
          </p>
        </div>
      )}

      {status === 'declined' && (
        <div style={{ ...styles.statusBox, ...styles.declinedBox }}>
          <p style={{ ...styles.statusText, color: '#dc3545' }}>Declined</p>
          <p style={styles.statusHint}>Ask customer for another payment method.</p>
          <button onClick={handleReset} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}
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
  select: {
    padding: '0.4rem 0.5rem',
    fontSize: '0.9rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '150px',
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
  chargeButton: {
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
  statusBox: {
    textAlign: 'center',
    padding: '1.5rem',
    borderRadius: '8px',
    backgroundColor: '#f0f0f0',
  },
  approvedBox: {
    backgroundColor: '#d4edda',
  },
  declinedBox: {
    backgroundColor: '#f8d7da',
  },
  spinner: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  checkmark: {
    fontSize: '2rem',
    color: '#28a745',
    marginBottom: '0.5rem',
  },
  statusText: {
    fontWeight: 600,
    fontSize: '1.1rem',
    margin: '0 0 0.25rem 0',
  },
  statusHint: {
    fontSize: '0.85rem',
    color: '#555',
    margin: 0,
  },
  retryButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
};

export default CardPaymentInput;
