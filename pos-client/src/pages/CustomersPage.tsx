import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { fetchCustomers, setPage, setFilters } from '../store/slices/customers.slice';
import CustomerFormModal from '../components/Customer/CustomerFormModal';
import CustomerList from '../components/Customer/CustomerList';
import Pagination from '../components/common/Pagination';

const CustomersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { pagination, filters } = useSelector((state: RootState) => state.customers);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const handleSearch = () => {
    dispatch(setFilters({ search: searchInput }));
    dispatch(fetchCustomers());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    dispatch(setFilters({ search: '' }));
    dispatch(fetchCustomers());
  };

  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
    dispatch(fetchCustomers());
  };

  const handleCreateSuccess = () => {
    setIsFormModalOpen(false);
    dispatch(fetchCustomers());
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
    newButton: {
      padding: '10px 24px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '30px 40px',
    },
    searchBar: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      padding: '10px 16px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    searchButton: {
      padding: '10px 24px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
    },
    clearButton: {
      padding: '10px 24px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
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
          <h1 style={styles.title}>Customers</h1>
        </div>
        <button
          onClick={() => setIsFormModalOpen(true)}
          style={styles.newButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007bff';
          }}
        >
          + New Customer
        </button>
      </div>

      <div style={styles.container}>
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by name, email, phone, or customer number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchButton}>
            Search
          </button>
          <button onClick={handleClearSearch} style={styles.clearButton}>
            Clear
          </button>
        </div>

        <CustomerList />

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {isFormModalOpen && (
        <CustomerFormModal
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default CustomersPage;
