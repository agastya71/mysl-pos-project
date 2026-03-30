import { useEffect, useState } from 'react';
import { fetchVendorPayment } from '../../services/vp.service';
import type { VendorPaymentWithAllocations } from '../../types/vendorPayments.types';

interface Props { paymentId: string; vendorName: string; onClose: () => void; }

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '560px', maxHeight: '80vh', overflowY: 'auto' as const, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' },
  subtitle: { color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 10px 0' },
  row: { display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '14px' },
  label: { color: '#64748b', minWidth: '130px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '8px 10px', textAlign: 'left' as const, background: '#f8fafc', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f8fafc', color: '#1e293b' },
  closeBtn: { display: 'block', marginTop: '20px', marginLeft: 'auto', padding: '8px 20px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: '600' },
};

export default function VPDetailModal({ paymentId, vendorName, onClose }: Props) {
  const [payment, setPayment] = useState<VendorPaymentWithAllocations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorPayment(paymentId)
      .then(setPayment)
      .catch(() => setPayment(null))
      .finally(() => setLoading(false));
  }, [paymentId]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p>
        ) : !payment ? (
          <p style={{ textAlign: 'center', color: '#dc2626' }}>Failed to load payment details.</p>
        ) : (
          <>
            <h2 style={styles.title}>Payment Details</h2>
            <p style={styles.subtitle}>{payment.payment_number} — {vendorName}</p>

            <div style={styles.section}>
              <div style={styles.row}><span style={styles.label}>Status</span><span>{payment.status}</span></div>
              <div style={styles.row}><span style={styles.label}>Amount</span><span>${parseFloat(payment.payment_amount).toFixed(2)}</span></div>
              <div style={styles.row}><span style={styles.label}>Method</span><span>{payment.payment_method.toUpperCase()}</span></div>
              <div style={styles.row}><span style={styles.label}>Date</span><span>{payment.payment_date}</span></div>
              {payment.transaction_reference && <div style={styles.row}><span style={styles.label}>Reference #</span><span>{payment.transaction_reference}</span></div>}
              {payment.notes && <div style={styles.row}><span style={styles.label}>Memo</span><span>{payment.notes}</span></div>}
              {payment.approved_by && <div style={styles.row}><span style={styles.label}>Approved by</span><span>{payment.approved_by}</span></div>}
            </div>

            {payment.allocations && payment.allocations.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Invoice Allocations</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>AP #</th>
                      <th style={styles.th}>Invoice #</th>
                      <th style={styles.th}>Allocated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.allocations.map(a => (
                      <tr key={a.id}>
                        <td style={styles.td}>{a.ap_number}</td>
                        <td style={styles.td}>{a.invoice_number ?? '—'}</td>
                        <td style={styles.td}>${parseFloat(String(a.allocated_amount)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <button style={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
