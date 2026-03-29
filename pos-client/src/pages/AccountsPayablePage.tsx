import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAPData, clearError } from '../store/slices/accountsPayable.slice';
import type { APSummary } from '../types/accountsPayable.types';
import APVendorDetailModal from '../components/AccountsPayable/APVendorDetailModal';

const styles = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    background: '#fff', borderRadius: '8px', overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '12px 16px', textAlign: 'left' as const,
    background: '#f1f5f9', fontWeight: '600', color: '#475569',
    fontSize: '13px', textTransform: 'uppercase' as const,
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  clickableRow: { cursor: 'pointer' as const },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '12px 16px', marginBottom: '16px', color: '#dc2626',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  empty: { padding: '12px 16px', textAlign: 'center' as const, color: '#94a3b8' },
};

const amountColor = (amount: number) =>
  amount > 5000 ? '#dc2626' : amount > 0 ? '#f59e0b' : '#16a34a';

export default function AccountsPayablePage() {
  const dispatch = useAppDispatch();
  const { invoices, vendors, loading, error } = useAppSelector((state) => state.accountsPayable);
  const user = useAppSelector((state) => state.auth.user);
  const [modalVendorId, setModalVendorId] = useState<string | null>(null);

  if (user?.role === 'cashier') return <Navigate to="/pos" replace />;

  useEffect(() => {
    dispatch(fetchAPData());
  }, [dispatch]);

  const summaries = useMemo((): APSummary[] => {
    const vendorMap = new Map(vendors.map((v) => [v.id, v.business_name]));
    const grouped = new Map<string, { total: number; dates: string[]; count: number }>();
    for (const inv of invoices) {
      const entry = grouped.get(inv.vendor_id) ?? { total: 0, dates: [], count: 0 };
      entry.total += parseFloat(inv.amount_due);
      entry.dates.push(inv.invoice_date);
      entry.count += 1;
      grouped.set(inv.vendor_id, entry);
    }
    return Array.from(grouped.entries())
      .map(([vendor_id, data]) => ({
        vendor_id,
        vendor_name: vendorMap.get(vendor_id) ?? vendor_id,
        total_outstanding: data.total,
        oldest_invoice_date: data.dates.reduce((a, b) => (a < b ? a : b)),
        invoice_count: data.count,
      }))
      .sort((a, b) => b.total_outstanding - a.total_outstanding);
  }, [invoices, vendors]);

  const modalInvoices = useMemo(
    () => (modalVendorId ? invoices.filter((inv) => inv.vendor_id === modalVendorId) : []),
    [invoices, modalVendorId]
  );
  const modalVendorName = summaries.find((s) => s.vendor_id === modalVendorId)?.vendor_name ?? '';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Accounts Payable</h1>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearError())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Vendor</th>
              <th style={styles.th}>Outstanding Balance</th>
              <th style={styles.th}>Oldest Invoice</th>
              <th style={styles.th}>Open Invoices</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr><td colSpan={4} style={styles.empty}>No accounts payable records found.</td></tr>
            ) : (
              summaries.map((s) => (
                <tr
                  key={s.vendor_id}
                  style={styles.clickableRow}
                  onClick={() => setModalVendorId(s.vendor_id)}
                >
                  <td style={styles.td}>{s.vendor_name}</td>
                  <td style={{ ...styles.td, color: amountColor(s.total_outstanding), fontWeight: '600' }}>
                    ${s.total_outstanding.toFixed(2)}
                  </td>
                  <td style={styles.td}>{s.oldest_invoice_date}</td>
                  <td style={styles.td}>{s.invoice_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modalVendorId && (
        <APVendorDetailModal
          vendorName={modalVendorName}
          invoices={modalInvoices}
          onClose={() => setModalVendorId(null)}
        />
      )}
    </div>
  );
}
