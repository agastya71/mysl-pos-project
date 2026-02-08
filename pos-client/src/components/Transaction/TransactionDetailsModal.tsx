/**
 * @fileoverview TransactionDetailsModal Component - Full transaction details modal
 *
 * Comprehensive modal displaying complete transaction information: header, items table,
 * payments, totals, void information. Supports voiding completed transactions.
 *
 * @module components/Transaction/TransactionDetailsModal
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { clearSelectedTransaction } from '../../store/slices/transactions.slice';
import VoidTransactionModal from './VoidTransactionModal';

/**
 * TransactionDetailsModal Component
 *
 * Full-screen modal showing complete transaction details. Opened when user clicks
 * transaction row in TransactionList. Reads selectedTransaction from Redux.
 *
 * Sections:
 * 1. Header: Transaction number, status badge
 * 2. Transaction Info: Date, cashier, terminal, customer, void details (if voided)
 * 3. Items: Table with product name/SKU, quantity, price, line total
 * 4. Payments: List with method, amount, cash details (received/change)
 * 5. Totals: Subtotal, tax, discount (if any), grand total
 * 6. Actions: Close button, Void button (only for completed status)
 *
 * Features:
 * - Returns null when no transaction selected (hidden state)
 * - Click overlay to close
 * - Click inside modal does NOT close (stopPropagation)
 * - Void Transaction button opens VoidTransactionModal
 * - Status badge color-coded (green, red, gray, yellow)
 * - Responsive grid layouts for info sections
 * - Currency and date formatting
 *
 * Void Flow:
 * 1. User clicks "Void Transaction" (only visible for completed status)
 * 2. VoidTransactionModal opens (reason input)
 * 3. On success: void modal closes, details modal refreshes with voided status
 *
 * @component
 * @returns {JSX.Element | null} Transaction details modal or null
 *
 * @example
 * // Basic usage in TransactionHistoryPage
 * // Automatically shown when selectedTransaction exists in Redux
 * <TransactionDetailsModal />
 *
 * @example
 * // Flow: user clicks transaction row
 * // → TransactionList dispatches fetchTransactionById
 * // → Redux sets selectedTransaction
 * // → TransactionDetailsModal renders automatically
 * // → User can view details or void transaction
 *
 * @see {@link TransactionList} - Opens this modal on row click
 * @see {@link VoidTransactionModal} - Nested modal for voiding
 */
