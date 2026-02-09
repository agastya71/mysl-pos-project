/**
 * @fileoverview ReorderSuggestionsModal Component - Intelligent reorder suggestions modal
 *
 * Smart modal displaying low-stock products grouped by vendor with automatic reorder
 * quantity calculations. Enables one-click purchase order creation for vendor-specific
 * reorder suggestions based on current inventory levels and reorder points.
 *
 * @module components/PurchaseOrder/ReorderSuggestionsModal
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - PO Modals)
 * @updated 2026-02-08
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store/hooks';
import { initializeDraft } from '../../store/slices/purchaseOrders.slice';
import type { ReorderSuggestionsByVendor } from '../../types/purchaseOrder.types';

/**
 * ReorderSuggestionsModal component props
 *
 * @interface Props
 * @property {boolean} isOpen - Whether modal is visible
 * @property {function} onClose - Callback when modal closes
 * @property {ReorderSuggestionsByVendor[]} suggestions - Vendor-grouped reorder suggestions
 * @property {boolean} isLoading - Loading state while fetching suggestions
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  suggestions: ReorderSuggestionsByVendor[];
  isLoading: boolean;
}

/**
 * ReorderSuggestionsModal Component
 *
 * Intelligent modal displaying vendor-grouped reorder suggestions for products
 * at or below reorder levels. Enables rapid purchase order creation with
 * pre-filled quantities and costs.
 *
 * Features:
 * - Vendor grouping with product counts and estimated totals
 * - Stock level color coding (critical/warning/low)
 * - "OUT OF STOCK" badges for zero-quantity products
 * - One-click PO creation per vendor
 * - Automatic reorder quantity calculation
 * - Grand total across all vendors
 * - Loading state with spinner
 * - Empty state when all products adequately stocked
 * - Product details table with current stock, reorder levels, costs
 * - Vendor contact information display
 *
 * Stock Level Colors:
 * - Critical: Red (#dc3545) - Out of stock (0 qty)
 * - Warning: Light Red (#ff6b6b) - Very low (≤ 50% of reorder level)
 * - Low: Yellow (#ffc107) - Below reorder level
 *
 * @component
 * @param {Props} props - Component props
 * @returns {JSX.Element | null} Reorder suggestions modal or null when closed
 *
 * @example
 * // Basic usage in PurchaseOrdersPage
 * const [showSuggestions, setShowSuggestions] = useState(false);
 * const suggestions = useAppSelector(selectReorderSuggestions);
 * const isLoading = useAppSelector(selectPOLoading);
 *
 * <ReorderSuggestionsModal
 *   isOpen={showSuggestions}
 *   onClose={() => setShowSuggestions(false)}
 *   suggestions={suggestions}
 *   isLoading={isLoading}
 * />
 *
 * @example
 * // Quick reorder flow
 * // 1. Click "Reorder Suggestions" button
 * // 2. Modal shows vendors with low-stock products
 * // 3. Click "Create PO" for specific vendor
 * // 4. Redirects to PO form with pre-filled items
 * // 5. Adjust quantities if needed, submit
 *
 * @see {@link PurchaseOrderFormPage} - Target page for PO creation
 */
const ReorderSuggestionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  suggestions,
  isLoading,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Don't render anything when closed
  if (!isOpen) return null;

  /**
   * Handle Create PO button click for specific vendor
   *
   * Initializes draft purchase order with all suggested products for the vendor,
   * pre-filling quantities and costs, then navigates to PO creation form.
   *
   * @param {string} vendorId - Vendor ID to create PO for
   * @returns {void}
   *
   * @example
   * handleCreatePOForVendor('vendor-123')
   * // Initializes draft with:
   * // - Vendor ID
   * // - All low-stock products for that vendor
   * // - Reorder quantities
   * // - Unit costs
   * // - Notes with current stock levels
   */
  const handleCreatePOForVendor = (vendorId: string) => {
    const vendorSuggestions = suggestions.find((s) => s.vendor_id === vendorId);
    if (!vendorSuggestions) return;

    // Initialize draft with vendor and products
    dispatch(
      initializeDraft({
        vendor_id: vendorId,
        order_type: 'purchase',
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

    // Close modal and navigate to form
    onClose();
    navigate('/purchase-orders/new');
  };

  return (
    /* Modal overlay - click to close */
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        overflow: 'auto',
        padding: '20px',
      }}
      onClick={onClose}
    >
      {/* Modal content - prevent click propagation */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '95%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '30px' }}>
          {/* Header */}
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#5a6268')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6c757d')}
              >
                Close
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
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
          ) : /* Empty State - All products adequately stocked */
          suggestions.length === 0 ? (
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
            /* Vendor-grouped suggestions with products */
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
                            ${Number(vendor.estimated_total).toFixed(2)}
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
                        /**
                         * Determine stock level severity
                         * - critical: Out of stock (0)
                         * - warning: Very low (≤ 50% of reorder level)
                         * - low: Below reorder level
                         */
                        const stockLevel =
                          product.quantity_in_stock === 0
                            ? 'critical'
                            : product.quantity_in_stock <= product.reorder_level / 2
                            ? 'warning'
                            : 'low';

                        /**
                         * Color code based on stock level
                         * - Critical: Bright red (#dc3545)
                         * - Warning: Light red (#ff6b6b)
                         * - Low: Yellow (#ffc107)
                         */
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
                            {/* Current stock - color coded by severity with OUT badge for zero stock */}
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
                                ? `$${Number(product.unit_cost).toFixed(2)}`
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
                    {/* Vendor Totals Footer */}
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
                          ${Number(vendor.estimated_total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              {/* Grand Total - Only shown when multiple vendors */}
              {/* Aggregates total items and costs across all vendors */}
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
    </div>
  );
};

/**
 * Table header cell style constant
 *
 * Consistent styling for all table header cells in vendor product tables.
 * Left-aligned by default (override with textAlign for right-aligned columns).
 * Uses heavier font weight for headers.
 *
 * @constant {React.CSSProperties}
 */
const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '14px',
  borderBottom: '2px solid #dee2e6',
};

/**
 * Table body cell style constant
 *
 * Consistent styling for all table body cells displaying product information.
 * Used across all vendor product rows.
 *
 * @constant {React.CSSProperties}
 */
const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '14px',
};

export default ReorderSuggestionsModal;
