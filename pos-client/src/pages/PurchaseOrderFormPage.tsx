/**
 * Purchase Order Form Page
 * Create/Edit purchase orders with line items
 * Pattern: Adapted from CheckoutModal with full-page layout
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  initializeDraft,
  clearDraft,
  updateDraftField,
  addDraftItem,
  updateDraftItem,
  removeDraftItem,
  selectDraftPO,
  selectVendors,
  selectPOSaving,
  selectPOError,
  fetchVendors,
  createPOThunk,
  updatePOThunk,
  fetchPOById,
  selectSelectedPO,
} from '../store/slices/purchaseOrders.slice';
import { fetchProducts } from '../store/slices/products.slice';
import { POOrderType, CreatePORequest, UpdatePORequest } from '../types/purchaseOrder.types';
import { Product } from '../types/product.types';

const PurchaseOrderFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isEditing = !!id;

  const draft = useAppSelector(selectDraftPO);
  const vendors = useAppSelector(selectVendors);
  const products = useAppSelector((state) => state.products.items);
  const selectedPO = useAppSelector(selectSelectedPO);
  const isSaving = useAppSelector(selectPOSaving);
  const error = useAppSelector(selectPOError);

  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Load vendors and products on mount
  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchProducts({ is_active: true }));
  }, [dispatch]);

  // Load existing PO if editing
  useEffect(() => {
    if (isEditing && id) {
      dispatch(fetchPOById(id));
    }
  }, [dispatch, isEditing, id]);

  // Initialize draft from existing PO or new
  useEffect(() => {
    if (isEditing && selectedPO && selectedPO.status === 'draft') {
      // Convert existing PO to draft format
      dispatch(
        initializeDraft({
          id: selectedPO.id,
          vendor_id: selectedPO.vendor_id,
          order_type: selectedPO.order_type,
          expected_delivery_date: selectedPO.expected_delivery_date || '',
          shipping_address: selectedPO.shipping_address || '',
          billing_address: selectedPO.billing_address || '',
          payment_terms: selectedPO.payment_terms || '',
          notes: selectedPO.notes || '',
          shipping_cost: selectedPO.shipping_cost,
          other_charges: selectedPO.other_charges,
          discount_amount: selectedPO.discount_amount,
          items: selectedPO.items.map((item) => ({
            temp_id: item.id, // Use actual ID as temp_id for existing items
            product_id: item.product_id,
            sku: item.sku,
            product_name: item.product_name,
            quantity_ordered: item.quantity_ordered,
            unit_cost: item.unit_cost,
            tax_amount: item.tax_amount,
            line_total: item.line_total,
            notes: item.notes || '',
          })),
        })
      );
    } else if (!isEditing && !draft) {
      // Initialize new draft
      dispatch(initializeDraft({}));
    }
  }, [dispatch, isEditing, selectedPO, draft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearDraft());
    };
  }, [dispatch]);

  if (!draft) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  const handleSaveDraft = async () => {
    if (!draft.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    if (draft.items.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    const requestData: CreatePORequest | UpdatePORequest = {
      vendor_id: draft.vendor_id,
      order_type: draft.order_type,
      expected_delivery_date: draft.expected_delivery_date || undefined,
      shipping_address: draft.shipping_address || undefined,
      billing_address: draft.billing_address || undefined,
      payment_terms: draft.payment_terms || undefined,
      notes: draft.notes || undefined,
      items: draft.items.map((item) => ({
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        tax_amount: item.tax_amount,
        notes: item.notes || undefined,
      })),
      shipping_cost: draft.shipping_cost || undefined,
      other_charges: draft.other_charges || undefined,
      discount_amount: draft.discount_amount || undefined,
    };

    try {
      if (isEditing && id) {
        await dispatch(updatePOThunk({ id, data: requestData })).unwrap();
      } else {
        await dispatch(createPOThunk(requestData as CreatePORequest)).unwrap();
      }
      navigate('/purchase-orders');
    } catch (err) {
      console.error('Failed to save PO:', err);
    }
  };

  const handleAddProduct = (product: Product) => {
    dispatch(
      addDraftItem({
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity_ordered: 1,
        unit_cost: Number(product.base_price),
        tax_amount: 0,
      })
    );
    setShowProductSelector(false);
    setProductSearch('');
  };

  const handleUpdateItemQty = (temp_id: string, quantity: number) => {
    if (quantity > 0) {
      dispatch(updateDraftItem({ temp_id, updates: { quantity_ordered: quantity } }));
    }
  };

  const handleUpdateItemCost = (temp_id: string, cost: number) => {
    if (cost >= 0) {
      dispatch(updateDraftItem({ temp_id, updates: { unit_cost: cost } }));
    }
  };

  const handleUpdateItemTax = (temp_id: string, tax: number) => {
    if (tax >= 0) {
      dispatch(updateDraftItem({ temp_id, updates: { tax_amount: tax } }));
    }
  };

  const handleRemoveItem = (temp_id: string) => {
    if (window.confirm('Remove this item?')) {
      dispatch(removeDraftItem(temp_id));
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower)
    );
  });

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
        <h1 style={{ marginTop: 0, marginBottom: '30px' }}>
          {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h1>

        {error && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {/* Section 1: PO Details */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Order Details</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
            }}
          >
            {/* Vendor */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Vendor *
              </label>
              <select
                value={draft.vendor_id}
                onChange={(e) =>
                  dispatch(updateDraftField({ field: 'vendor_id', value: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.business_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Order Type *
              </label>
              <select
                value={draft.order_type}
                onChange={(e) =>
                  dispatch(
                    updateDraftField({
                      field: 'order_type',
                      value: e.target.value as POOrderType,
                    })
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="drop_ship">Drop Ship</option>
              </select>
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={draft.expected_delivery_date}
                onChange={(e) =>
                  dispatch(
                    updateDraftField({
                      field: 'expected_delivery_date',
                      value: e.target.value,
                    })
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Payment Terms
              </label>
              <select
                value={draft.payment_terms}
                onChange={(e) =>
                  dispatch(
                    updateDraftField({ field: 'payment_terms', value: e.target.value })
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="">Select Terms</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
                <option value="net_90">Net 90</option>
                <option value="due_on_receipt">Due on Receipt</option>
                <option value="cod">COD</option>
              </select>
            </div>

            {/* Shipping Address */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Shipping Address
              </label>
              <textarea
                value={draft.shipping_address}
                onChange={(e) =>
                  dispatch(
                    updateDraftField({ field: 'shipping_address', value: e.target.value })
                  )
                }
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Billing Address */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Billing Address
              </label>
              <textarea
                value={draft.billing_address}
                onChange={(e) =>
                  dispatch(
                    updateDraftField({ field: 'billing_address', value: e.target.value })
                  )
                }
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
              Notes
            </label>
            <textarea
              value={draft.notes}
              onChange={(e) =>
                dispatch(updateDraftField({ field: 'notes', value: e.target.value }))
              }
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
              }}
              placeholder="Internal notes about this purchase order..."
            />
          </div>
        </div>

        {/* Section 2: Line Items */}
        <div style={{ marginBottom: '30px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
            }}
          >
            <h2 style={{ fontSize: '20px', margin: 0 }}>Line Items</h2>
            <button
              onClick={() => setShowProductSelector(!showProductSelector)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              + Add Product
            </button>
          </div>

          {/* Product Selector */}
          {showProductSelector && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f8f9fa',
              }}
            >
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '10px',
                }}
              />
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredProducts.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6c757d' }}>No products found</p>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = '#e9ecef')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = 'white')
                      }
                    >
                      <strong>{product.name}</strong> - {product.sku}
                      <br />
                      <small>
                        Price: ${Number(product.base_price).toFixed(2)} | Stock:{' '}
                        {product.quantity_in_stock}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Line Items Table */}
          {draft.items.length === 0 ? (
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                border: '2px dashed #dee2e6',
                borderRadius: '8px',
                color: '#6c757d',
              }}
            >
              <p style={{ fontSize: '16px' }}>No items added yet</p>
              <p>Click "Add Product" to add items to this purchase order</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={tableHeaderStyle}>SKU</th>
                  <th style={tableHeaderStyle}>Product</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Quantity</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Tax</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Line Total</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item) => (
                  <tr key={item.temp_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={tableCellStyle}>{item.sku}</td>
                    <td style={tableCellStyle}>{item.product_name}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      <input
                        type="number"
                        value={item.quantity_ordered}
                        onChange={(e) =>
                          handleUpdateItemQty(item.temp_id, Number(e.target.value))
                        }
                        min="1"
                        style={{
                          width: '80px',
                          padding: '5px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) =>
                          handleUpdateItemCost(item.temp_id, Number(e.target.value))
                        }
                        min="0"
                        step="0.01"
                        style={{
                          width: '100px',
                          padding: '5px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      <input
                        type="number"
                        value={item.tax_amount}
                        onChange={(e) =>
                          handleUpdateItemTax(item.temp_id, Number(e.target.value))
                        }
                        min="0"
                        step="0.01"
                        style={{
                          width: '80px',
                          padding: '5px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      ${item.line_total.toFixed(2)}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveItem(item.temp_id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 3: Totals */}
        <div
          style={{
            borderTop: '2px solid #dee2e6',
            paddingTop: '20px',
            marginBottom: '30px',
          }}
        >
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Order Totals</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              maxWidth: '800px',
            }}
          >
            {/* Left column: Additional charges */}
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Shipping Cost
                </label>
                <input
                  type="number"
                  value={draft.shipping_cost}
                  onChange={(e) =>
                    dispatch(
                      updateDraftField({
                        field: 'shipping_cost',
                        value: Number(e.target.value),
                      })
                    )
                  }
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Other Charges
                </label>
                <input
                  type="number"
                  value={draft.other_charges}
                  onChange={(e) =>
                    dispatch(
                      updateDraftField({
                        field: 'other_charges',
                        value: Number(e.target.value),
                      })
                    )
                  }
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Discount Amount
                </label>
                <input
                  type="number"
                  value={draft.discount_amount}
                  onChange={(e) =>
                    dispatch(
                      updateDraftField({
                        field: 'discount_amount',
                        value: Number(e.target.value),
                      })
                    )
                  }
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            {/* Right column: Summary */}
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Subtotal:</span>
                <strong>${draft.subtotal.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Tax:</span>
                <strong>${draft.tax_amount.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Shipping:</span>
                <strong>${draft.shipping_cost.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Other Charges:</span>
                <strong>${draft.other_charges.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Discount:</span>
                <strong style={{ color: '#dc3545' }}>
                  -${draft.discount_amount.toFixed(2)}
                </strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '2px solid #dee2e6',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                <span>Total:</span>
                <span style={{ color: '#28a745' }}>${draft.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => navigate('/purchase-orders')}
            disabled={isSaving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || !draft.vendor_id || draft.items.length === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor:
                isSaving || !draft.vendor_id || draft.items.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 'bold',
              opacity: isSaving || !draft.vendor_id || draft.items.length === 0 ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Draft' : 'Save Draft'}
          </button>
        </div>
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

export default PurchaseOrderFormPage;
