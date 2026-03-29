import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { createPaymentThunk } from '../../store/slices/vendorPayments.slice';

interface Props { onClose: () => void; onSuccess: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  fullWidth: { gridColumn: '1 / -1' as const },
  note: { fontSize: '12px', color: '#94a3b8', marginBottom: '16px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

const METHODS = ['check', 'ach', 'wire', 'credit_card', 'cash', 'other'] as const;

export default function VPCreateModal({ onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { actionLoading, error } = useSelector((s: RootState) => s.vendorPayments);
  const vendors = useSelector((s: RootState) => s.accountsPayable.vendors);

  const [form, setForm] = useState({
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check' as typeof METHODS[number],
    reference_number: '',
    memo: '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.vendor_id) return;
    const result = await dispatch(createPaymentThunk({
      vendor_id: form.vendor_id,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
      memo: form.memo || undefined,
      invoice_allocations: [],
    }));
    if (createPaymentThunk.fulfilled.match(result)) { onSuccess(); }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>New Vendor Payment</h2>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.grid}>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Vendor *</label>
            <select style={styles.input} value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
              <option value="">Select vendor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Payment Date *</label>
            <input type="date" style={styles.input} value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Method *</label>
            <select style={styles.input} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reference #</label>
            <input style={styles.input} value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Optional" />
          </div>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Memo</label>
            <input style={styles.input} value={form.memo} onChange={e => set('memo', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <p style={styles.note}>To allocate this payment to specific invoices, use Batch Payment instead.</p>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={actionLoading}>Cancel</button>
          <button onClick={handleCreate} disabled={actionLoading || !form.vendor_id} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: actionLoading ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: !form.vendor_id || actionLoading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {actionLoading ? 'Creating...' : 'Create Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
