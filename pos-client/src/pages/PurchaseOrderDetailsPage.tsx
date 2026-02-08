/**
 * Purchase Order Details Page
 * View full PO details and receive items
 * TODO: Full implementation in next commit
 */

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPOById,
  selectSelectedPO,
  selectPOLoading,
} from '../store/slices/purchaseOrders.slice';

const PurchaseOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const po = useAppSelector(selectSelectedPO);
  const isLoading = useAppSelector(selectPOLoading);

  useEffect(() => {
    if (id) {
      dispatch(fetchPOById(id));
    }
  }, [dispatch, id]);

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!po) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Purchase order not found</div>;
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

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginTop: 0 }}>{po.po_number}</h1>
        <p><strong>Vendor:</strong> {po.vendor_name}</p>
        <p><strong>Status:</strong> {po.status}</p>
        <p><strong>Total:</strong> ${po.total_amount.toFixed(2)}</p>

        <h2>Line Items</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Product</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Ordered</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Received</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Pending</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Unit Cost</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '10px' }}>{item.sku}</td>
                <td style={{ padding: '10px' }}>{item.product_name}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity_ordered}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity_received}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity_pending}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>${item.unit_cost.toFixed(2)}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>${item.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <p><strong>Subtotal:</strong> ${po.subtotal_amount.toFixed(2)}</p>
          <p><strong>Tax:</strong> ${po.tax_amount.toFixed(2)}</p>
          <p><strong>Shipping:</strong> ${po.shipping_cost.toFixed(2)}</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
            <strong>Total:</strong> ${po.total_amount.toFixed(2)}
          </p>
        </div>

        {(po.status === 'approved' || po.status === 'partially_received') && (
          <button
            onClick={() => alert('Receive items modal - TODO')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Receive Items
          </button>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsPage;
