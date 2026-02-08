/**
 * Low Stock Report Component
 *
 * Displays products below reorder level
 */

import React from 'react';
import { useAppSelector } from '../../store/hooks';

const LowStockReport: React.FC = () => {
  const { data, isLoading, error } = useAppSelector(
    (state) => state.inventoryReports.lowStock
  );

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

  const badgeStyle = (level: 'critical' | 'warning'): React.CSSProperties => ({
    backgroundColor: level === 'critical' ? '#dc3545' : '#ffc107',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  });

  if (isLoading) {
    return <div>Loading low stock report...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <h3>✅ No Low Stock Items</h3>
        <p>All products are adequately stocked above their reorder levels.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Low Stock Report</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Products where current stock is at or below reorder level ({data.length} items)
      </p>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>SKU</th>
            <th style={thStyle}>Product Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Current Stock</th>
            <th style={thStyle}>Reorder Level</th>
            <th style={thStyle}>Recommended Order</th>
            <th style={thStyle}>Stock Value</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((product) => {
            const isCritical = product.quantity_in_stock <= product.reorder_level / 2;
            return (
              <tr key={product.id}>
                <td style={tdStyle}>{product.sku}</td>
                <td style={tdStyle}>{product.name}</td>
                <td style={tdStyle}>{product.category_name || '-'}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: isCritical ? '#dc3545' : '#ffc107' }}>
                  {product.quantity_in_stock}
                </td>
                <td style={tdStyle}>{product.reorder_level}</td>
                <td style={tdStyle}>{product.reorder_quantity}</td>
                <td style={tdStyle}>
                  ${product.stock_value.toFixed(2)}
                </td>
                <td style={tdStyle}>
                  <span style={badgeStyle(isCritical ? 'critical' : 'warning')}>
                    {isCritical ? '🔴 CRITICAL' : '⚠️ LOW'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LowStockReport;
