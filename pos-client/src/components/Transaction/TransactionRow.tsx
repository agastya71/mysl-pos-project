import React from 'react';
import { Transaction } from '../../types/transaction.types';

interface TransactionRowProps {
  transaction: Transaction;
  onClick: () => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onClick }) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
      <div style={styles.cell}>
        <div style={styles.label}>Transaction #</div>
        <div style={styles.transactionNumber}>{transaction.transaction_number}</div>
      </div>
      <div style={styles.cell}>
        <div style={styles.label}>Date</div>
        <div style={styles.value}>{formatDate(transaction.transaction_date)}</div>
      </div>
      <div style={styles.cell}>
        <div style={styles.label}>Total</div>
        <div style={styles.value}>{formatCurrency(transaction.total_amount)}</div>
      </div>
      <div style={styles.cell}>
        <div style={styles.label}>Status</div>
        <div>{getStatusBadge(transaction.status)}</div>
      </div>
    </div>
  );
};

export default TransactionRow;
