/**
 * @fileoverview AdjustmentForm Component - Inventory adjustment creation form
 *
 * Modal form for manually adjusting product inventory with reason tracking.
 * Supports various adjustment types (correction, damage, theft, found, initial).
 *
 * @module components/Inventory/AdjustmentForm
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState, CSSProperties } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { createAdjustment } from '../../store/slices/inventory.slice';
import { AdjustmentType } from '../../types/inventory.types';

/**
 * AdjustmentForm component props
 *
 * @interface AdjustmentFormProps
 * @property {string} productId - Product ID to adjust
 * @property {string} productName - Product name (for display)
 * @property {number} currentQuantity - Current inventory quantity
 * @property {function} onClose - Callback when modal closes
 * @property {function} onSuccess - Callback when adjustment created successfully
 */
interface AdjustmentFormProps {
  productId: string;
  productName: string;
  currentQuantity: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * AdjustmentForm Component
 *
 * Modal form for creating manual inventory adjustments with comprehensive validation.
 * Shows product info, calculates new quantity preview, requires reason.
 *
 * Form Fields:
 * - Product Info (read-only): Product name, current quantity
 * - Adjustment Type * (dropdown): correction, damage, theft, found, initial
 * - Quantity Change * (number): positive to add, negative to subtract
 * - Reason * (textarea): required, max 500 chars, char counter
 * - Additional Notes (textarea): optional, max 1000 chars
 *
 * Features:
 * - Real-time new quantity preview (current → new)
 * - Prevents negative inventory (submit button disabled, error shown)
 * - Quantity change cannot be zero (validation)
 * - Reason required (trimmed, non-empty)
 * - Character counters on textareas
 * - Loading state ("Creating..." button text)
 * - Error display (red box)
 *
 * Adjustment Types:
 * - Correction: Fix counting error
 * - Damage: Damaged or expired items
 * - Theft: Shrinkage from theft
 * - Found: Discovered stock
 * - Initial: Set initial stock
 *
 * @component
 * @param {AdjustmentFormProps} props - Component props
 * @returns {JSX.Element} Adjustment form modal
 *
 * @example
 * // Basic usage in InventoryPage
 * const [adjusting, setAdjusting] = useState<Product | null>(null);
 * {adjusting && (
 *   <AdjustmentForm
 *     productId={adjusting.id}
 *     productName={adjusting.name}
 *     currentQuantity={adjusting.quantity_in_stock}
 *     onClose={() => setAdjusting(null)}
 *     onSuccess={() => { fetchProducts(); setAdjusting(null); }}
 *   />
 * )}
 *
 * @see {@link InventoryPage} - Parent page using this form
 */
export const AdjustmentForm: React.FC<AdjustmentFormProps> = ({
  productId,
  productName,
  currentQuantity,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('correction');
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate new quantity for preview
  const newQuantity = currentQuantity + parseInt(quantityChange || '0');

  /**
   * Handle form submission
   * Validates, creates adjustment, calls onSuccess and closes
   *
   * @async
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!quantityChange || parseInt(quantityChange) === 0) {
      setError('Quantity change cannot be zero');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    if (newQuantity < 0) {
      setError('Adjustment would result in negative inventory');
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        createAdjustment({
          product_id: productId,
          adjustment_type: adjustmentType,
          quantity_change: parseInt(quantityChange),
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        })
      ).unwrap();

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Adjust Inventory</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Product Info */}
          <div style={styles.productInfo}>
            <div style={styles.infoLabel}>Product:</div>
            <div style={styles.infoValue}>{productName}</div>
            <div style={styles.infoLabel}>Current Quantity:</div>
            <div style={styles.infoValue}>{currentQuantity}</div>
          </div>

          {/* Adjustment Type */}
          <div style={styles.field}>
            <label style={styles.label}>
              Adjustment Type <span style={styles.required}>*</span>
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              style={styles.select}
              required
            >
              <option value="correction">Correction - Fix counting error</option>
              <option value="damage">Damage - Damaged or expired items</option>
              <option value="theft">Theft - Shrinkage from theft</option>
              <option value="found">Found - Discovered stock</option>
              <option value="initial">Initial - Set initial stock</option>
            </select>
          </div>

          {/* Quantity Change */}
          <div style={styles.field}>
            <label style={styles.label}>
              Quantity Change <span style={styles.required}>*</span>
            </label>
            <input
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="Enter positive or negative number"
              style={styles.input}
              required
            />
            <div style={styles.hint}>
              Positive to add, negative to subtract (e.g., -5 for 5 damaged items)
            </div>
          </div>

          {/* New Quantity Preview */}
          {quantityChange && (
            <div style={{
              ...styles.quantityPreview,
              ...(newQuantity < 0 ? styles.quantityPreviewError : {}),
            }}>
              <strong>New Quantity:</strong> {currentQuantity} → {newQuantity}
              {newQuantity < 0 && (
                <span style={styles.errorText}> (Cannot be negative!)</span>
              )}
            </div>
          )}

          {/* Reason */}
          <div style={styles.field}>
            <label style={styles.label}>
              Reason <span style={styles.required}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this adjustment is needed..."
              style={styles.textarea}
              rows={3}
              required
              maxLength={500}
            />
            <div style={styles.charCount}>{reason.length}/500</div>
          </div>

          {/* Notes (Optional) */}
          <div style={styles.field}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional additional details..."
              style={styles.textarea}
              rows={2}
              maxLength={1000}
            />
          </div>

          {/* Error Message */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={isSubmitting || newQuantity < 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '30px',
    height: '30px',
  },
  form: {
    padding: '24px',
  },
  productInfo: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  infoLabel: {
    fontWeight: 600,
    color: '#555',
  },
  infoValue: {
    color: '#333',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 600,
    color: '#333',
    fontSize: '14px',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  },
  charCount: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'right',
    marginTop: '4px',
  },
  quantityPreview: {
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  quantityPreviewError: {
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#dc3545',
    fontWeight: 600,
  },
  error: {
    padding: '12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
