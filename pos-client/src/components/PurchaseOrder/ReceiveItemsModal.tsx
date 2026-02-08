/**
 * Receive Items Modal
 * Modal for recording received quantities for PO items
 * Pattern: Similar to CheckoutModal structure
 */

import React, { useState, useEffect } from 'react';
import { PurchaseOrderItem } from '../../types/purchaseOrder.types';

interface ReceiveItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (receivedItems: { item_id: string; quantity_received: number; notes?: string }[]) => Promise<void>;
  items: PurchaseOrderItem[];
  isSaving: boolean;
}

interface ReceiveItemState {
  item_id: string;
  quantity_to_receive: number;
  notes: string;
}

const ReceiveItemsModal: React.FC<ReceiveItemsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  items,
  isSaving,
}) => {
  const [receiveStates, setReceiveStates] = useState<Map<string, ReceiveItemState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Initialize receive states for items with pending quantities
  useEffect(() => {
    if (isOpen) {
      const initialStates = new Map<string, ReceiveItemState>();
      items.forEach((item) => {
        if (item.quantity_pending > 0) {
          initialStates.set(item.id, {
            item_id: item.id,
            quantity_to_receive: item.quantity_pending, // Default to receiving all pending
            notes: '',
          });
        }
      });
      setReceiveStates(initialStates);
      setError(null);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (quantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    if (quantity > item.quantity_pending) {
      setError(`Cannot receive more than pending quantity (${item.quantity_pending})`);
      return;
    }

    setError(null);
    const currentState = receiveStates.get(itemId);
    if (currentState) {
      setReceiveStates(
        new Map(receiveStates.set(itemId, { ...currentState, quantity_to_receive: quantity }))
      );
    }
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    const currentState = receiveStates.get(itemId);
    if (currentState) {
      setReceiveStates(
        new Map(receiveStates.set(itemId, { ...currentState, notes }))
      );
    }
  };

  const handleSubmit = async () => {
    // Collect items with quantities to receive
    const itemsToReceive = Array.from(receiveStates.values()).filter(
      (state) => state.quantity_to_receive > 0
    );

    if (itemsToReceive.length === 0) {
      setError('Please enter quantities to receive');
      return;
    }

    try {
      await onSubmit(
        itemsToReceive.map((state) => ({
          item_id: state.item_id,
          quantity_received: state.quantity_to_receive,
          notes: state.notes || undefined,
        }))
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive items');
    }
  };

  const totalToReceive = Array.from(receiveStates.values()).reduce(
    (sum, state) => sum + state.quantity_to_receive,
    0
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>Receive Items</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              color: '#6c757d',
            }}
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              margin: '20px',
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
            }}
          >
            {error}
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          <p style={{ marginBottom: '20px', color: '#6c757d' }}>
            Enter the quantities received for each item. Items with zero quantity will not be updated.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={tableHeaderStyle}>SKU</th>
                <th style={tableHeaderStyle}>Product</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ordered</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Received</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Pending</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Receive Now</th>
                <th style={tableHeaderStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const receiveState = receiveStates.get(item.id);
                const hasPending = item.quantity_pending > 0;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: hasPending ? 'white' : '#f8f9fa',
                    }}
                  >
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
                      {hasPending ? (
                        <input
                          type="number"
                          value={receiveState?.quantity_to_receive || 0}
                          onChange={(e) =>
                            handleQuantityChange(item.id, Number(e.target.value))
                          }
                          min="0"
                          max={item.quantity_pending}
                          style={{
                            width: '80px',
                            padding: '5px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textAlign: 'right',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                          Complete
                        </span>
                      )}
                    </td>
                    <td style={tableCellStyle}>
                      {hasPending ? (
                        <input
                          type="text"
                          value={receiveState?.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Optional notes..."
                          style={{
                            width: '100%',
                            padding: '5px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#6c757d' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 'bold' }}>Total Items to Receive:</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
              {totalToReceive} units
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
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
            onClick={handleSubmit}
            disabled={isSaving || totalToReceive === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving || totalToReceive === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isSaving || totalToReceive === 0 ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Receiving...' : `Receive ${totalToReceive} Items`}
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

export default ReceiveItemsModal;
