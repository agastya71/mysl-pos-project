/**
 * Inventory History Page
 *
 * View all inventory adjustments with filters
 */

import React, { useEffect, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAdjustments, setPage } from '../store/slices/inventory.slice';
import Pagination from '../components/common/Pagination';

export const InventoryHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { adjustments, pagination, loading } = useAppSelector(
    (state) => state.inventory
  );

  useEffect(() => {
    dispatch(fetchAdjustments());
  }, [dispatch, pagination.page]);

  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
  };

  const getAdjustmentTypeBadge = (type: string): CSSProperties => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontWeight: 600,
      fontSize: '12px',
    };

    switch (type) {
      case 'damage':
        return { ...baseStyle, backgroundColor: '#ffebee', color: '#c62828' };
      case 'theft':
        return { ...baseStyle, backgroundColor: '#fce4ec', color: '#880e4f' };
      case 'found':
        return { ...baseStyle, backgroundColor: '#e8f5e9', color: '#2e7d32' };
      case 'correction':
        return { ...baseStyle, backgroundColor: '#e3f2fd', color: '#1976d2' };
      case 'initial':
        return { ...baseStyle, backgroundColor: '#f3e5f5', color: '#6a1b9a' };
      default:
        return { ...baseStyle, backgroundColor: '#f5f5f5', color: '#666' };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => navigate('/inventory')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
            }}
          >
            ← Back to Inventory
          </button>
          <h1 style={styles.title}>Adjustment History</h1>
        </div>
      </div>

      <div style={styles.container}>
        {loading ? (
          <div style={styles.loading}>Loading adjustments...</div>
        ) : adjustments.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No inventory adjustments found.</p>
            <button
              onClick={() => navigate('/inventory')}
              style={styles.primaryButton}
            >
              Create First Adjustment
            </button>
          </div>
        ) : (
          <>
            {/* Adjustments Table */}
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Adjustment #</th>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Product</th>
                    <th style={styles.tableHeader}>Type</th>
                    <th style={styles.tableHeader}>Change</th>
                    <th style={styles.tableHeader}>Quantity</th>
                    <th style={styles.tableHeader}>Adjusted By</th>
                    <th style={styles.tableHeader}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adjustment) => (
                    <tr key={adjustment.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <strong>{adjustment.adjustment_number}</strong>
                      </td>
                      <td style={styles.tableCell}>
                        {formatDate(adjustment.adjustment_date)}
                      </td>
                      <td style={styles.tableCell}>
                        <div>{adjustment.product_name}</div>
                        <div style={styles.sku}>{adjustment.product_sku}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={getAdjustmentTypeBadge(adjustment.adjustment_type)}>
                          {adjustment.adjustment_type}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.changeBadge,
                            ...(adjustment.quantity_change > 0
                              ? styles.changePositive
                              : styles.changeNegative),
                          }}
                        >
                          {adjustment.quantity_change > 0 ? '+' : ''}
                          {adjustment.quantity_change}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.quantityChange}>
                          {adjustment.old_quantity} → {adjustment.new_quantity}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{adjustment.adjuster_name}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.reason}>{adjustment.reason}</div>
                        {adjustment.notes && (
                          <div style={styles.notes}>Note: {adjustment.notes}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '2px solid #eee',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    margin: 0,
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 40px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },
  tableHeader: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    color: '#495057',
  },
  tableRow: {
    borderBottom: '1px solid #dee2e6',
  },
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#333',
  },
  sku: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  changeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '14px',
  },
  changePositive: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  changeNegative: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  quantityChange: {
    fontSize: '14px',
    color: '#666',
  },
  reason: {
    fontSize: '14px',
    color: '#333',
    maxWidth: '300px',
  },
  notes: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
    fontStyle: 'italic',
  },
};
