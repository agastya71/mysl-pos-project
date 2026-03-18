/**
 * CardPaymentInput Component
 *
 * Handles credit and debit card payments via Square Terminal API.
 * Card data is NEVER entered manually — Square handles card capture on the
 * physical terminal device.
 *
 * Flow:
 *   1. Cashier clicks "Charge Card"
 *   2. POST /api/v1/payments/terminal/checkout → get checkoutId
 *   3. Show "Waiting for customer on terminal…" spinner
 *   4. Poll GET /api/v1/payments/terminal/checkout/:id every 2 seconds
 *   5. COMPLETED → call onPaymentAdded with card details, stop polling
 *   6. CANCELED   → show error, allow retry
 *   7. Timeout after 120 s → cancel checkout, show timeout error
 */

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../../services/api/api.client';

interface CardPaymentInputProps {
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card';
  onPaymentAdded: (cardLastFour: string, cardType: string, amount: number) => void;
}

type CardStatus = 'idle' | 'pending' | 'approved' | 'declined' | 'timeout';

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

const CardPaymentInput: React.FC<CardPaymentInputProps> = ({
  amount,
  paymentMethod,
  onPaymentAdded,
}) => {
  const [status, setStatus] = useState<CardStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const methodLabel = paymentMethod === 'credit_card' ? 'Credit Card' : 'Debit Card';

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollIntervalRef.current = null;
    timeoutRef.current = null;
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleCharge = async () => {
    setErrorMsg('');
    setStatus('pending');

    const idempotencyKey = uuidv4();

    try {
      const createRes = await apiClient.post('/payments/terminal/checkout', {
        amount,
        idempotencyKey,
      });
      const id: string = createRes.data.data.checkoutId;
      setCheckoutId(id);
      startPolling(id);
    } catch (err: any) {
      setStatus('declined');
      setErrorMsg(
        err?.response?.data?.error?.message ?? 'Could not reach the terminal. Please try again.'
      );
    }
  };

  const startPolling = (id: string) => {
    // Timeout: auto-cancel after 120 s
    timeoutRef.current = setTimeout(async () => {
      stopPolling();
      try {
        await apiClient.post(`/payments/terminal/checkout/${id}/cancel`);
      } catch {
        // best-effort cancel
      }
      setStatus('timeout');
      setErrorMsg('Payment timed out. Please ask the customer to try again.');
    }, TIMEOUT_MS);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/payments/terminal/checkout/${id}`);
        const { status: checkoutStatus, paymentId, cardLast4, cardBrand } =
          res.data.data as {
            status: string;
            paymentId?: string;
            cardLast4?: string;
            cardBrand?: string;
          };

        if (checkoutStatus === 'COMPLETED') {
          stopPolling();
          setStatus('approved');
          onPaymentAdded(cardLast4 ?? '****', cardBrand ?? 'Card', amount);
          return;
        }

        if (checkoutStatus === 'CANCELED' || checkoutStatus === 'CANCEL_REQUESTED') {
          stopPolling();
          setStatus('declined');
          setErrorMsg('Payment was cancelled on the terminal. Please try again.');
          return;
        }

        // PENDING / IN_PROGRESS — keep polling
      } catch {
        // Network hiccup — keep polling until timeout
      }
    }, POLL_INTERVAL_MS);
  };

  const handleCancel = async () => {
    stopPolling();
    if (checkoutId) {
      try {
        await apiClient.post(`/payments/terminal/checkout/${checkoutId}/cancel`);
      } catch {
        // best-effort
      }
    }
    handleReset();
  };

  const handleReset = () => {
    stopPolling();
    setStatus('idle');
    setErrorMsg('');
    setCheckoutId(null);
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
          {errorMsg && <p style={styles.error}>{errorMsg}</p>}
          <button onClick={handleCharge} style={styles.chargeButton}>
            Charge {methodLabel}
          </button>
        </>
      )}

      {status === 'pending' && (
        <div style={styles.statusBox}>
          <div style={styles.spinner}>⏳</div>
          <p style={styles.statusText}>Waiting for customer on terminal…</p>
          <p style={styles.statusHint}>
            The customer is completing payment on the card reader.
          </p>
          <button onClick={handleCancel} style={styles.cancelButton}>
            Cancel
          </button>
        </div>
      )}

      {status === 'approved' && (
        <div style={{ ...styles.statusBox, ...styles.approvedBox }}>
          <div style={styles.checkmark}>✓</div>
          <p style={{ ...styles.statusText, color: '#28a745' }}>Approved</p>
          <p style={styles.statusHint}>${Number(amount).toFixed(2)}</p>
        </div>
      )}

      {(status === 'declined' || status === 'timeout') && (
        <div style={{ ...styles.statusBox, ...styles.declinedBox }}>
          <p style={{ ...styles.statusText, color: '#dc3545' }}>
            {status === 'timeout' ? 'Timed Out' : 'Declined'}
          </p>
          <p style={styles.statusHint}>{errorMsg || 'Ask customer for another payment method.'}</p>
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
  cancelButton: {
    marginTop: '1rem',
    padding: '0.5rem 1.5rem',
    fontSize: '0.875rem',
    backgroundColor: '#6c757d',
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
