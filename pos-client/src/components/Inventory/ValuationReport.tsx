/**
 * @fileoverview ValuationReport Component - Total inventory value with category breakdown
 *
 * Financial report showing total inventory value (Σ(price × quantity)) with summary
 * statistics and detailed category breakdown table.
 *
 * @module components/Inventory/ValuationReport
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3C)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { useAppSelector } from '../../store/hooks';

/**
 * ValuationReport Component
 *
 * Displays inventory valuation with summary cards and category breakdown table.
 * Reads data from inventoryReports.valuation Redux slice.
 *
 * Summary Cards (top):
 * - Total Value (large green number)
 * - Total Items
 * - Categories Count
 *
 * Table Columns:
 * - Category Name
 * - Product Count
 * - Total Quantity
 * - Total Value (currency formatted)
 * - % of Total (percentage of overall inventory value)
 *
 * Features:
 * - Loading state
 * - Error state (red text)
 * - Empty state ("No valuation data available")
 * - Responsive grid layout for summary cards
 * - Sorted by category value (highest first)
 *
 * @component
 * @returns {JSX.Element} Valuation report with summary and table
 *
 * @example
 * <ValuationReport />
 *
 * @see {@link InventoryReportsPage} - Parent page
 */
const ValuationReport: React.FC = () => {
  const { data, isLoading, error } = useAppSelector(
    (state) => state.inventoryReports.valuation
  );

  const summaryCardStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  };

  const statStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '5px',
    textTransform: 'uppercase',
    fontWeight: 600,
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#28a745',
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
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

  if (isLoading) {
    return <div>Loading valuation report...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc3545' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div>No valuation data available</div>;
  }

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div>
      <h2>Inventory Valuation Report</h2>
      <p style={{ color: '#6c757d', marginBottom: '20px' }}>
        Total inventory value based on current stock levels and base prices
      </p>

      {/* Summary Cards */}
      <div style={summaryCardStyle}>
        <div style={statStyle}>
          <div style={statLabelStyle}>Total Value</div>
          <div style={statValueStyle}>{formatCurrency(data.total_value)}</div>
        </div>
        <div style={statStyle}>
          <div style={statLabelStyle}>Total Items</div>
          <div style={{ ...statValueStyle, color: '#007bff' }}>
            {data.total_items.toLocaleString()}
          </div>
        </div>
        <div style={statStyle}>
          <div style={statLabelStyle}>Categories</div>
          <div style={{ ...statValueStyle, color: '#6c757d' }}>
            {data.by_category.length}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <h3>Valuation by Category</h3>
      {data.by_category.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          <p>No categories with products found</p>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Products</th>
              <th style={thStyle}>Total Quantity</th>
              <th style={thStyle}>Total Value</th>
              <th style={thStyle}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {data.by_category.map((category) => (
              <tr key={category.category_id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{category.category_name}</td>
                <td style={tdStyle}>{category.product_count}</td>
                <td style={tdStyle}>{category.total_quantity.toLocaleString()}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#28a745' }}>
                  {formatCurrency(category.total_value)}
                </td>
                <td style={tdStyle}>
                  {calculatePercentage(category.total_value, data.total_value)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ValuationReport;
