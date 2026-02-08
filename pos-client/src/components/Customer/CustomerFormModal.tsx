import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { createCustomer, updateCustomer } from '../../store/slices/customers.slice';
import { Customer } from '../../types/customer.types';

interface CustomerFormModalProps {
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

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

  const isEdit = !!customer;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First name and last name are required');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
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
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>
            {isEdit ? 'Edit Customer' : 'New Customer'}
          </div>
        </div>

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
