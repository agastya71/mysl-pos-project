import type { APInvoiceWithDetails } from '../../types/accountsPayable.types';

interface Props { entry: APInvoiceWithDetails; onClose: () => void; }

const statusColors: Record<string, string> = {
  overdue: '#dc2626', open: '#f59e0b', partial: '#3b82f6',
  paid: '#16a34a', cancelled: '#94a3b8', disputed: '#7c3aed',
};

const styles = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' },
  section: { marginBottom: '20px' },
  sectionTitle: { fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' },
  row: { fontSize: '14px', color: '#1e293b' },
  label: { color: '#64748b', marginRight: '6px' },
  badge: (status: string) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
    fontSize: '12px', fontWeight: '600', color: '#fff',
    background: statusColors[status] ?? '#94a3b8',
  }),
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: '8px' },
  th: { padding: '8px 10px', textAlign: 'left' as const, background: '#f8fafc', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px 10px', fontSize: '13px', color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
};

export default function APDetailModal({ entry, onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{entry.ap_number}</h2>
            <span style={styles.badge(entry.status)}>{entry.status}</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Invoice Details</div>
          <div style={styles.grid}>
            <div style={styles.row}><span style={styles.label}>Vendor:</span>{entry.vendor.business_name}</div>
            <div style={styles.row}><span style={styles.label}>Invoice #:</span>{entry.invoice_number ?? '—'}</div>
            <div style={styles.row}><span style={styles.label}>Invoice Date:</span>{entry.invoice_date}</div>
            <div style={styles.row}><span style={styles.label}>Due Date:</span>{entry.due_date}</div>
            <div style={styles.row}><span style={styles.label}>Invoice Amount:</span>${parseFloat(entry.invoice_amount).toFixed(2)}</div>
            <div style={styles.row}><span style={styles.label}>Amount Paid:</span>${parseFloat(entry.amount_paid).toFixed(2)}</div>
            <div style={styles.row}><span style={styles.label}>Amount Due:</span><strong>${parseFloat(entry.amount_due).toFixed(2)}</strong></div>
            {entry.payment_terms && <div style={styles.row}><span style={styles.label}>Terms:</span>{entry.payment_terms}</div>}
          </div>
          {entry.notes && <div style={{ ...styles.row, marginTop: '10px' }}><span style={styles.label}>Notes:</span>{entry.notes}</div>}
        </div>
        {entry.payments.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Payment Allocations</div>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Payment #</th><th style={styles.th}>Date</th><th style={styles.th}>Method</th><th style={styles.th}>Allocated</th></tr></thead>
              <tbody>
                {entry.payments.map(p => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.payment_number}</td>
                    <td style={styles.td}>{p.payment_date}</td>
                    <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                    <td style={styles.td}>${parseFloat(p.allocated_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
