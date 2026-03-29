import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { createAPEntryThunk, updateAPEntryThunk } from '../../store/slices/accountsPayable.slice';
import type { APInvoice, CreateAPInput } from '../../types/accountsPayable.types';

interface Props {
  entry?: APInvoice;
  onClose: () => void;
  onSuccess: () => void;
}

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' },
  fullWidth: { gridColumn: '1 / -1' as const },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' as const },
  error: { color: '#dc2626', fontSize: '14px', marginBottom: '12px' },
};

export default function APFormModal({ entry, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { vendors, saving, error } = useSelector((s: RootState) => s.accountsPayable);

  const [form, setForm] = useState({
    vendor_id: entry?.vendor_id ?? '',
    invoice_number: entry?.invoice_number ?? '',
    invoice_date: entry?.invoice_date ?? new Date().toISOString().split('T')[0],
    due_date: entry?.due_date ?? '',
    invoice_amount: entry ? parseFloat(entry.invoice_amount) : 0,
    payment_terms: entry?.payment_terms ?? '',
    notes: entry?.notes ?? '',
  });

  const set = (field: string, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.vendor_id || !form.due_date || form.invoice_amount <= 0) return;
    const result = entry
      ? await dispatch(updateAPEntryThunk({
          id: entry.id,
          data: { due_date: form.due_date, payment_terms: form.payment_terms || undefined, notes: form.notes || undefined },
        }))
      : await dispatch(createAPEntryThunk({
          vendor_id: form.vendor_id,
          invoice_number: form.invoice_number || undefined,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          invoice_amount: form.invoice_amount,
          payment_terms: form.payment_terms || undefined,
          notes: form.notes || undefined,
        } as CreateAPInput));
    if ((entry ? updateAPEntryThunk : createAPEntryThunk).fulfilled.match(result)) {
      onSuccess();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.title}>{entry ? 'Edit AP Entry' : 'New AP Entry'}</h2>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.grid}>
          {!entry && (
            <div style={{ ...styles.field, ...styles.fullWidth }}>
              <label style={styles.label}>Vendor *</label>
              <select style={styles.input} value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
              </select>
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Invoice #</label>
            <input style={styles.input} value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Optional" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Invoice Date *</label>
            <input type="date" style={styles.input} value={form.invoice_date} onChange={e => set('invoice_date', e.target.value)} disabled={!!entry} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Due Date *</label>
            <input type="date" style={styles.input} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          {!entry && (
            <div style={styles.field}>
              <label style={styles.label}>Amount *</label>
              <input type="number" min="0.01" step="0.01" style={styles.input} value={form.invoice_amount} onChange={e => set('invoice_amount', parseFloat(e.target.value))} />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Payment Terms</label>
            <input style={styles.input} value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="e.g. Net 30" />
          </div>
          <div style={{ ...styles.field, ...styles.fullWidth }}>
            <label style={styles.label}>Notes</label>
            <textarea style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.vendor_id || !form.due_date}
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: saving ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            {saving ? 'Saving...' : entry ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
