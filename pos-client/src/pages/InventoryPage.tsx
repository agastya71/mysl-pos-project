/**
 * Inventory Page
 *
 * Main inventory management page with product list and adjustment capabilities
 */

import React, { useEffect, useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProducts } from '../store/slices/products.slice';
import { AdjustmentForm } from '../components/Inventory/AdjustmentForm';
import { Product } from '../types/product.types';

interface SelectedProduct {
  id: string;
  name: string;
  quantity: number;
}

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items: products, isLoading: loading } = useAppSelector((state) => state.products);

  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchProducts({ is_active: true }));
  }, [dispatch]);

  const handleAdjustClick = (product: Product) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      quantity: product.quantity_in_stock,
    });
  };

  const handleFormClose = () => {
    setSelectedProduct(null);
  };

  const handleFormSuccess = () => {
    // Refresh products to show updated quantities
    dispatch(fetchProducts({ is_active: true }));
  };

  // Filter products by search term
  const filteredProducts = products.filter((product: Product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower)
    );
  });

  // Sort by quantity (low stock first)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    return a.quantity_in_stock - b.quantity_in_stock;
  });

  const getStockStatusStyle = (quantity: number): CSSProperties => {
    if (quantity === 0) {
      return styles.stockOut;
    } else if (quantity <= 10) {
      return styles.stockLow;
    } else if (quantity <= 50) {
      return styles.stockMedium;
    } else {
      return styles.stockGood;
    }
  };

  const getStockStatusLabel = (quantity: number): string => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= 10) return 'Low Stock';
    if (quantity <= 50) return 'Medium Stock';
    return 'Good Stock';
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => navigate('/pos')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
            }}
          >
            ← Back to POS
          </button>
          <h1 style={styles.title}>Inventory Management</h1>
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => navigate('/inventory/history')}
            style={styles.historyButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            📋 Adjustment History
          </button>
          <button
            onClick={() => navigate('/inventory/reports')}
            style={styles.reportsButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#218838';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745';
            }}
          >
            📊 Reports
          </button>
        </div>
      </div>

      <div style={styles.container}>
        {/* Search Bar */}
        <div style={styles.searchSection}>
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={styles.clearButton}
            >
              Clear
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div style={styles.summaryCards}>
          <div style={styles.card}>
            <div style={styles.cardValue}>{products.length}</div>
            <div style={styles.cardLabel}>Total Products</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardValue}>
              {products.filter((p: Product) => p.quantity_in_stock <= 10).length}
            </div>
            <div style={styles.cardLabel}>Low Stock</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardValue}>
              {products.filter((p: Product) => p.quantity_in_stock === 0).length}
            </div>
            <div style={styles.cardLabel}>Out of Stock</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardValue}>
              {products.reduce((sum: number, p: Product) => sum + p.quantity_in_stock, 0)}
            </div>
            <div style={styles.cardLabel}>Total Units</div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div style={styles.loading}>Loading products...</div>
        ) : sortedProducts.length === 0 ? (
          <div style={styles.emptyState}>
            {searchTerm ? 'No products found matching your search.' : 'No products available.'}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>SKU</th>
                  <th style={styles.tableHeader}>Product Name</th>
                  <th style={styles.tableHeader}>Category</th>
                  <th style={styles.tableHeader}>Quantity</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Price</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product) => (
                  <tr key={product.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{product.sku}</td>
                    <td style={styles.tableCell}>
                      <strong>{product.name}</strong>
                    </td>
                    <td style={styles.tableCell}>
                      {(product as any).category_name || '—'}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={styles.quantityBadge}>
                        {product.quantity_in_stock}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={getStockStatusStyle(product.quantity_in_stock)}>
                        {getStockStatusLabel(product.quantity_in_stock)}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      ${Number(product.base_price).toFixed(2)}
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        onClick={() => handleAdjustClick(product)}
                        style={styles.adjustButton}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0056b3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#007bff';
                        }}
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Form Modal */}
      {selectedProduct && (
        <AdjustmentForm
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          currentQuantity={selectedProduct.quantity}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
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
  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  historyButton: {
    padding: '10px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  reportsButton: {
    padding: '10px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 40px',
  },
  searchSection: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  clearButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#007bff',
    marginBottom: '8px',
  },
  cardLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 500,
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
    fontSize: '16px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
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
  quantityBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '14px',
  },
  stockOut: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '12px',
  },
  stockLow: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '12px',
  },
  stockMedium: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fff9c4',
    color: '#f57f17',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '12px',
  },
  stockGood: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '12px',
  },
  adjustButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
