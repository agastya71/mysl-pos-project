/**
 * Movement Report Component
 *
 * Displays inventory movements over a date range
 */

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMovementReport, setMovementFilters } from '../../store/slices/inventory-reports.slice';

const MovementReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data, filters, isLoading, error } = useAppSelector(
    (state) => state.inventoryReports.movement
  );

  const [startDate, setStartDate] = useState(filters.start_date);
  const [endDate, setEndDate] = useState(filters.end_date);

  useEffect(() => {
    // Load report with current filters
    dispatch(fetchMovementReport(filters));
  }, [dispatch, filters]);

  const handleApplyFilters = () => {
    dispatch(setMovementFilters({ start_date: startDate, end_date: endDate }));
    dispatch(fetchMovementReport({ start_date: startDate, end_date: endDate }));
  };

  const filterStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#495057',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: '14px',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 600,
    borderBottom: '2px solid #dee2e6',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return '#28a745';
    if (change < 0) return '#dc3545';
    return '#6c757d';
  };

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Inventory Movement Report</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Track inventory changes from sales and adjustments over a date range
      </p>

      {/* Date Range Filters */}
      <div style={filterStyle}>
        <div style={inputGroupStyle}>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={inputGroupStyle}>
          <label style={labelStyle}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleApplyFilters}
          style={buttonStyle}
          disabled={isLoading}
          onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0056b3')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#007bff')}
        >
          {isLoading ? 'Loading...' : 'Apply Filters'}
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div>Loading movement report...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <h3>No Movements Found</h3>
          <p>No inventory changes detected for the selected date range.</p>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Product Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Opening</th>
              <th style={thStyle}>Sales</th>
              <th style={thStyle}>Adjustments</th>
              <th style={thStyle}>Closing</th>
              <th style={thStyle}>Net Change</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.product_id}>
                <td style={tdStyle}>{item.sku}</td>
                <td style={tdStyle}>{item.product_name}</td>
                <td style={tdStyle}>{item.category_name || '-'}</td>
                <td style={tdStyle}>{item.opening_stock}</td>
                <td style={{ ...tdStyle, color: '#dc3545' }}>
                  {item.sales_quantity > 0 ? `-${item.sales_quantity}` : '0'}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    color: item.adjustment_quantity >= 0 ? '#28a745' : '#dc3545',
                  }}
                >
                  {item.adjustment_quantity >= 0 ? `+${item.adjustment_quantity}` : item.adjustment_quantity}
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.closing_stock}</td>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: getChangeColor(item.net_change),
                  }}
                >
                  {item.net_change >= 0 ? `+${item.net_change}` : item.net_change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MovementReport;
