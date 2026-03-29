import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { voidPaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props {
  payment: VendorPayment;
  vendorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#f59e0b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' },
  textarea: {
    width: '100%', padding: '8px 12px', borderRadius: '6px',
    border: '1px solid #e2e8f0', fontSize: '14px',
    resize: 'vertical' as const, minHeight: '80px', boxSizing: 'border-box' as const,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginTop: '8px' },
};

export default function VoidPaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((state) => state.vendorPayments);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleVoid = async () => {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setError(null);
    const result = await dispatch(voidPaymentThunk({ id: payment.id, reason: reason.trim() }));
    if (voidPaymentThunk.fulfilled.match(result)) {
      onSuccess();
    } else {
      setError((result.payload as string) ?? 'Void failed');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Void Payment</h2>
        <p style={styles.subtitle}>This action cannot be undone.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
        </div>
        <div>
          <label style={styles.label}>Reason for voiding *</label>
          <textarea
            style={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason..."
            disabled={actionLoading}
          />
          {error && <div style={styles.error}>{error}</div>}
        </div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button
            onClick={handleVoid}
            disabled={actionLoading}
            style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none',
              background: actionLoading ? '#fca5a5' : '#ef4444',
              color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
            }}
          >
            {actionLoading ? 'Voiding...' : 'Void Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
