import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { fetchAPEntries, fetchAPEntryDetail, setPage, clearError, setSelectedEntry } from '../../store/slices/accountsPayable.slice';
import type { APInvoice } from '../../types/accountsPayable.types';
import APFormModal from './APFormModal';
import APDetailModal from './APDetailModal';

const statusColors: Record<string, string> = {
  overdue: '#dc2626', open: '#f59e0b', partial: '#3b82f6',
  paid: '#16a34a', cancelled: '#94a3b8', disputed: '#7c3aed',
};

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  addBtn: { padding: '8px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { padding: '12px 16px', textAlign: 'left' as const, background: '#f1f5f9', fontWeight: '600', color: '#475569', fontSize: '13px', textTransform: 'uppercase' as const },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  actionBtn: (color: string) => ({ background: color, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }),
  errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', display: 'flex', justifyContent: 'space-between' },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
};

export default function APListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { entries, vendors, selected, total, page, loading, error } = useSelector((s: RootState) => s.accountsPayable);
  const limit = 20;
  const [showCreate, setShowCreate] = useState(false);
  const [editEntry, setEditEntry] = useState<APInvoice | null>(null);

  useEffect(() => { dispatch(fetchAPEntries({ page, limit })); }, [dispatch, page]);

  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.business_name])), [vendors]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleView = async (entry: APInvoice) => {
    await dispatch(fetchAPEntryDetail(entry.id));
  };

  const handleSuccess = () => {
    setShowCreate(false);
    setEditEntry(null);
    dispatch(fetchAPEntries({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Accounts Payable</h1>
        <button style={styles.addBtn} onClick={() => setShowCreate(true)}>+ New Entry</button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>AP #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Amount Due</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No AP entries found.</td></tr>
              ) : entries.map(entry => (
                <tr key={entry.id}>
                  <td style={styles.td}>{entry.ap_number}</td>
                  <td style={styles.td}>{vendorMap.get(entry.vendor_id) ?? entry.vendor_id}</td>
                  <td style={styles.td}>{entry.invoice_number ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: '600', color: parseFloat(entry.amount_due) > 0 ? '#f59e0b' : '#16a34a' }}>
                    ${parseFloat(entry.amount_due).toFixed(2)}
                  </td>
                  <td style={styles.td}>{entry.due_date}</td>
                  <td style={styles.td}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', background: statusColors[entry.status] ?? '#94a3b8' }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn('#3b82f6')} onClick={() => handleView(entry)}>View</button>
                    <button style={styles.actionBtn('#64748b')} onClick={() => setEditEntry(entry)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.pagination}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>{total} total</span>
            <button disabled={page <= 1} onClick={() => dispatch(setPage(page - 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
            <span style={{ fontSize: '14px' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => dispatch(setPage(page + 1))} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
          </div>
        </>
      )}

      {(showCreate || editEntry) && (
        <APFormModal
          entry={editEntry ?? undefined}
          onClose={() => { setShowCreate(false); setEditEntry(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {selected && (
        <APDetailModal entry={selected} onClose={() => dispatch(setSelectedEntry(null))} />
      )}
    </div>
  );
}
