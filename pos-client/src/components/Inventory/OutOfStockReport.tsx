/**
 * Out of Stock Report Component
 *
 * Displays products with zero quantity
 */

import React from 'react';
import { useAppSelector } from '../../store/hooks';

const OutOfStockReport: React.FC = () => {
  const { data, isLoading, error } = useAppSelector(
    (state) => state.inventoryReports.outOfStock
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

  const urgentBadgeStyle: React.CSSProperties = {
    backgroundColor: '#dc3545',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  };

  if (isLoading) {
    return <div>Loading out of stock report...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <h3>✅ No Out of Stock Items</h3>
        <p>All products have inventory available.</p>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <h2>Out of Stock Report</h2>
      <p style={{ color: '#dc3545', marginBottom: '20px', fontWeight: 600 }}>
        ⚠️ URGENT: {data.length} product(s) completely out of stock
      </p>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>SKU</th>
            <th style={thStyle}>Product Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Recommended Order</th>
            <th style={thStyle}>Last Sale Date</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((product) => (
            <tr key={product.id}>
              <td style={tdStyle}>{product.sku}</td>
              <td style={tdStyle}>{product.name}</td>
              <td style={tdStyle}>{product.category_name || '-'}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                {product.reorder_quantity} units
              </td>
              <td style={tdStyle}>{formatDate(product.last_sale_date)}</td>
              <td style={tdStyle}>
                <span style={urgentBadgeStyle}>🔴 OUT OF STOCK</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OutOfStockReport;
