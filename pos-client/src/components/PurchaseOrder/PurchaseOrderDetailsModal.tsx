/**
 * Purchase Order Details Modal
 * View full PO details and receive items in a modal
 */

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectPOSaving,
  receiveItemsThunk,
  fetchPOById,
} from '../../store/slices/purchaseOrders.slice';
import { POStatus } from '../../types/purchaseOrder.types';
import type { PurchaseOrderWithDetails } from '../../types/purchaseOrder.types';
import ReceiveItemsModal from './ReceiveItemsModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderWithDetails;
  onRefresh: () => void;
}

const PurchaseOrderDetailsModal: React.FC<Props> = ({ isOpen, onClose, po, onRefresh }) => {
  const dispatch = useAppDispatch();
  const isSaving = useAppSelector(selectPOSaving);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleReceiveItems = async (receivedItems: any[]) => {
    await dispatch(receiveItemsThunk({ id: po.id, data: { items: receivedItems } })).unwrap();
    await dispatch(fetchPOById(po.id)); // Reload to show updated quantities
    onRefresh();
  };

  const getStatusBadgeColor = (status: POStatus): string => {
    switch (status) {
      case 'draft':
        return '#6c757d';
      case 'submitted':
        return '#007bff';
      case 'approved':
        return '#28a745';
      case 'partially_received':
        return '#ffc107';
      case 'received':
        return '#17a2b8';
      case 'closed':
        return '#6c757d';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status: POStatus): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const canReceive = po.status === 'approved' || po.status === 'partially_received';

  return (
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
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '95%',
          maxWidth: '1200px',
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
              alignItems: 'flex-start',
              marginBottom: '30px',
            }}
          >
            <div>
              <h1 style={{ margin: '0 0 10px 0' }}>{po.po_number}</h1>
              <span
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  backgroundColor: getStatusBadgeColor(po.status),
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {getStatusLabel(po.status)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {canReceive && (
                <button
                  onClick={() => setIsReceiveModalOpen(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#218838')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#28a745')}
                >
                  📦 Receive Items
                </button>
              )}
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

          {/* PO Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            <div>
              <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                Vendor
              </label>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                {po.vendor_name}
              </p>
              {po.vendor_contact && (
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                  Contact: {po.vendor_contact}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                Order Type
              </label>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                {po.order_type.charAt(0).toUpperCase() + po.order_type.slice(1)}
              </p>
            </div>

            <div>
              <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                Order Date
              </label>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                {new Date(po.order_date).toLocaleDateString()}
              </p>
            </div>

            {po.expected_delivery_date && (
              <div>
                <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                  Expected Delivery
                </label>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                  {new Date(po.expected_delivery_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {po.delivery_date && (
              <div>
                <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                  Actual Delivery
                </label>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                  {new Date(po.delivery_date).toLocaleDateString()}
                </p>
              </div>
            )}

            <div>
              <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                Payment Terms
              </label>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                {po.payment_terms || 'Not specified'}
              </p>
            </div>

            <div>
              <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                Created By
              </label>
              <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                {po.created_by_name}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                {new Date(po.created_at).toLocaleString()}
              </p>
            </div>

            {po.approved_by_name && (
              <div>
                <label style={{ fontWeight: 600, color: '#6c757d', fontSize: '14px' }}>
                  Approved By
                </label>
                <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 500 }}>
                  {po.approved_by_name}
                </p>
                {po.approved_at && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                    {new Date(po.approved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Addresses */}
          {(po.shipping_address || po.billing_address) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              {po.shipping_address && (
                <div>
                  <label style={{ fontWeight: 600, marginBottom: '10px', display: 'block' }}>
                    Shipping Address
                  </label>
                  <div
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {po.shipping_address}
                  </div>
                </div>
              )}
              {po.billing_address && (
                <div>
                  <label style={{ fontWeight: 600, marginBottom: '10px', display: 'block' }}>
                    Billing Address
                  </label>
                  <div
                    style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {po.billing_address}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Line Items</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={tableHeaderStyle}>SKU</th>
                  <th style={tableHeaderStyle}>Product</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ordered</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Received</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Pending</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Tax</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={tableCellStyle}>{item.sku}</td>
                    <td style={tableCellStyle}>{item.product_name}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      {item.quantity_ordered}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      {item.quantity_received}
                    </td>
                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: item.quantity_pending > 0 ? '#ffc107' : '#28a745',
                      }}
                    >
                      {item.quantity_pending}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      ${Number(item.unit_cost).toFixed(2)}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      ${Number(item.tax_amount).toFixed(2)}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 'bold' }}>
                      ${Number(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div
            style={{
              maxWidth: '400px',
              marginLeft: 'auto',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Subtotal:</span>
              <strong>${Number(po.subtotal).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Tax:</span>
              <strong>${Number(po.tax_amount).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Shipping:</span>
              <strong>${Number(po.shipping_cost).toFixed(2)}</strong>
            </div>
            {po.other_charges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Other Charges:</span>
                <strong>${Number(po.other_charges).toFixed(2)}</strong>
              </div>
            )}
            {po.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Discount:</span>
                <strong style={{ color: '#dc3545' }}>
                  -${Number(po.discount_amount).toFixed(2)}
                </strong>
              </div>
            )}
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
              <span style={{ color: '#28a745' }}>${Number(po.total_amount).toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Notes</h3>
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {po.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receive Items Modal */}
      <ReceiveItemsModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onSubmit={handleReceiveItems}
        items={po.items}
        isSaving={isSaving}
      />
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

export default PurchaseOrderDetailsModal;
