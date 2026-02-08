/**
 * @fileoverview TransactionList Component - Transaction history list container
 *
 * Container displaying list of transactions with header, rows, and state handling.
 * Manages loading, error, and empty states. Dispatches fetch on row click.
 *
 * @module components/Transaction/TransactionList
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTransactionById } from '../../store/slices/transactions.slice';
import TransactionRow from './TransactionRow';

/**
 * TransactionList Component
 *
 * Main list container for transaction history page.
 * Displays header row and TransactionRow components with state handling.
 *
 * Features:
 * - Header row with column labels (matches TransactionRow grid)
 * - Loading state (shown only on initial load, items.length = 0)
 * - Error state (red text with error message)
 * - Empty state (document icon, "No transactions found")
 * - Transaction rows (clickable, opens details modal)
 *
 * State Handling:
 * - Loading + no items: Show "Loading transactions..."
 * - Error: Show "Error: {message}"
 * - No items (after load): Show empty state
 * - Has items: Show header + rows
 *
 * Grid Layout:
 * - 4 columns: 2fr, 2fr, 1.5fr, 1fr
 * - Matches TransactionRow column widths
 *
 * @component
 * @returns {JSX.Element} Transaction list with header and rows
 *
 * @example
 * // Basic usage in TransactionHistoryPage
 * <FilterBar />
 * <TransactionList />
 * <Pagination />
 *
 * @example
 * // Click flow
 * // 1. User clicks transaction row
 * // 2. handleTransactionClick dispatches fetchTransactionById
 * // 3. Redux fetches full details, sets selectedTransaction
 * // 4. TransactionHistoryPage opens TransactionDetailsModal
 *
 * @see {@link TransactionRow} - Individual row component
 * @see {@link TransactionDetailsModal} - Details modal (opened on row click)
 * @see {@link FilterBar} - Search/filter controls
 */
const TransactionList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.transactions);

  /**
   * Handle transaction row click
   * Fetches full transaction details, sets selectedTransaction in Redux
   * Parent page (TransactionHistoryPage) opens details modal when selected
   *
   * @param {string} transactionId - Transaction ID to fetch
   */
  const handleTransactionClick = (transactionId: string) => {
    dispatch(fetchTransactionById(transactionId));
  };

  const styles = {
    container: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    header: {
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6',
      fontWeight: 600,
      fontSize: '12px',
      color: '#555',
      textTransform: 'uppercase' as const,
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
        <div style={styles.loadingState}>Loading transactions...</div>
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

  // Empty state - shown when no transactions found (after successful load)
  if (items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📝</div>
          <div style={styles.emptyText}>No transactions found</div>
        </div>
      </div>
    );
  }

  // List view - header + transaction rows
  return (
    <div style={styles.container}>
      {/* Header row with column labels (matches TransactionRow grid) */}
      <div style={styles.header}>
        <div>Transaction #</div>
        <div>Date</div>
        <div>Total</div>
        <div>Status</div>
      </div>
      {/* Transaction rows (clickable) */}
      {items.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          onClick={() => handleTransactionClick(transaction.id)}
        />
      ))}
    </div>
  );
};

export default TransactionList;
