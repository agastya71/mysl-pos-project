import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { approvePaymentThunk } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';

interface Props { payment: VendorPayment; vendorName: string; onClose: () => void; onSuccess: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' },
  detail: { background: '#f8fafc', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

export default function ApprovePaymentModal({ payment, vendorName, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { actionLoading } = useSelector((s: RootState) => s.vendorPayments);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    const result = await dispatch(approvePaymentThunk(payment.id));
    if (approvePaymentThunk.fulfilled.match(result)) { onSuccess(); }
    else { setError((result.payload as string) ?? 'Approval failed'); }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>Approve Payment</h2>
        <p style={styles.subtitle}>This will mark the payment as cleared.</p>
        <div style={styles.detail}>
          <div><strong>Payment #:</strong> {payment.payment_number}</div>
          <div><strong>Vendor:</strong> {vendorName}</div>
          <div><strong>Amount:</strong> ${parseFloat(payment.total_amount).toFixed(2)}</div>
          <div><strong>Method:</strong> {payment.payment_method.toUpperCase()}</div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button onClick={handleApprove} disabled={actionLoading} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: actionLoading ? '#86efac' : '#16a34a', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {actionLoading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
