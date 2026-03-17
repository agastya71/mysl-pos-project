import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { apiClient } from '../../services/api.client';
import { RootState } from '../../store';

interface TransactionItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Payment {
  id: string;
  payment_method: string;
  amount: number;
  status: string;
  card_last_four?: string;
  card_type?: string;
}

interface Transaction {
  id: string;
  transaction_number: string;
  created_at: string;
  cashier_name: string;
  total_amount: number;
  status: string;
  payment_methods: string[];
  items?: TransactionItem[];
  payments?: Payment[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
}

export const TransactionList: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const canRefund = user?.role === 'manager' || user?.role === 'admin';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ status: '', dateFrom: '', dateTo: '', paymentMethod: '' });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [refundTxn, setRefundTxn] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);

      const res = await apiClient.get(`/transactions?${params.toString()}`);
      setTransactions(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchTransactions(1);
  }, [fetchTransactions]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/transactions/${id}`);
      setDetail(res.data.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailId(null); setDetail(null); };

  const openRefund = (txn: Transaction) => {
    setRefundTxn(txn);
    setRefundAmount(String(txn.total_amount));
    setRefundReason('');
    setRefundError(null);
  };

  const closeRefund = () => { setRefundTxn(null); setRefundAmount(''); setRefundReason(''); setRefundError(null); };

  const submitRefund = async () => {
    if (!refundTxn) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > refundTxn.total_amount) {
      setRefundError(`Amount must be between $0.01 and $${refundTxn.total_amount.toFixed(2)}`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundError('Reason is required');
      return;
    }
    setRefundLoading(true);
    setRefundError(null);
    try {
      await apiClient.post(`/transactions/${refundTxn.id}/refund`, { amount, reason: refundReason.trim() });
      closeRefund();
      void fetchTransactions(meta.page);
    } catch (err: any) {
      setRefundError(err.response?.data?.error?.message || 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return '#28a745';
      case 'voided': return '#6c757d';
      case 'refunded': return '#fd7e14';
      case 'partially_refunded': return '#ffc107';
      default: return '#333';
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Transactions</h1>
      </div>

      {/* Filters */}
      <div style={s.filterBar}>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={s.select}>
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="voided">Voided</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </select>
        <select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })} style={s.select}>
          <option value="">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="check">Check</option>
          <option value="gift_card">Gift Card</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} style={s.input} placeholder="From" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} style={s.input} placeholder="To" />
        <button onClick={() => setFilters({ status: '', dateFrom: '', dateTo: '', paymentMethod: '' })} style={s.btnSecondary}>Clear</button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              <th style={s.th}>Transaction #</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Cashier</th>
              <th style={s.th}>Total</th>
              <th style={s.th}>Payment Method(s)</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={s.centered}>Loading…</td></tr>
            )}
            {!loading && transactions.length === 0 && (
              <tr><td colSpan={7} style={s.centered}>No transactions found</td></tr>
            )}
            {!loading && transactions.map((txn) => (
              <tr key={txn.id} style={s.tr}>
                <td style={s.td}><code>{txn.transaction_number}</code></td>
                <td style={s.td}>{new Date(txn.created_at).toLocaleString()}</td>
                <td style={s.td}>{txn.cashier_name}</td>
                <td style={s.td}>${Number(txn.total_amount).toFixed(2)}</td>
                <td style={s.td}>{(txn.payment_methods || []).join(', ') || '—'}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, color: statusColor(txn.status), borderColor: statusColor(txn.status) }}>
                    {txn.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={s.td}>
                  <button onClick={() => openDetail(txn.id)} style={s.btnSmall}>Details</button>
                  {canRefund && txn.status === 'completed' && (
                    <button onClick={() => openRefund(txn)} style={{ ...s.btnSmall, ...s.btnDanger, marginLeft: 6 }}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={s.pagination}>
          <button disabled={meta.page <= 1} onClick={() => fetchTransactions(meta.page - 1)} style={s.btnSecondary}>← Prev</button>
          <span style={s.pageInfo}>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <button disabled={meta.page >= meta.totalPages} onClick={() => fetchTransactions(meta.page + 1)} style={s.btnSecondary}>Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div style={s.overlay} onClick={closeDetail}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Transaction Detail</h2>
              <button onClick={closeDetail} style={s.closeBtn}>✕</button>
            </div>
            {detailLoading && <p style={s.centered}>Loading…</p>}
            {!detailLoading && detail && (
              <>
                <div style={s.detailMeta}>
                  <span><strong>#{detail.transaction_number}</strong></span>
                  <span>{new Date(detail.created_at).toLocaleString()}</span>
                  <span>Cashier: {detail.cashier_name}</span>
                  <span style={{ color: statusColor(detail.status) }}>{detail.status.replace('_', ' ')}</span>
                </div>

                <h3 style={s.sectionTitle}>Items</h3>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Product</th>
                      <th style={s.th}>Qty</th>
                      <th style={s.th}>Unit Price</th>
                      <th style={s.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((item) => (
                      <tr key={item.id} style={s.tr}>
                        <td style={s.td}>{item.product_name}</td>
                        <td style={s.td}>{item.quantity}</td>
                        <td style={s.td}>${Number(item.unit_price).toFixed(2)}</td>
                        <td style={s.td}>${Number(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={s.sectionTitle}>Payments</h3>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Method</th>
                      <th style={s.th}>Amount</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.payments || []).map((p) => (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}>{p.payment_method.replace('_', ' ')}</td>
                        <td style={s.td}>${Number(p.amount).toFixed(2)}</td>
                        <td style={s.td}>{p.status}</td>
                        <td style={s.td}>{p.card_last_four ? `${p.card_type} ···${p.card_last_four}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={s.detailTotal}>
                  Total: <strong>${Number(detail.total_amount).toFixed(2)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTxn && (
        <div style={s.overlay} onClick={closeRefund}>
          <div style={{ ...s.modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Refund Transaction</h2>
              <button onClick={closeRefund} style={s.closeBtn}>✕</button>
            </div>
            <p style={{ color: '#555', marginBottom: 16 }}>
              Transaction <strong>#{refundTxn.transaction_number}</strong> — Original total:{' '}
              <strong>${Number(refundTxn.total_amount).toFixed(2)}</strong>
            </p>
            <label style={s.label}>Refund Amount ($)</label>
            <input
              type="number"
              min="0.01"
              max={refundTxn.total_amount}
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              style={s.input}
            />
            <label style={{ ...s.label, marginTop: 12 }}>Reason <span style={{ color: '#dc3545' }}>*</span></label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              style={{ ...s.input, resize: 'vertical' as const }}
              placeholder="Required"
            />
            {refundError && <div style={s.errorBanner}>{refundError}</div>}
            <div style={s.modalFooter}>
              <button onClick={closeRefund} style={s.btnSecondary} disabled={refundLoading}>Cancel</button>
              <button onClick={submitRefund} style={s.btnDangerFull} disabled={refundLoading}>
                {refundLoading ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { padding: '24px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#333', margin: 0 },
  filterBar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
  select: { padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14, background: '#fff' },
  input: { padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: 4, marginBottom: 12, fontSize: 14 },
  tableWrap: { overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#f8f9fa' },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #dee2e6' },
  td: { padding: '10px 12px', color: '#333', verticalAlign: 'middle' },
  centered: { textAlign: 'center', padding: '24px', color: '#999' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, border: '1px solid', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' },
  btnSmall: { padding: '4px 10px', borderRadius: 4, border: '1px solid #0d6efd', background: '#fff', color: '#0d6efd', cursor: 'pointer', fontSize: 13 },
  btnDanger: { border: '1px solid #dc3545', color: '#dc3545', background: '#fff' },
  btnDangerFull: { padding: '8px 20px', borderRadius: 4, border: 'none', background: '#dc3545', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnSecondary: { padding: '6px 14px', borderRadius: 4, border: '1px solid #6c757d', background: '#fff', color: '#6c757d', cursor: 'pointer', fontSize: 14 },
  pagination: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 16 },
  pageInfo: { color: '#555', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 8, width: '90%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto', padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666', lineHeight: 1 },
  detailMeta: { display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: '#f8f9fa', borderRadius: 4, fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: '16px 0 8px', color: '#444' },
  detailTotal: { textAlign: 'right', marginTop: 12, fontSize: 16, color: '#333' },
  modalFooter: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 4 },
};

export default TransactionList;
