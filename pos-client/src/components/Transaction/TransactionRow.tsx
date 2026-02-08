/**
 * @fileoverview TransactionRow Component - Individual transaction row in list
 *
 * Single row displaying transaction summary: number, date, total, status.
 * Clickable row with hover effect, color-coded status badge.
 *
 * @module components/Transaction/TransactionRow
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { Transaction } from '../../types/transaction.types';

/**
 * TransactionRow component props
 *
 * @interface TransactionRowProps
 * @property {Transaction} transaction - Transaction data to display
 * @property {function} onClick - Callback when row clicked (opens details modal)
 */
interface TransactionRowProps {
  transaction: Transaction;
  onClick: () => void;
}

/**
 * TransactionRow Component
 *
 * Single row in transaction history list showing summary information.
 * Grid layout (4 columns), clickable, hover effect, color-coded status.
 *
 * Columns:
 * 1. Transaction Number (blue, bold) - 2fr
 * 2. Date (formatted: "Jan 15, 2024, 02:30 PM") - 2fr
 * 3. Total (currency formatted: "$123.45") - 1.5fr
 * 4. Status Badge (color-coded pill) - 1fr
 *
 * Status Colors:
 * - Completed: Green (#28a745)
 * - Voided: Red (#dc3545)
 * - Refunded: Gray (#6c757d)
 * - Draft: Yellow (#ffc107, black text)
 *
 * Features:
 * - Hover effect (light gray background)
 * - Cursor pointer
 * - Label + value layout per cell
 * - Responsive grid columns
 *
 * @component
 * @param {TransactionRowProps} props - Component props
 * @returns {JSX.Element} Transaction row
 *
 * @example
 * // Used in TransactionList
 * {transactions.map((txn) => (
 *   <TransactionRow
 *     key={txn.id}
 *     transaction={txn}
 *     onClick={() => handleViewDetails(txn.id)}
 *   />
 * ))}
 *
 * @see {@link TransactionList} - Parent component
 * @see {@link TransactionDetailsModal} - Opened when row clicked
 */
const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onClick }) => {
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
   * Get color-coded status badge
   * Returns pill-shaped badge with status-specific background color
   *
   * @param {string} status - Transaction status
   * @returns {JSX.Element} Status badge
   */
  const getStatusBadge = (status: Transaction['status']) => {
    const statusStyles: Record<string, React.CSSProperties> = {
      completed: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      },
      voided: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      },
      refunded: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      },
      draft: {
        backgroundColor: '#ffc107',
        color: 'black',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-block',
      },
    };

    return (
      <span style={statusStyles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const styles = {
    row: {
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
      padding: '16px',
      borderBottom: '1px solid #eee',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    } as React.CSSProperties,
    cell: {
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
    },
    label: {
      fontSize: '11px',
      color: '#999',
      marginBottom: '4px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
    },
    value: {
      fontSize: '14px',
      color: '#333',
      fontWeight: 500,
    },
    transactionNumber: {
      fontSize: '14px',
      color: '#007bff',
      fontWeight: 600,
    },
  };

  return (
    <div
      style={styles.row}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8f9fa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Column 1: Transaction Number (blue, bold) */}
      <div style={styles.cell}>
        <div style={styles.label}>Transaction #</div>
        <div style={styles.transactionNumber}>{transaction.transaction_number}</div>
      </div>
      {/* Column 2: Transaction Date (formatted) */}
      <div style={styles.cell}>
        <div style={styles.label}>Date</div>
        <div style={styles.value}>{formatDate(transaction.transaction_date)}</div>
      </div>
      {/* Column 3: Total Amount (currency) */}
      <div style={styles.cell}>
        <div style={styles.label}>Total</div>
        <div style={styles.value}>{formatCurrency(transaction.total_amount)}</div>
      </div>
      {/* Column 4: Status Badge (color-coded) */}
      <div style={styles.cell}>
        <div style={styles.label}>Status</div>
        <div>{getStatusBadge(transaction.status)}</div>
      </div>
    </div>
  );
};

export default TransactionRow;
