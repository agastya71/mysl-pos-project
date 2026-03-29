import React from 'react';
import type { APInvoice } from '../../types/accountsPayable.types';

interface Props {
  vendorName: string;
  invoices: APInvoice[];
  onClose: () => void;
}

const statusColors: Record<APInvoice['status'], string> = {
  overdue: '#dc2626',
  open: '#f59e0b',
  partial: '#3b82f6',
  paid: '#16a34a',
  cancelled: '#94a3b8',
  disputed: '#7c3aed',
};

const styles = {
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: '12px', padding: '24px',
    width: '720px', maxHeight: '80vh', overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { fontSize: '18px', fontWeight: 'bold', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '10px 12px', textAlign: 'left' as const,
    background: '#f8fafc', fontWeight: '600', color: '#475569',
    fontSize: '12px', textTransform: 'uppercase' as const,
    borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontSize: '14px' },
  empty: { padding: '10px 12px', color: '#94a3b8', textAlign: 'center' as const },
};

export default function APVendorDetailModal({ vendorName, invoices, onClose }: Props) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{vendorName} — AP Invoices</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>AP #</th>
              <th style={styles.th}>Invoice #</th>
              <th style={styles.th}>Invoice Date</th>
              <th style={styles.th}>Due Date</th>
              <th style={styles.th}>Amount Due</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} style={styles.empty}>No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={styles.td}>{inv.ap_number}</td>
                  <td style={styles.td}>{inv.invoice_number ?? '—'}</td>
                  <td style={styles.td}>{inv.invoice_date}</td>
                  <td style={styles.td}>{inv.due_date}</td>
                  <td style={styles.td}>${parseFloat(inv.amount_due).toFixed(2)}</td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                      fontSize: '12px', fontWeight: '600', color: '#fff',
                      background: statusColors[inv.status],
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
