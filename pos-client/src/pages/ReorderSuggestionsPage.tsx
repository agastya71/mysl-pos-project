/**
 * Reorder Suggestions Page
 * Shows products with low stock grouped by vendor
 * Allows quick PO creation from selected products
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchReorderSuggestions,
  selectReorderSuggestions,
  selectPOLoading,
  initializeDraft,
} from '../store/slices/purchaseOrders.slice';

const ReorderSuggestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const suggestions = useAppSelector(selectReorderSuggestions);
  const isLoading = useAppSelector(selectPOLoading);

  useEffect(() => {
    dispatch(fetchReorderSuggestions());
  }, [dispatch]);

  const handleCreatePOForVendor = (vendorId: string) => {
    const vendorSuggestions = suggestions.find((s) => s.vendor_id === vendorId);
    if (!vendorSuggestions) return;

    // Initialize draft with vendor and products
    dispatch(
      initializeDraft({
        vendor_id: vendorId,
        order_type: 'standard',
        expected_delivery_date: '',
        shipping_address: '',
        billing_address: '',
        payment_terms: 'net_30',
        notes: 'Created from reorder suggestions',
        shipping_cost: 0,
        other_charges: 0,
        discount_amount: 0,
        items: vendorSuggestions.products.map((product) => ({
          temp_id: product.product_id,
          product_id: product.product_id,
          sku: product.sku,
          product_name: product.product_name,
          quantity_ordered: product.reorder_quantity,
          unit_cost: product.unit_cost || 0,
          tax_amount: 0,
          line_total: (product.unit_cost || 0) * product.reorder_quantity,
          notes: `Reorder - Current stock: ${product.quantity_in_stock}`,
        })),
      })
    );

    // Navigate to form
    navigate('/purchase-orders/new');
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div
          style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }}
        />
        <p>Loading reorder suggestions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/purchase-orders')}
        style={{
          background: 'none',
          border: 'none',
          color: '#007bff',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '20px',
          fontWeight: 600,
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = '#0056b3')}
        onMouseOut={(e) => (e.currentTarget.style.color = '#007bff')}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 style={{ margin: '0 0 5px 0' }}>Reorder Suggestions</h1>
            <p style={{ margin: 0, color: '#6c757d' }}>
              Products at or below reorder level, grouped by vendor
            </p>
          </div>
          <div
            style={{
              padding: '15px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
              {suggestions.length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {suggestions.length === 1 ? 'Vendor' : 'Vendors'} with Low Stock
            </div>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#28a745', marginBottom: '10px' }}>
              All Products Adequately Stocked!
            </h2>
            <p style={{ fontSize: '16px', color: '#6c757d' }}>
              No products currently need reordering. Check back later or adjust reorder
              levels if needed.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '30px' }}>
            {suggestions.map((vendor, vendorIndex) => (
              <div
                key={vendor.vendor_id}
                style={{
                  marginBottom: vendorIndex < suggestions.length - 1 ? '30px' : 0,
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Vendor Header */}
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #dee2e6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '20px' }}>
                      {vendor.vendor_name}
                    </h2>
                    {vendor.vendor_contact && (
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6c757d' }}>
                        Contact: {vendor.vendor_contact}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                      <span style={{ fontSize: '14px', color: '#6c757d' }}>
                        <strong style={{ color: '#dc3545' }}>
                          {vendor.products.length}
                        </strong>{' '}
                        {vendor.products.length === 1 ? 'product' : 'products'} need
                        reordering
                      </span>
                      <span style={{ fontSize: '14px', color: '#6c757d' }}>
                        Total Items: <strong>{vendor.total_items}</strong>
                      </span>
                      <span style={{ fontSize: '14px', color: '#6c757d' }}>
                        Estimated Total:{' '}
                        <strong style={{ color: '#28a745' }}>
                          ${vendor.estimated_total.toFixed(2)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreatePOForVendor(vendor.vendor_id)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = '#218838')
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = '#28a745')
                    }
                  >
                    📝 Create PO
                  </button>
                </div>

                {/* Products Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'white' }}>
                      <th style={tableHeaderStyle}>SKU</th>
                      <th style={tableHeaderStyle}>Product</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>In Stock</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                        Reorder Level
                      </th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                        Reorder Qty
                      </th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                        Unit Cost
                      </th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.products.map((product, productIndex) => {
                      const stockLevel =
                        product.quantity_in_stock === 0
                          ? 'critical'
                          : product.quantity_in_stock <= product.reorder_level / 2
                          ? 'warning'
                          : 'low';

                      const stockColor =
                        stockLevel === 'critical'
                          ? '#dc3545'
                          : stockLevel === 'warning'
                          ? '#ff6b6b'
                          : '#ffc107';

                      return (
                        <tr
                          key={product.product_id}
                          style={{
                            backgroundColor:
                              productIndex % 2 === 0 ? 'white' : '#f8f9fa',
                            borderBottom:
                              productIndex < vendor.products.length - 1
                                ? '1px solid #dee2e6'
                                : 'none',
                          }}
                        >
                          <td style={tableCellStyle}>{product.sku}</td>
                          <td style={tableCellStyle}>{product.product_name}</td>
                          <td
                            style={{
                              ...tableCellStyle,
                              textAlign: 'right',
                              fontWeight: 'bold',
                              color: stockColor,
                            }}
                          >
                            {product.quantity_in_stock}
                            {product.quantity_in_stock === 0 && (
                              <span
                                style={{
                                  marginLeft: '5px',
                                  fontSize: '12px',
                                  padding: '2px 6px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  borderRadius: '3px',
                                }}
                              >
                                OUT
                              </span>
                            )}
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                            {product.reorder_level}
                          </td>
                          <td
                            style={{
                              ...tableCellStyle,
                              textAlign: 'right',
                              fontWeight: 'bold',
                              color: '#007bff',
                            }}
                          >
                            {product.reorder_quantity}
                          </td>
                          <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                            {product.unit_cost !== null
                              ? `$${product.unit_cost.toFixed(2)}`
                              : 'N/A'}
                          </td>
                          <td
                            style={{
                              ...tableCellStyle,
                              textAlign: 'right',
                              fontWeight: 'bold',
                              color: '#28a745',
                            }}
                          >
                            $
                            {(
                              product.reorder_quantity * (product.unit_cost || 0)
                            ).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                      <td
                        colSpan={4}
                        style={{ ...tableCellStyle, textAlign: 'right' }}
                      >
                        Vendor Total:
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                        {vendor.total_items}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}></td>
                      <td
                        style={{
                          ...tableCellStyle,
                          textAlign: 'right',
                          color: '#28a745',
                          fontSize: '16px',
                        }}
                      >
                        ${vendor.estimated_total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            {/* Grand Total */}
            {suggestions.length > 1 && (
              <div
                style={{
                  marginTop: '30px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '2px solid #dee2e6',
                }}
              >
                <div>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    Grand Total ({suggestions.length}{' '}
                    {suggestions.length === 1 ? 'Vendor' : 'Vendors'}):
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}>
                    Total Items:{' '}
                    <strong>
                      {suggestions.reduce((sum, v) => sum + v.total_items, 0)}
                    </strong>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                    $
                    {suggestions
                      .reduce((sum, v) => sum + v.estimated_total, 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '14px',
  borderBottom: '2px solid #dee2e6',
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '14px',
};

export default ReorderSuggestionsPage;
