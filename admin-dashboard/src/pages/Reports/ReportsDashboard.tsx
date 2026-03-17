import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api.client';

interface SalesSummary {
  today: number;
  this_week: number;
  this_month: number;
  today_count: number;
  this_week_count: number;
  this_month_count: number;
}

interface PaymentMethodBreakdown {
  payment_method: string;
  total_amount: number;
  count: number;
}

interface TopProduct {
  product_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
}

interface ReconciliationStatus {
  last_run_date: string | null;
  last_run_at: string | null;
  mismatches: number;
}

export const ReportsDashboard: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [salesRes, reconcRes] = await Promise.allSettled([
          apiClient.get('/transactions/summary'),
          apiClient.get(`/reconciliation?date=${today}`),
        ]);

        if (salesRes.status === 'fulfilled') {
          const d = salesRes.value.data.data;
          setSales(d.summary || null);
          setPaymentBreakdown(d.payment_breakdown || []);
          setTopProducts(d.top_products || []);
        }

        if (reconcRes.status === 'fulfilled') {
          const r = reconcRes.value.data.data;
          setReconciliation({
            last_run_date: r.date,
            last_run_at: r.run_at,
            mismatches: (r.summary?.local_only ?? 0) + (r.summary?.square_only ?? 0) + (r.summary?.amount_mismatches ?? 0),
          });
        } else {
          setReconciliation({ last_run_date: null, last_run_at: null, mismatches: 0 });
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [today]);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const methodLabel = (m: string) =>
    m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const methodColor: Record<string, string> = {
    cash: '#28a745',
    credit_card: '#0d6efd',
    debit_card: '#6610f2',
    check: '#fd7e14',
    gift_card: '#e83e8c',
  };

  const totalRevenue = paymentBreakdown.reduce((sum: number, p: PaymentMethodBreakdown) => sum + Number(p.total_amount), 0);

  if (loading) {
    return (
      <div style={s.page}>
        <h1 style={s.pageTitle}>Reports</h1>
        <div style={s.loadingMsg}>Loading report data…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>Reports</h1>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Sales Summary Cards */}
      <div style={s.cardRow}>
        <div style={s.card}>
          <div style={s.cardLabel}>Today's Sales</div>
          <div style={s.cardValue}>{fmtCurrency(sales?.today ?? 0)}</div>
          <div style={s.cardSub}>{sales?.today_count ?? 0} transactions</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>This Week</div>
          <div style={s.cardValue}>{fmtCurrency(sales?.this_week ?? 0)}</div>
          <div style={s.cardSub}>{sales?.this_week_count ?? 0} transactions</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>This Month</div>
          <div style={s.cardValue}>{fmtCurrency(sales?.this_month ?? 0)}</div>
          <div style={s.cardSub}>{sales?.this_month_count ?? 0} transactions</div>
        </div>
        <div style={{ ...s.card, borderColor: reconciliation && reconciliation.mismatches > 0 ? '#dc3545' : '#28a745' }}>
          <div style={s.cardLabel}>Reconciliation</div>
          {reconciliation?.last_run_at ? (
            <>
              <div style={{ ...s.cardValue, fontSize: 20, color: reconciliation.mismatches > 0 ? '#dc3545' : '#28a745' }}>
                {reconciliation.mismatches > 0 ? `${reconciliation.mismatches} mismatch${reconciliation.mismatches !== 1 ? 'es' : ''}` : 'All clear'}
              </div>
              <div style={s.cardSub}>
                Last run: {reconciliation.last_run_date} at{' '}
                {new Date(reconciliation.last_run_at).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...s.cardValue, fontSize: 20, color: '#999' }}>Not run today</div>
              <div style={s.cardSub}>Run via POST /reconciliation/run</div>
            </>
          )}
        </div>
      </div>

      <div style={s.twoCol}>
        {/* Payment Method Breakdown */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Payment Method Breakdown</h2>
          {paymentBreakdown.length === 0 ? (
            <p style={s.emptyMsg}>No payment data for current period</p>
          ) : (
            <>
              {paymentBreakdown.map((item) => {
                const pct = totalRevenue > 0 ? (Number(item.total_amount) / totalRevenue) * 100 : 0;
                const color = methodColor[item.payment_method] || '#6c757d';
                return (
                  <div key={item.payment_method} style={s.barRow}>
                    <div style={s.barLabel}>
                      <span style={{ ...s.dot, background: color }} />
                      {methodLabel(item.payment_method)}
                    </div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
                    </div>
                    <div style={s.barMeta}>
                      <span>{fmtCurrency(Number(item.total_amount))}</span>
                      <span style={s.barCount}>{item.count} txns</span>
                    </div>
                  </div>
                );
              })}
              <div style={s.totalRow}>
                <span>Total Revenue</span>
                <strong>{fmtCurrency(totalRevenue)}</strong>
              </div>
            </>
          )}
        </div>

        {/* Top Products */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Top Products by Revenue</h2>
          {topProducts.length === 0 ? (
            <p style={s.emptyMsg}>No product data for current period</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Qty Sold</th>
                  <th style={s.th}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 10).map((p, i) => (
                  <tr key={i} style={s.tr}>
                    <td style={{ ...s.td, color: '#999', fontWeight: 600 }}>{i + 1}</td>
                    <td style={s.td}>{p.product_name}</td>
                    <td style={s.td}>{p.category_name || '—'}</td>
                    <td style={s.td}>{p.quantity_sold}</td>
                    <td style={s.td}>{fmtCurrency(Number(p.total_revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { padding: 24, fontFamily: 'system-ui, sans-serif' },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#333', marginBottom: 20, marginTop: 0 },
  loadingMsg: { textAlign: 'center', padding: 40, color: '#999', fontSize: 16 },
  errorBanner: { background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 14 },
  cardRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  card: { background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 20 },
  cardLabel: { fontSize: 13, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 700, color: '#333', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#999' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  section: { background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#333', marginTop: 0, marginBottom: 16 },
  emptyMsg: { color: '#999', fontSize: 14, textAlign: 'center', padding: '20px 0' },
  barRow: { marginBottom: 14 },
  barLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#444', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  barTrack: { height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 0.3s ease' },
  barMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555' },
  barCount: { color: '#999' },
  totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#333', borderTop: '1px solid #dee2e6', paddingTop: 12, marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#f8f9fa' },
  th: { padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #dee2e6' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '8px 10px', color: '#333' },
};

export default ReportsDashboard;
