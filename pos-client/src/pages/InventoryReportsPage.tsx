/**
 * Inventory Reports Page
 *
 * Dashboard for viewing inventory reports (Phase 3C)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchLowStockReport,
  fetchOutOfStockReport,
  fetchValuationReport,
  fetchCategorySummary,
} from '../store/slices/inventory-reports.slice';
import LowStockReport from '../components/Inventory/LowStockReport';
import OutOfStockReport from '../components/Inventory/OutOfStockReport';
import ValuationReport from '../components/Inventory/ValuationReport';
import MovementReport from '../components/Inventory/MovementReport';
import CategorySummaryReport from '../components/Inventory/CategorySummaryReport';

type ReportTab = 'overview' | 'low-stock' | 'out-of-stock' | 'valuation' | 'movement' | 'category';

const InventoryReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  const { lowStock, outOfStock, valuation } = useAppSelector(
    (state) => state.inventoryReports
  );

  // Load initial data
  useEffect(() => {
    dispatch(fetchLowStockReport());
    dispatch(fetchOutOfStockReport());
    dispatch(fetchValuationReport());
    dispatch(fetchCategorySummary());
  }, [dispatch]);

  const handleBackToInventory = () => {
    navigate('/inventory');
  };

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const backButtonStyle: React.CSSProperties = {
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '20px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  };

  const summaryCardsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '10px',
    textTransform: 'uppercase',
    fontWeight: 600,
  };

  const cardValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '5px',
  };

  const cardSubtextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6c757d',
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #e9ecef',
    paddingBottom: '10px',
  };

  const getTabStyle = (tab: ReportTab): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
    color: activeTab === tab ? '#fff' : '#495057',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  });

  const contentStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const alertStyle = (type: 'danger' | 'warning'): React.CSSProperties => ({
    backgroundColor: type === 'danger' ? '#f8d7da' : '#fff3cd',
    color: type === 'danger' ? '#721c24' : '#856404',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    display: 'inline-block',
  });

  return (
    <div style={containerStyle}>
      {/* Back Button */}
      <button
        onClick={handleBackToInventory}
        style={backButtonStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a6268')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6c757d')}
      >
        ← Back to Inventory
      </button>

      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>Inventory Reports</h1>
      </div>

      {/* Overview Tab - Summary Cards */}
      {activeTab === 'overview' && (
        <>
          <div style={summaryCardsStyle}>
            {/* Total Inventory Value */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Total Inventory Value</div>
              <div style={{ ...cardValueStyle, color: '#28a745' }}>
                {valuation.isLoading
                  ? 'Loading...'
                  : valuation.data
                  ? `$${valuation.data.total_value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : '$0.00'}
              </div>
              <div style={cardSubtextStyle}>
                {valuation.data?.total_items || 0} items in stock
              </div>
            </div>

            {/* Low Stock Items */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Low Stock Items</div>
              <div style={{ ...cardValueStyle, color: '#ffc107' }}>
                {lowStock.isLoading ? '...' : lowStock.data.length}
              </div>
              <div style={cardSubtextStyle}>
                {lowStock.data.length > 0 ? (
                  <span style={alertStyle('warning')}>⚠️ Needs attention</span>
                ) : (
                  'All products adequately stocked'
                )}
              </div>
            </div>

            {/* Out of Stock Items */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Out of Stock Items</div>
              <div style={{ ...cardValueStyle, color: '#dc3545' }}>
                {outOfStock.isLoading ? '...' : outOfStock.data.length}
              </div>
              <div style={cardSubtextStyle}>
                {outOfStock.data.length > 0 ? (
                  <span style={alertStyle('danger')}>🔴 Urgent</span>
                ) : (
                  'No products out of stock'
                )}
              </div>
            </div>

            {/* Categories */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>Categories</div>
              <div style={{ ...cardValueStyle, color: '#007bff' }}>
                {valuation.data?.by_category.length || 0}
              </div>
              <div style={cardSubtextStyle}>
                Active categories with products
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div style={tabsStyle}>
        <button
          style={getTabStyle('overview')}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={getTabStyle('low-stock')}
          onClick={() => setActiveTab('low-stock')}
        >
          Low Stock ({lowStock.data.length})
        </button>
        <button
          style={getTabStyle('out-of-stock')}
          onClick={() => setActiveTab('out-of-stock')}
        >
          Out of Stock ({outOfStock.data.length})
        </button>
        <button
          style={getTabStyle('valuation')}
          onClick={() => setActiveTab('valuation')}
        >
          Valuation
        </button>
        <button
          style={getTabStyle('movement')}
          onClick={() => setActiveTab('movement')}
        >
          Movement
        </button>
        <button
          style={getTabStyle('category')}
          onClick={() => setActiveTab('category')}
        >
          Category Summary
        </button>
      </div>

      {/* Report Content */}
      <div style={contentStyle}>
        {activeTab === 'low-stock' && <LowStockReport />}
        {activeTab === 'out-of-stock' && <OutOfStockReport />}
        {activeTab === 'valuation' && <ValuationReport />}
        {activeTab === 'movement' && <MovementReport />}
        {activeTab === 'category' && <CategorySummaryReport />}
        {activeTab === 'overview' && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <h2>Select a report from the tabs above</h2>
            <p>Choose a specific report to view detailed inventory information</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryReportsPage;