const TransactionDetailsModal: React.FC = () => {
  const dispatch = useDispatch();
  const transaction = useSelector((state: RootState) => state.transactions.selectedTransaction);
  const [showVoidModal, setShowVoidModal] = useState(false);

  if (!transaction) return null;

  /**
   * Format date string to readable format
   * Example: "2024-01-15T14:30:00Z" → "Jan 15, 2024, 02:30 PM"
   *
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Format amount to USD currency
   * Example: 123.45 → "$123.45"
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
   * Handle closing modal
   * Clears selectedTransaction in Redux (triggers modal unmount)
   */
  const handleClose = () => {
    dispatch(clearSelectedTransaction());
  };

  /**
   * Handle successful void operation
   * Closes void modal (details modal stays open, shows updated status)
   */
  const handleVoidSuccess = () => {
    setShowVoidModal(false);
  };

  // Void button only shown for completed transactions
  const canVoid = transaction.status === 'completed';

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
      overflowY: 'auto' as const,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      margin: '20px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #eee',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#333',
      marginBottom: '4px',
    },
    transactionNumber: {
      fontSize: '18px',
      color: '#007bff',
      fontWeight: 600,
    },
    statusBadge: {
      padding: '6px 16px',
      borderRadius: '16px',
      fontSize: '14px',
      fontWeight: 600,
    } as React.CSSProperties,
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#333',
      marginBottom: '12px',
      textTransform: 'uppercase' as const,
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '16px',
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    infoLabel: {
      fontSize: '12px',
      color: '#999',
      marginBottom: '4px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    infoValue: {
      fontSize: '14px',
      color: '#333',
      fontWeight: 500,
    },
    itemsTable: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginTop: '12px',
    },
    tableHeader: {
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6',
    },
    tableHeaderCell: {
      padding: '12px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: 600,
      color: '#555',
      textTransform: 'uppercase' as const,
    },
    tableRow: {
      borderBottom: '1px solid #eee',
    },
    tableCell: {
      padding: '12px',
      fontSize: '14px',
      color: '#333',
    },
    totalsBox: {
      backgroundColor: '#f8f9fa',
      padding: '16px',
      borderRadius: '8px',
      marginTop: '16px',
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '14px',
    },
    totalLabel: {
      color: '#666',
    },
    totalValue: {
      fontWeight: 600,
      color: '#333',
    },
    grandTotal: {
      fontSize: '18px',
      fontWeight: 700,
      paddingTop: '8px',
      borderTop: '2px solid #dee2e6',
      marginTop: '8px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '2px solid #eee',
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
    closeButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    voidButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
  };

  /**
   * Get status badge style with color
   * Returns pill badge style with status-specific background color
   *
   * Colors:
   * - Completed: Green (#28a745)
   * - Voided: Red (#dc3545)
   * - Refunded: Gray (#6c757d)
   * - Draft: Yellow (#ffc107, black text)
   *
   * @param {string} status - Transaction status
   * @returns {React.CSSProperties} Badge style object
   */
  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = styles.statusBadge;
    switch (status) {
      case 'completed':
        return { ...baseStyle, backgroundColor: '#28a745', color: 'white' };
      case 'voided':
        return { ...baseStyle, backgroundColor: '#dc3545', color: 'white' };
      case 'refunded':
        return { ...baseStyle, backgroundColor: '#6c757d', color: 'white' };
      case 'draft':
        return { ...baseStyle, backgroundColor: '#ffc107', color: 'black' };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* Overlay (click to close) */}
      <div style={styles.overlay} onClick={handleClose}>
        {/* Modal content (click does NOT close) */}
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header: transaction number and status badge */}
          <div style={styles.header}>
            <div>
              <div style={styles.title}>Transaction Details</div>
              <div style={styles.transactionNumber}>{transaction.transaction_number}</div>
            </div>
            <div style={getStatusBadgeStyle(transaction.status)}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </div>
          </div>

          {/* Section 1: Transaction Information (date, cashier, terminal, customer, void details) */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Transaction Information</div>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Date</div>
                <div style={styles.infoValue}>{formatDate(transaction.transaction_date)}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Cashier</div>
                <div style={styles.infoValue}>{transaction.cashier_name || 'N/A'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Terminal</div>
                <div style={styles.infoValue}>{transaction.terminal_name || 'N/A'}</div>
              </div>
              {transaction.customer_name && (
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Customer</div>
                  <div style={styles.infoValue}>{transaction.customer_name}</div>
                </div>
              )}
            </div>
            {transaction.status === 'voided' && transaction.void_reason && (
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Void Reason</div>
                  <div style={styles.infoValue}>{transaction.void_reason}</div>
                </div>
                {transaction.voided_at && (
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Voided At</div>
                    <div style={styles.infoValue}>{formatDate(transaction.voided_at)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Items table (product, qty, price, total) */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Items</div>
            <table style={styles.itemsTable}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Product</th>
                  <th style={{ ...styles.tableHeaderCell, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...styles.tableHeaderCell, textAlign: 'right' }}>Price</th>
                  <th style={{ ...styles.tableHeaderCell, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item) => (
                  <tr key={item.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div>{item.product_snapshot.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        SKU: {item.product_snapshot.sku}
                      </div>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Payments list (method, amount, cash details) */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Payments</div>
            {transaction.payments.map((payment) => (
              <div key={payment.id} style={{ marginBottom: '8px' }}>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Payment Method</div>
                    <div style={styles.infoValue}>
                      {payment.payment_method.charAt(0).toUpperCase() +
                        payment.payment_method.slice(1).replace('_', ' ')}
                    </div>
                  </div>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>Amount</div>
                    <div style={styles.infoValue}>{formatCurrency(payment.amount)}</div>
                  </div>
                  {payment.details?.cash_received && (
                    <>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>Cash Received</div>
                        <div style={styles.infoValue}>
                          {formatCurrency(payment.details.cash_received)}
                        </div>
                      </div>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>Change</div>
                        <div style={styles.infoValue}>
                          {formatCurrency(payment.details.cash_change || 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Section 4: Totals box (subtotal, tax, discount, grand total) */}
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <div style={styles.totalLabel}>Subtotal</div>
              <div style={styles.totalValue}>{formatCurrency(transaction.subtotal)}</div>
            </div>
            <div style={styles.totalRow}>
              <div style={styles.totalLabel}>Tax</div>
              <div style={styles.totalValue}>{formatCurrency(transaction.tax_amount)}</div>
            </div>
            {transaction.discount_amount > 0 && (
              <div style={styles.totalRow}>
                <div style={styles.totalLabel}>Discount</div>
                <div style={styles.totalValue}>
                  -{formatCurrency(transaction.discount_amount)}
                </div>
              </div>
            )}
            <div style={{ ...styles.totalRow, ...styles.grandTotal }}>
              <div style={styles.totalLabel}>Total</div>
              <div style={styles.totalValue}>{formatCurrency(transaction.total_amount)}</div>
            </div>
          </div>

          {/* Section 5: Action buttons (Close, Void) */}
          <div style={styles.buttonGroup}>
            <button onClick={handleClose} style={{ ...styles.button, ...styles.closeButton }}>
              Close
            </button>
            {/* Void button only shown for completed transactions */}
            {canVoid && (
              <button
                onClick={() => setShowVoidModal(true)}
                style={{ ...styles.button, ...styles.voidButton }}
              >
                Void Transaction
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Void Transaction Modal (nested, shown when void button clicked) */}
      {showVoidModal && (
        <VoidTransactionModal
          transactionId={transaction.id}
          transactionNumber={transaction.transaction_number}
          onClose={() => setShowVoidModal(false)}
          onSuccess={handleVoidSuccess}
        />
      )}
    </>
  );
};

export default TransactionDetailsModal;
