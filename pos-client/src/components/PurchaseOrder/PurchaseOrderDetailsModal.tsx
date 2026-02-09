/**
 * @fileoverview PurchaseOrderDetailsModal Component - Complete purchase order details modal
 *
 * Comprehensive modal displaying full purchase order details including line items, totals,
 * addresses, and receiving functionality. Supports viewing historical data and receiving
 * items for approved/partially received orders.
 *
 * @module components/PurchaseOrder/PurchaseOrderDetailsModal
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - PO Modals)
 * @updated 2026-02-08
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

/**
 * PurchaseOrderDetailsModal component props
 *
 * @interface Props
 * @property {boolean} isOpen - Whether modal is visible
 * @property {function} onClose - Callback when modal closes
 * @property {PurchaseOrderWithDetails} po - Complete purchase order with line items
 * @property {function} onRefresh - Callback to refresh parent data after changes
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderWithDetails;
  onRefresh: () => void;
}

/**
 * PurchaseOrderDetailsModal Component
 *
 * Full-screen modal displaying comprehensive purchase order information.
 * Shows all PO details, line items with quantities, financial totals, and receiving capability.
 *
 * Features:
 * - PO header with number and status badge
 * - Vendor information and contact details
 * - Order dates (ordered, expected, actual delivery)
 * - Payment terms and creator/approver information
 * - Shipping and billing addresses
 * - Line items table with ordered/received/pending quantities
 * - Unit costs, tax, and line totals
 * - Financial summary (subtotal, tax, shipping, discounts, total)
 * - Notes section
 * - Receive Items button (for approved/partially received POs)
 * - Nested ReceiveItemsModal for receiving functionality
 * - Auto-refresh after receiving items
 *
 * Status Colors:
 * - Draft: Gray (#6c757d) - Still being edited
 * - Submitted: Blue (#007bff) - Sent to vendor, awaiting approval
 * - Approved: Green (#28a745) - Ready to receive
 * - Partially Received: Yellow (#ffc107) - Some items received
 * - Received: Teal (#17a2b8) - All items received
 * - Closed: Gray (#6c757d) - Finalized/archived
 * - Cancelled: Red (#dc3545) - Order cancelled
 *
 * @component
 * @param {Props} props - Component props
 * @returns {JSX.Element | null} PO details modal or null when closed
 *
 * @example
 * // Basic usage in PurchaseOrdersPage
 * const [selectedPO, setSelectedPO] = useState<PurchaseOrderWithDetails | null>(null);
 * <PurchaseOrderDetailsModal
 *   isOpen={!!selectedPO}
 *   onClose={() => setSelectedPO(null)}
 *   po={selectedPO!}
 *   onRefresh={() => dispatch(fetchPurchaseOrders())}
 * />
 *
 * @example
 * // Receiving flow
 * // 1. Open modal for approved PO
 * // 2. Click "Receive Items" button
 * // 3. ReceiveItemsModal opens with all line items
 * // 4. Enter received quantities
 * // 5. Submit - inventory updates automatically
 * // 6. Modal refreshes showing updated quantities
 *
 * @see {@link ReceiveItemsModal} - Nested modal for receiving items
 */
const PurchaseOrderDetailsModal: React.FC<Props> = ({ isOpen, onClose, po, onRefresh }) => {
  const dispatch = useAppDispatch();
  const isSaving = useAppSelector(selectPOSaving);

  /** State for nested receive items modal */
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Don't render anything when closed
  if (!isOpen) return null;

  /**
   * Handle receiving items submission
   *
   * Dispatches receive items thunk, reloads PO to show updated quantities,
   * and refreshes parent data.
   *
   * @async
   * @param {any[]} receivedItems - Array of received items with quantities
   * @returns {Promise<void>}
   */
  const handleReceiveItems = async (receivedItems: any[]) => {
    await dispatch(receiveItemsThunk({ id: po.id, data: { items: receivedItems } })).unwrap();
    await dispatch(fetchPOById(po.id)); // Reload to show updated quantities
    onRefresh();
  };

  /**
   * Get background color for status badge
   *
   * Returns color code based on PO status for visual differentiation.
   * Uses standard Bootstrap-inspired color palette.
   *
   * @param {POStatus} status - Purchase order status
   * @returns {string} Hex color code
   *
   * @example
   * getStatusBadgeColor('approved') // Returns '#28a745' (green)
   * getStatusBadgeColor('cancelled') // Returns '#dc3545' (red)
   */
  const getStatusBadgeColor = (status: POStatus): string => {
    switch (status) {
      case 'draft':
        return '#6c757d'; // Gray - still editing
      case 'submitted':
        return '#007bff'; // Blue - awaiting approval
      case 'approved':
        return '#28a745'; // Green - ready to receive
      case 'partially_received':
        return '#ffc107'; // Yellow - in progress
      case 'received':
        return '#17a2b8'; // Teal - complete
      case 'closed':
        return '#6c757d'; // Gray - archived
      case 'cancelled':
        return '#dc3545'; // Red - cancelled
      default:
        return '#6c757d'; // Gray - unknown
    }
  };

  /**
   * Format status for display
   *
   * Converts snake_case status to Title Case with spaces.
   *
   * @param {POStatus} status - Purchase order status
   * @returns {string} Formatted status label
   *
   * @example
   * getStatusLabel('partially_received') // Returns 'Partially Received'
   * getStatusLabel('draft') // Returns 'Draft'
   */
  const getStatusLabel = (status: POStatus): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /** Only approved or partially received POs can receive items */
  const canReceive = po.status === 'approved' || po.status === 'partially_received';

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

          {/* Line Items Table */}
          {/* Shows all ordered products with quantities, costs, and receiving status */}
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
                    {/* Pending quantity - yellow if pending, green if complete */}
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

          {/* Financial Totals Summary */}
          {/* Right-aligned totals panel showing subtotal, tax, shipping, discounts, and grand total */}
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

      {/* Nested Receive Items Modal */}
      {/* Opens when user clicks "Receive Items" button for approved/partially received POs */}
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

/**
 * Table header cell style constant
 *
 * Consistent styling for all table header cells.
 * Left-aligned by default (override with textAlign for right-aligned columns).
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
 * Consistent styling for all table body cells.
 * Used for both line items and receiving tables.
 *
 * @constant {React.CSSProperties}
 */
const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  fontSize: '14px',
};

export default PurchaseOrderDetailsModal;
