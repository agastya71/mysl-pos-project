/**
 * @fileoverview FilterBar Component - Transaction search and filter controls
 *
 * Filter controls for transaction history: search by number, date range, and status.
 * Local state management with Search/Clear buttons.
 *
 * @module components/Transaction/FilterBar
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1D)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters, fetchTransactions } from '../../store/slices/transactions.slice';
import { RootState, AppDispatch } from '../../store';

/**
 * FilterBar Component
 *
 * Search and filter controls for transaction history page.
 * Uses local state for inputs, updates Redux on Search button or Enter key.
 *
 * Filter Fields:
 * - Transaction Number: Text search (partial match on transaction_number)
 * - Start Date: Date picker (YYYY-MM-DD)
 * - End Date: Date picker (YYYY-MM-DD)
 * - Status: Dropdown (All, Completed, Voided, Refunded, Draft)
 *
 * Features:
 * - Local state for all inputs (not synced until Search clicked)
 * - Search button: Updates Redux filters, triggers fetchTransactions
 * - Clear button: Resets all filters to empty/default, fetches all
 * - Enter key on transaction number input triggers search
 * - Responsive grid layout (auto-fit, min 200px columns)
 *
 * @component
 * @returns {JSX.Element} Filter bar with search controls
 *
 * @example
 * // Basic usage in TransactionHistoryPage
 * <FilterBar />
 * <TransactionList />
 *
 * @example
 * // Search flow
 * // 1. User types transaction number "TXN-000042"
 * // 2. Selects date range (2024-01-01 to 2024-01-31)
 * // 3. Clicks Search → Redux updated, API called with filters
 * // 4. TransactionList shows filtered results
 *
 * @see {@link TransactionHistoryPage} - Parent page
 */
const FilterBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.transactions.filters);

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');
  const [localStatus, setLocalStatus] = useState(filters.status || '');

  /**
   * Handle Search button click
   * Updates Redux filters from local state, triggers API fetch
   */
  const handleSearch = () => {
    dispatch(
      setFilters({
        search: localSearch,
        startDate: localStartDate || undefined,
        endDate: localEndDate || undefined,
        status: localStatus as any || undefined,
      })
    );
    dispatch(fetchTransactions());
  };

  /**
   * Handle Clear Filters button click
   * Resets local state and Redux filters, fetches all transactions
   */
  const handleClear = () => {
    setLocalSearch('');
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalStatus('');
    dispatch(
      setFilters({
        search: '',
        startDate: undefined,
        endDate: undefined,
        status: undefined,
      })
    );
    dispatch(fetchTransactions());
  };

  /**
   * Handle Enter key in transaction number input
   * Triggers search for better UX
   *
   * @param {React.KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const styles = {
    container: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '5px',
    },
    label: {
      fontSize: '12px',
      fontWeight: 600,
      color: '#555',
      textTransform: 'uppercase' as const,
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '8px 20px',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    searchButton: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    clearButton: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
  };

  return (
    <div style={styles.container}>
      {/* Filter inputs grid (responsive, auto-fit) */}
      <div style={styles.grid}>
        {/* Transaction number search (Enter key enabled) */}
        <div style={styles.field}>
          <label style={styles.label}>Transaction Number</label>
          <input
            type="text"
            placeholder="Search by transaction #..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.input}
          />
        </div>

        {/* Start date filter */}
        <div style={styles.field}>
          <label style={styles.label}>Start Date</label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* End date filter */}
        <div style={styles.field}>
          <label style={styles.label}>End Date</label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Status filter dropdown */}
        <div style={styles.field}>
          <label style={styles.label}>Status</label>
          <select
            value={localStatus}
            onChange={(e) => setLocalStatus(e.target.value)}
            style={styles.select}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="refunded">Refunded</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Action buttons (Clear and Search) */}
      <div style={styles.buttonGroup}>
        <button
          onClick={handleClear}
          style={{ ...styles.button, ...styles.clearButton }}
        >
          Clear Filters
        </button>
        <button
          onClick={handleSearch}
          style={{ ...styles.button, ...styles.searchButton }}
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
