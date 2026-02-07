import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const Overview: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard Overview</h1>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>Welcome</h3>
          <p>{user?.full_name}</p>
          <p style={styles.info}>Role: {user?.role}</p>
        </div>
        <div style={styles.card}>
          <h3>Quick Stats</h3>
          <p>Statistics will be displayed here</p>
        </div>
        <div style={styles.card}>
          <h3>Recent Activity</h3>
          <p>Recent transactions and updates</p>
        </div>
        <div style={styles.card}>
          <h3>System Status</h3>
          <p style={styles.success}>All systems operational</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
  },
  title: {
    fontSize: '28px',
    marginBottom: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  info: {
    color: '#666',
    fontSize: '14px',
  },
  success: {
    color: '#28a745',
    fontWeight: '500',
  },
};
