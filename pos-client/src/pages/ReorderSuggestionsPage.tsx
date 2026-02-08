/**
 * Reorder Suggestions Page
 * Shows products with low stock grouped by vendor
 * TODO: Full implementation in next commit
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchReorderSuggestions,
  selectReorderSuggestions,
  selectPOLoading,
} from '../store/slices/purchaseOrders.slice';

const ReorderSuggestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const suggestions = useAppSelector(selectReorderSuggestions);
  const isLoading = useAppSelector(selectPOLoading);

  useEffect(() => {
    dispatch(fetchReorderSuggestions());
  }, [dispatch]);

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/purchase-orders')}
        style={{
          background: 'none',
          border: 'none',
          color: '#007bff',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '20px',
        }}
      >
        ← Back to Purchase Orders
      </button>

      <div
        style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Reorder Suggestions</h1>
        <p style={{ color: '#6c757d' }}>
          Products at or below reorder level, grouped by vendor
        </p>

        {suggestions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: '#28a745' }}>
              ✅ All products are adequately stocked!
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '30px' }}>
            {suggestions.map((vendor) => (
              <div
                key={vendor.vendor_id}
                style={{
                  marginBottom: '30px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>{vendor.vendor_name}</h2>
                    <p style={{ margin: '5px 0', color: '#6c757d' }}>
                      {vendor.products.length} products need reordering
                    </p>
                    <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                      Estimated Total: ${vendor.estimated_total.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      alert(
                        `Create PO for ${vendor.vendor_name} - TODO: Pre-fill form`
                      )
                    }
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Create PO
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>In Stock</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>
                        Reorder Level
                      </th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>
                        Reorder Qty
                      </th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.products.map((product) => (
                      <tr
                        key={product.product_id}
                        style={{ borderBottom: '1px solid #dee2e6' }}
                      >
                        <td style={{ padding: '10px' }}>{product.sku}</td>
                        <td style={{ padding: '10px' }}>{product.product_name}</td>
                        <td
                          style={{
                            padding: '10px',
                            textAlign: 'right',
                            color:
                              product.quantity_in_stock === 0
                                ? '#dc3545'
                                : '#ffc107',
                            fontWeight: 'bold',
                          }}
                        >
                          {product.quantity_in_stock}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {product.reorder_level}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {product.reorder_quantity}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ${product.unit_cost?.toFixed(2) || 'N/A'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          $
                          {(
                            product.reorder_quantity * (product.unit_cost || 0)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReorderSuggestionsPage;
