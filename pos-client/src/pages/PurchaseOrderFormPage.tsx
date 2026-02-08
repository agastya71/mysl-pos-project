/**
 * Purchase Order Form Page
 * Create/Edit purchase orders with line items
 * TODO: Full implementation in next commit
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PurchaseOrderFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

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
        <h1 style={{ marginTop: 0 }}>
          {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </h1>
        <p style={{ color: '#6c757d' }}>
          Form implementation coming in next commit...
        </p>

        <div style={{ marginTop: '30px' }}>
          <button
            onClick={() => navigate('/purchase-orders')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => alert('Save functionality - TODO')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderFormPage;
