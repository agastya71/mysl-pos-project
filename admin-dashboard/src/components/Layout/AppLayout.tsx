import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Outlet, NavLink as RouterNavLink } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/auth.slice';

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  return (
    <RouterNavLink
      to={to}
      style={({ isActive }) => ({
        ...styles.navLink,
        ...(isActive ? styles.navLinkActive : {}),
      })}
    >
      {children}
    </RouterNavLink>
  );
};

export const AppLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>POS Admin</h1>
          <div style={styles.userSection}>
            <span style={styles.username}>{user?.full_name}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/transactions">Transactions</NavLink>
            <NavLink to="/users">Users</NavLink>
            <NavLink to="/reports">Reports</NavLink>
          </nav>
        </aside>
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
  },
  header: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '0 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
    height: '60px',
  },
  logo: {
    fontSize: '24px',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  username: {
    fontSize: '14px',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    color: '#28a745',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #dee2e6',
    padding: '1rem 0',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navLink: {
    display: 'block',
    padding: '0.75rem 1.5rem',
    color: '#333',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  navLinkActive: {
    backgroundColor: '#e9ecef',
    fontWeight: '600',
    borderLeft: '3px solid #28a745',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#f5f5f5',
  },
};
