import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '../../store';
import { fetchVendorPayments, setPage } from '../../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../../types/vendorPayments.types';
import ApprovePaymentModal from './ApprovePaymentModal';
import VoidPaymentModal from './VoidPaymentModal';
import VPCreateModal from './VPCreateModal';
import VPDetailModal from './VPDetailModal';

const statusColors: Record<VendorPayment['status'], string> = {
  pending: '#f59e0b', cleared: '#16a34a', void: '#94a3b8', cancelled: '#ef4444',
};

const styles = {
  container: { padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  headerBtns: { display: 'flex', gap: '10px' },
  btn: (color: string) => ({ padding: '8px 18px', background: color, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }),
  table: { width: '100%', borderCollapse: 'collapse' as const, background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  th: { padding: '12px 16px', textAlign: 'left' as const, background: '#f1f5f9', fontWeight: '600', color: '#475569', fontSize: '13px', textTransform: 'uppercase' as const },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  actionBtn: (color: string) => ({ background: color, color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }),
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
};

export default function VPListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { payments, total, page, limit, loading, error } = useSelector((s: RootState) => s.vendorPayments);
  const vendors = useSelector((s: RootState) => s.accountsPayable.vendors);
  const [approveTarget, setApproveTarget] = useState<VendorPayment | null>(null);
  const [voidTarget, setVoidTarget] = useState<VendorPayment | null>(null);
  const [viewTarget, setViewTarget] = useState<VendorPayment | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ vendor_id: '', status: '', start_date: '', end_date: '', payment_method: '' });

  useEffect(() => { dispatch(fetchVendorPayments({ page, limit })); }, [dispatch, page, limit]);

  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.business_name])), [vendors]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSuccess = () => {
    setApproveTarget(null);
    setVoidTarget(null);
    setShowCreate(false);
    dispatch(fetchVendorPayments({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Vendor Payments</h1>
        <div style={styles.headerBtns}>
          <button style={styles.btn('#64748b')} onClick={() => navigate('/finance/vendor-payments/batch')}>Batch Payment</button>
          <button style={styles.btn('#3b82f6')} onClick={() => setShowCreate(true)}>+ New Payment</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <select value={filters.vendor_id} onChange={e => { const v = e.target.value; setFilters(f => ({...f, vendor_id: v})); dispatch(fetchVendorPayments({ vendor_id: v || undefined, page: 1, limit })); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
        </select>
        <select value={filters.status} onChange={e => { const v = e.target.value; setFilters(f => ({...f, status: v})); dispatch(fetchVendorPayments({ status: v || undefined, page: 1, limit })); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="cleared">Cleared</option>
          <option value="void">Void</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filters.payment_method} onChange={e => { const v = e.target.value; setFilters(f => ({...f, payment_method: v})); dispatch(fetchVendorPayments({ page: 1, limit })); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
          <option value="">All Methods</option>
          <option value="check">Check</option>
          <option value="ach">ACH</option>
          <option value="wire">Wire</option>
          <option value="credit_card">Credit Card</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
        <input type="date" value={filters.start_date} onChange={e => { const v = e.target.value; setFilters(f => ({...f, start_date: v})); dispatch(fetchVendorPayments({ start_date: v || undefined, page: 1, limit })); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
        <input type="date" value={filters.end_date} onChange={e => { const v = e.target.value; setFilters(f => ({...f, end_date: v})); dispatch(fetchVendorPayments({ end_date: v || undefined, page: 1, limit })); }} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#dc2626' }}>{error}</div>}

      {loading ? (
        <div style={styles.spinner}>Loading...</div>
      ) : (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Payment #</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8' }}>No payments found.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td style={styles.td}>{p.payment_number}</td>
                  <td style={styles.td}>{vendorMap.get(p.vendor_id) ?? p.vendor_id}</td>
                  <td style={styles.td}>${parseFloat(p.payment_amount).toFixed(2)}</td>
                  <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                  <td style={styles.td}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: '#fff', background: statusColors[p.status] }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={styles.td}>{p.payment_date}</td>
                  <td style={styles.td}>
                    <button style={styles.actionBtn('#475569')} onClick={() => setViewTarget(p)}>View</button>
                    {p.status === 'pending' && <button style={styles.actionBtn('#16a34a')} onClick={() => setApproveTarget(p)}>Approve</button>}
                    {(p.status === 'pending' || p.status === 'cleared') && <button style={styles.actionBtn('#ef4444')} onClick={() => setVoidTarget(p)}>Void</button>}
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

      {approveTarget && <ApprovePaymentModal payment={approveTarget} vendorName={vendorMap.get(approveTarget.vendor_id) ?? approveTarget.vendor_id} onClose={() => setApproveTarget(null)} onSuccess={handleSuccess} />}
      {voidTarget && <VoidPaymentModal payment={voidTarget} vendorName={vendorMap.get(voidTarget.vendor_id) ?? voidTarget.vendor_id} onClose={() => setVoidTarget(null)} onSuccess={handleSuccess} />}
      {showCreate && <VPCreateModal onClose={() => setShowCreate(false)} onSuccess={handleSuccess} />}
      {viewTarget && <VPDetailModal paymentId={viewTarget.id} vendorName={vendorMap.get(viewTarget.vendor_id) ?? viewTarget.vendor_id} onClose={() => setViewTarget(null)} />}
    </div>
  );
}
