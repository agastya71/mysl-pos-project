import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchVendorPayments, setPage } from '../store/slices/vendorPayments.slice';
import type { VendorPayment } from '../types/vendorPayments.types';
import ApprovePaymentModal from '../components/VendorPayments/ApprovePaymentModal';
import VoidPaymentModal from '../components/VendorPayments/VoidPaymentModal';

const statusColors: Record<VendorPayment['status'], string> = {
  pending: '#f59e0b',
  cleared: '#16a34a',
  void: '#94a3b8',
  cancelled: '#ef4444',
};

const styles = {
  container: { padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  table: {
    width: '100%', borderCollapse: 'collapse' as const, background: '#fff',
    borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '12px 16px', textAlign: 'left' as const,
    background: '#f1f5f9', fontWeight: '600', color: '#475569',
    fontSize: '13px', textTransform: 'uppercase' as const,
  },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '12px 16px', marginBottom: '16px', color: '#dc2626',
  },
  spinner: { textAlign: 'center' as const, padding: '48px', color: '#94a3b8' },
  empty: { padding: '12px 16px', textAlign: 'center' as const, color: '#94a3b8' },
  pagination: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px' },
  pageInfo: { color: '#64748b', fontSize: '14px' },
};

export default function VendorPaymentsPage() {
  const dispatch = useAppDispatch();
  const { payments, vendors, total, page, limit, loading, error } =
    useAppSelector((state) => state.vendorPayments);
  const user = useAppSelector((state) => state.auth.user);
  const [approveTarget, setApproveTarget] = useState<VendorPayment | null>(null);
  const [voidTarget, setVoidTarget] = useState<VendorPayment | null>(null);

  useEffect(() => {
    if (!user || user.role === 'cashier') return;
    dispatch(fetchVendorPayments({ page, limit }));
  }, [dispatch, page, limit, user]);

  const vendorMap = useMemo(
    () => new Map(vendors.map((v) => [v.id, v.business_name])),
    [vendors]
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (user?.role === 'cashier') return <Navigate to="/pos" replace />;

  const handleSuccess = () => {
    setApproveTarget(null);
    setVoidTarget(null);
    dispatch(fetchVendorPayments({ page, limit }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Vendor Payments</h1>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

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
                <tr><td colSpan={7} style={styles.empty}>No payments found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>{p.payment_number}</td>
                    <td style={styles.td}>{vendorMap.get(p.vendor_id) ?? p.vendor_id}</td>
                    <td style={styles.td}>${parseFloat(p.total_amount).toFixed(2)}</td>
                    <td style={styles.td}>{p.payment_method.toUpperCase()}</td>
                    <td style={styles.td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: '600', color: '#fff',
                        background: statusColors[p.status],
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>{p.payment_date}</td>
                    <td style={styles.td}>
                      {p.status === 'pending' && (
                        <button
                          onClick={() => setApproveTarget(p)}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }}
                        >
                          Approve
                        </button>
                      )}
                      {(p.status === 'pending' || p.status === 'cleared') && (
                        <button
                          onClick={() => setVoidTarget(p)}
                          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={styles.pagination}>
            <span style={styles.pageInfo}>{total} total</span>
            <button
              disabled={page <= 1}
              onClick={() => dispatch(setPage(page - 1))}
              style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#94a3b8' : '#1e293b' }}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => dispatch(setPage(page + 1))}
              style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: page >= totalPages ? '#94a3b8' : '#1e293b' }}
            >
              Next
            </button>
          </div>
        </>
      )}

      {approveTarget && (
        <ApprovePaymentModal
          payment={approveTarget}
          vendorName={vendorMap.get(approveTarget.vendor_id) ?? approveTarget.vendor_id}
          onClose={() => setApproveTarget(null)}
          onSuccess={handleSuccess}
        />
      )}

      {voidTarget && (
        <VoidPaymentModal
          payment={voidTarget}
          vendorName={vendorMap.get(voidTarget.vendor_id) ?? voidTarget.vendor_id}
          onClose={() => setVoidTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
