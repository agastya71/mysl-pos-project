import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { fetchTransactions, setPage } from '../store/slices/transactions.slice';
import FilterBar from '../components/Transaction/FilterBar';
import TransactionList from '../components/Transaction/TransactionList';
import TransactionDetailsModal from '../components/Transaction/TransactionDetailsModal';
import Pagination from '../components/common/Pagination';

const TransactionHistoryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { pagination, selectedTransaction } = useSelector(
    (state: RootState) => state.transactions
  );

  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);

  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
    dispatch(fetchTransactions());
  };

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    },
    header: {
      backgroundColor: 'white',
      borderBottom: '2px solid #eee',
      padding: '20px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    title: {
      fontSize: '24px',
      fontWeight: 700,
      color: '#333',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '30px 40px',
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => navigate('/pos')}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
            }}
          >
            ← Back to POS
          </button>
          <h1 style={styles.title}>Transaction History</h1>
        </div>
      </div>

      <div style={styles.container}>
        <FilterBar />
        <TransactionList />
        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {selectedTransaction && <TransactionDetailsModal />}
    </div>
  );
};

export default TransactionHistoryPage;
