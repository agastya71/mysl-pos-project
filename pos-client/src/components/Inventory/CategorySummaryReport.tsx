/**
 * @fileoverview CategorySummaryReport Component - Inventory summary grouped by category
 *
 * Table report showing aggregated inventory statistics per category.
 * Provides high-level overview of stock health by product category.
 *
 * @module components/Inventory/CategorySummaryReport
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3C)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { useAppSelector } from '../../store/hooks';

/**
 * CategorySummaryReport Component
 *
 * Displays inventory summary grouped by category in table format.
 * Reads data from inventoryReports.categorySummary Redux slice.
 *
 * Table Columns:
 * - Category Name
 * - Product Count
 * - Total Stock
 * - Low Stock Count (yellow badge if > 0, green if 0)
 * - Out of Stock Count (badge)
 * - Total Value (currency formatted)
 *
 * Features:
 * - Loading state
 * - Error state (red text)
 * - Empty state ("No categories found")
 * - Color-coded badges for stock alerts
 * - Sorted by category name
 *
 * @component
 * @returns {JSX.Element} Category summary report table or state view
 *
 * @example
 * <CategorySummaryReport />
 *
 * @see {@link InventoryReportsPage} - Parent page
 */
const CategorySummaryReport: React.FC = () => {
  const { data, isLoading, error } = useAppSelector(
    (state) => state.inventoryReports.categorySummary
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

  const badgeStyle = (count: number): React.CSSProperties => ({
    backgroundColor: count > 0 ? '#ffc107' : '#28a745',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-block',
  });

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return <div>Loading category summary...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <h3>No Categories Found</h3>
        <p>No categories with products are currently active.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Category Summary Report</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Inventory statistics grouped by category ({data.length} categories)
      </p>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Products</th>
            <th style={thStyle}>Total Quantity</th>
            <th style={thStyle}>Total Value</th>
            <th style={thStyle}>Avg Value/Item</th>
            <th style={thStyle}>Low Stock</th>
            <th style={thStyle}>Out of Stock</th>
            <th style={thStyle}>Health</th>
          </tr>
        </thead>
        <tbody>
          {data.map((category) => {
            const hasIssues = category.low_stock_count > 0 || category.out_of_stock_count > 0;
            return (
              <tr key={category.category_id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{category.category_name}</td>
                <td style={tdStyle}>{category.product_count}</td>
                <td style={tdStyle}>{category.total_quantity.toLocaleString()}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#28a745' }}>
                  {formatCurrency(category.total_value)}
                </td>
                <td style={tdStyle}>
                  {formatCurrency(category.average_value_per_item)}
                </td>
                <td style={tdStyle}>
                  {category.low_stock_count > 0 ? (
                    <span style={{ color: '#ffc107', fontWeight: 600 }}>
                      {category.low_stock_count}
                    </span>
                  ) : (
                    <span style={{ color: '#6c757d' }}>0</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {category.out_of_stock_count > 0 ? (
                    <span style={{ color: '#dc3545', fontWeight: 600 }}>
                      {category.out_of_stock_count}
                    </span>
                  ) : (
                    <span style={{ color: '#6c757d' }}>0</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={badgeStyle(hasIssues ? 1 : 0)}>
                    {hasIssues ? '⚠️ Needs Attention' : '✅ Good'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Stats */}
      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
              Total Products
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
              {data.reduce((sum, cat) => sum + cat.product_count, 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
              Total Inventory Value
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
              {formatCurrency(data.reduce((sum, cat) => sum + cat.total_value, 0))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
              Total Low Stock Items
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
              {data.reduce((sum, cat) => sum + cat.low_stock_count, 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
              Total Out of Stock
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              {data.reduce((sum, cat) => sum + cat.out_of_stock_count, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySummaryReport;
