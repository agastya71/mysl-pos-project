/**
 * @fileoverview CustomerFormModal Component - Create/edit customer form modal
 *
 * Comprehensive form modal for creating new customers or editing existing ones.
 * Supports full customer data including name, contact info, and address.
 *
 * @module components/Customer/CustomerFormModal
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createCustomer, updateCustomer } from '../../store/slices/customers.slice';
import { Customer } from '../../types/customer.types';

/**
 * CustomerFormModal component props
 *
 * @interface CustomerFormModalProps
 * @property {Customer} [customer] - Customer to edit (undefined for create mode)
 * @property {function} onClose - Callback when modal closes (Cancel or success)
 * @property {function} onSuccess - Callback when save succeeds (before close)
 */
interface CustomerFormModalProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * CustomerFormModal Component
 *
 * Full-featured customer form modal supporting create and edit modes.
 * Includes contact info, full address fields, validation, and error handling.
 *
 * Form Fields:
 * - First Name * (required)
 * - Last Name * (required)
 * - Email (optional, validated)
 * - Phone (optional)
 * - Address Line 1 (optional)
 * - Address Line 2 (optional)
 * - City / State (2-column grid, optional)
 * - Postal Code / Country (2-column grid, optional, country defaults to "USA")
 *
 * Features:
 * - Dual mode: create (no customer prop) or edit (with customer prop)
 * - Title changes based on mode ("New Customer" vs "Edit Customer")
 * - Pre-fills form data in edit mode
 * - Client-side validation (required fields, email format)
 * - Trimmed values on submit (empty strings become undefined)
 * - Loading state ("Saving..." button text)
 * - Error display (red text below form)
 * - Cancel and Save buttons
 * - Click overlay to close (cancel)
 * - Form submission via Enter key
 *
 * Validation:
 * - First name and last name required (non-empty after trim)
 * - Email format validated if provided (regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
 *
 * @component
 * @param {CustomerFormModalProps} props - Component props
 * @returns {JSX.Element} Customer form modal
 *
 * @example
 * // Create mode
 * const [showCreate, setShowCreate] = useState(false);
 * {showCreate && (
 *   <CustomerFormModal
 *     onClose={() => setShowCreate(false)}
 *     onSuccess={() => { fetchCustomers(); setShowCreate(false); }}
 *   />
 * )}
 *
 * @example
 * // Edit mode
 * const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
 * {editCustomer && (
 *   <CustomerFormModal
 *     customer={editCustomer}
 *     onClose={() => setEditCustomer(null)}
 *     onSuccess={() => { fetchCustomers(); setEditCustomer(null); }}
 *   />
 * )}
 *
 * @see {@link CustomersPage} - Parent page using this modal
 */
const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ customer, onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address_line1: customer?.address_line1 || '',
    address_line2: customer?.address_line2 || '',
    city: customer?.city || '',
    state: customer?.state || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || 'USA',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode if customer prop provided
  const isEdit = !!customer;

  /**
   * Handle input field change
   * Updates formData state with new value
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Handle form submission
   * Validates, trims values, dispatches create/update, calls onSuccess
   *
   * @async
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First name and last name are required');
      return;
    }

    // Validation: email format (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        // Edit mode: update existing customer
        await dispatch(
          updateCustomer({
            id: customer.id,
            data: {
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              email: formData.email.trim() || undefined,
              phone: formData.phone.trim() || undefined,
              address_line1: formData.address_line1.trim() || undefined,
              address_line2: formData.address_line2.trim() || undefined,
              city: formData.city.trim() || undefined,
              state: formData.state.trim() || undefined,
              postal_code: formData.postal_code.trim() || undefined,
              country: formData.country.trim() || undefined,
            },
          })
        ).unwrap();
      } else {
        // Create mode: create new customer
        await dispatch(
          createCustomer({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            address_line1: formData.address_line1.trim() || undefined,
            address_line2: formData.address_line2.trim() || undefined,
            city: formData.city.trim() || undefined,
            state: formData.state.trim() || undefined,
            postal_code: formData.postal_code.trim() || undefined,
            country: formData.country.trim() || undefined,
          })
        ).unwrap();
      }
      onSuccess();
    } catch (err: any) {
      setError(err || `Failed to ${isEdit ? 'update' : 'create'} customer`);
      setIsSubmitting(false);
    }
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
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
      padding: '30px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    header: {
      marginBottom: '24px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#333',
      marginBottom: '8px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    label: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#333',
    },
    required: {
      color: '#dc3545',
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'inherit',
    },
    error: {
      color: '#dc3545',
      fontSize: '14px',
      marginTop: '-10px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    button: {
      padding: '10px 24px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    cancelButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    submitButton: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      color: '#666',
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* Modal content (click does NOT close) */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header: title changes based on mode */}
        <div style={styles.header}>
          <div style={styles.title}>
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </div>
        </div>

        {/* Customer form with all fields */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              First Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Last Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              placeholder="optional"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              placeholder="optional"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Address Line 1</label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              placeholder="Street address (optional)"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              style={styles.input}
              disabled={isSubmitting}
              placeholder="Apt, suite, etc. (optional)"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={styles.field}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                style={styles.input}
                disabled={isSubmitting}
                placeholder="optional"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                style={styles.input}
                disabled={isSubmitting}
                placeholder="optional"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={styles.field}>
              <label style={styles.label}>Postal Code</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                style={styles.input}
                disabled={isSubmitting}
                placeholder="optional"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                style={styles.input}
                disabled={isSubmitting}
                placeholder="USA"
              />
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...styles.button, ...styles.cancelButton }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(isSubmitting ? styles.submitButtonDisabled : styles.submitButton),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormModal;
