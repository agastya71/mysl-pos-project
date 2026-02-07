import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilters, fetchTransactions } from '../../store/slices/transactions.slice';
import { RootState, AppDispatch } from '../../store';

const FilterBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector((state: RootState) => state.transactions.filters);

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');
  const [localStatus, setLocalStatus] = useState(filters.status || '');

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
      <div style={styles.grid}>
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

        <div style={styles.field}>
          <label style={styles.label}>Start Date</label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>End Date</label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            style={styles.input}
          />
        </div>

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
