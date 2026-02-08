/**
 * @fileoverview CustomerList Component - Customer list table with edit functionality
 *
 * Table displaying all customers with contact info, stats, and edit button.
 * Opens CustomerFormModal for editing.
 *
 * @module components/Customer/CustomerList
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchCustomers } from '../../store/slices/customers.slice';
import { Customer } from '../../types/customer.types';
import CustomerFormModal from './CustomerFormModal';

/**
 * CustomerList Component
 *
 * Table displaying all customers from Redux state with edit functionality.
 * Manages CustomerFormModal for editing selected customer.
 *
 * Table Columns:
 * - Customer # (blue, bold, auto-generated CUST-XXXXXX)
 * - Name (first + last)
 * - Email (gray, "-" if empty)
 * - Phone ("-" if empty)
 * - Total Spent (currency formatted, bold)
 * - Transactions (count, bold)
 * - Actions (Edit button)
 *
 * Features:
 * - Loading state (shown only on initial load, items.length = 0)
 * - Error state (red text with error message)
 * - Empty state (people icon, "No customers found")
 * - Row hover effect (light gray background)
 * - Edit button hover effect (darker blue)
 * - Edit modal opens when Edit button clicked
 * - Auto-refreshes list after successful edit
 *
 * @component
 * @returns {JSX.Element} Customer list table or state view
 *
 * @example
 * // Basic usage in CustomersPage
 * <CustomerList />
 *
 * @example
 * // Edit flow
 * // 1. User clicks Edit button on row
 * // 2. CustomerFormModal opens in edit mode
 * // 3. User updates fields, clicks Update
 * // 4. API call succeeds, list refreshes
 * // 5. Modal closes
 *
 * @see {@link CustomerFormModal} - Edit modal opened by Edit button
 * @see {@link CustomersPage} - Parent page
 */
const CustomerList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.customers);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  /**
   * Format amount to USD currency
   * Example: 1234.56 → "$1,234.56"
   *
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Handle successful customer edit
   * Closes modal, refreshes customer list
   */
  const handleEditSuccess = () => {
    setEditingCustomer(null);
    dispatch(fetchCustomers());
  };

  const styles = {
    container: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    thead: {
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6',
    },
    th: {
      padding: '16px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: 600,
      color: '#555',
      textTransform: 'uppercase' as const,
    },
    tbody: {},
    tr: {
      borderBottom: '1px solid #eee',
      transition: 'background-color 0.2s',
    },
    td: {
      padding: '16px',
      fontSize: '14px',
      color: '#333',
    },
    customerNumber: {
      color: '#007bff',
      fontWeight: 600,
    },
    email: {
      color: '#666',
    },
    stat: {
      fontWeight: 600,
    },
    actions: {
      display: 'flex',
      gap: '8px',
    },
    editButton: {
      padding: '6px 12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    emptyState: {
      padding: '60px 20px',
      textAlign: 'center' as const,
      color: '#999',
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px',
    },
    emptyText: {
      fontSize: '16px',
      fontWeight: 500,
    },
    loadingState: {
      padding: '60px 20px',
      textAlign: 'center' as const,
      color: '#007bff',
      fontSize: '16px',
    },
    errorState: {
      padding: '60px 20px',
      textAlign: 'center' as const,
      color: '#dc3545',
      fontSize: '16px',
    },
  };

  // Loading state - shown only on initial load (no items yet)
  if (isLoading && items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>Loading customers...</div>
      </div>
    );
  }

  // Error state - shown when API fetch fails
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>Error: {error}</div>
      </div>
    );
  }

  // Empty state - shown when no customers found (after successful load)
  if (items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <div style={styles.emptyText}>No customers found</div>
        </div>
      </div>
    );
  }

  // Table view - header + customer rows
  return (
    <>
      <div style={styles.container}>
        <table style={styles.table}>
          {/* Table header */}
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Customer #</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Total Spent</th>
              <th style={styles.th}>Transactions</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody style={styles.tbody}>
            {items.map((customer) => (
              <tr
                key={customer.id}
                style={styles.tr}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ ...styles.td, ...styles.customerNumber }}>
                  {customer.customer_number}
                </td>
                <td style={styles.td}>
                  {customer.first_name} {customer.last_name}
                </td>
                <td style={{ ...styles.td, ...styles.email }}>
                  {customer.email || '-'}
                </td>
                <td style={styles.td}>{customer.phone || '-'}</td>
                <td style={{ ...styles.td, ...styles.stat }}>
                  {formatCurrency(customer.total_spent)}
                </td>
                <td style={{ ...styles.td, ...styles.stat }}>
                  {customer.total_transactions}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => setEditingCustomer(customer)}
                      style={styles.editButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#0056b3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#007bff';
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal (shown when Edit button clicked) */}
      {editingCustomer && (
        <CustomerFormModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};

export default CustomerList;
