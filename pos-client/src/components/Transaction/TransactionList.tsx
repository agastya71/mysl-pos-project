import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTransactionById } from '../../store/slices/transactions.slice';
import TransactionRow from './TransactionRow';

const TransactionList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((state: RootState) => state.transactions);

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

  if (isLoading && items.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>Error: {error}</div>
      </div>
    );
  }

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>Transaction #</div>
        <div>Date</div>
        <div>Total</div>
        <div>Status</div>
      </div>
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
