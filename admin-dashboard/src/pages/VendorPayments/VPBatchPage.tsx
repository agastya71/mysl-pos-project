import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store';
import { fetchAPEntries } from '../../store/slices/accountsPayable.slice';
import { apiClient } from '../../services/api.client';
import type { APInvoice } from '../../types/accountsPayable.types';
import type { BatchPaymentInput } from '../../types/vendorPayments.types';

const METHODS = ['check', 'ach', 'wire', 'credit_card', 'cash', 'other'] as const;

const styles = {
  container: { padding: '24px', maxWidth: '800px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' },
  section: { background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', margin: '0 0 16px 0' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '10px', textAlign: 'left' as const, background: '#f8fafc', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' },
  backBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' },
  submitBtn: (disabled: boolean) => ({ padding: '10px 24px', borderRadius: '6px', border: 'none', background: disabled ? '#93c5fd' : '#3b82f6', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '15px' }),
  success: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '20px', textAlign: 'center' as const },
  error: { color: '#dc2626', fontSize: '14px', marginTop: '12px' },
};

export default function VPBatchPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { vendors } = useSelector((s: RootState) => s.accountsPayable);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorInvoices, setVendorInvoices] = useState<APInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<typeof METHODS[number]>('check');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendors.length === 0) dispatch(fetchAPEntries({}));
  }, [dispatch, vendors.length]);

  useEffect(() => {
    if (!selectedVendorId) { setVendorInvoices([]); setSelectedInvoiceIds(new Set()); return; }
    apiClient.get('/accounts-payable', { params: { vendor_id: selectedVendorId, status: 'open', limit: 200 } })
      .then(res => setVendorInvoices(res.data.data.invoices))
      .catch(() => setVendorInvoices([]));
  }, [selectedVendorId]);

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedVendorId || selectedInvoiceIds.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const payments: BatchPaymentInput['payments'] = Array.from(selectedInvoiceIds).map(ap_invoice_id => {
        const inv = vendorInvoices.find(i => i.id === ap_invoice_id)!;
        return {
          vendor_id: selectedVendorId,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: method,
          reference_number: reference || undefined,
          invoice_allocations: [{ ap_invoice_id, allocated_amount: parseFloat(inv.amount_due) }],
        };
      });
      const response = await apiClient.post('/vendor-payments/batch', { payments });
      setCreatedCount(response.data.data.length);
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(e.response?.data?.error?.message ?? e.message ?? 'Batch payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.success}>
          <div style={{ fontSize: '48px' }}>&#10003;</div>
          <h2 style={{ color: '#16a34a', margin: '12px 0 8px' }}>Batch Payment Created</h2>
          <p style={{ color: '#64748b' }}>{createdCount} payment{createdCount !== 1 ? 's' : ''} created successfully.</p>
          <button onClick={() => navigate('/finance/vendor-payments')} style={{ marginTop: '16px', padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            View Payments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Batch Payment</h1>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Select Vendor</h2>
        <label style={styles.label}>Vendor</label>
        <select style={styles.input} value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}>
          <option value="">Select vendor...</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
        </select>
      </div>

      {selectedVendorId && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Select Invoices to Pay</h2>
          {vendorInvoices.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No open invoices for this vendor.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Select</th>
                  <th style={styles.th}>AP #</th>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Amount Due</th>
                </tr>
              </thead>
              <tbody>
                {vendorInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={styles.td}>
                      <input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => toggleInvoice(inv.id)} />
                    </td>
                    <td style={styles.td}>{inv.ap_number}</td>
                    <td style={styles.td}>{inv.invoice_number ?? '—'}</td>
                    <td style={styles.td}>{inv.due_date}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>${parseFloat(inv.amount_due).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedInvoiceIds.size > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Payment Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Payment Method *</label>
              <select style={styles.input} value={method} onChange={e => setMethod(e.target.value as typeof METHODS[number])}>
                {METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Reference #</label>
              <input style={styles.input} value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actions}>
        <button style={styles.backBtn} onClick={() => navigate('/finance/vendor-payments')}>&#8592; Back</button>
        <button
          style={styles.submitBtn(!selectedVendorId || selectedInvoiceIds.size === 0 || submitting)}
          disabled={!selectedVendorId || selectedInvoiceIds.size === 0 || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting...' : `Submit ${selectedInvoiceIds.size > 0 ? `(${selectedInvoiceIds.size} invoice${selectedInvoiceIds.size !== 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </div>
  );
}
