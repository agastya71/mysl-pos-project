import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/auth.slice';
import ProductPanel from '../components/Product/ProductPanel';
import CartPanel from '../components/Cart/CartPanel';
import CheckoutModal from '../components/Checkout/CheckoutModal';

export const POSPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const handleCheckout = () => {
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>POS System</h1>
        <div style={styles.userInfo}>
          <span>Welcome, {user?.full_name}</span>
          <button onClick={() => navigate('/customers')} style={styles.historyButton}>
            👥 Customers
          </button>
          <button onClick={() => navigate('/categories')} style={styles.historyButton}>
            📁 Categories
          </button>
          <button onClick={() => navigate('/inventory')} style={styles.historyButton}>
            📦 Inventory
          </button>
          <button onClick={() => navigate('/pos/history')} style={styles.historyButton}>
            📋 History
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>
      <main style={styles.layout}>
        <div style={styles.productPanel}>
          <ProductPanel />
        </div>
        <div style={styles.cartPanel}>
          <CartPanel onCheckout={handleCheckout} />
        </div>
      </main>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={handleCloseCheckout} />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#007bff',
    color: 'white',
  },
  title: {
    fontSize: '24px',
    margin: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  historyButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    color: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    color: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  layout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  productPanel: {
    flex: '0 0 65%',
    padding: '1rem',
    overflowY: 'auto' as const,
  },
  cartPanel: {
    flex: '0 0 35%',
    backgroundColor: 'white',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
  },
};
