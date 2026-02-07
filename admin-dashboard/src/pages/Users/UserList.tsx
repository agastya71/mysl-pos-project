import React from 'react';

export const UserList: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>👥</div>
        <h1 style={styles.title}>Users</h1>
        <p style={styles.subtitle}>Coming Soon</p>
        <p style={styles.description}>
          User management, roles, and permissions will be available in the next phase of development.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 60px)',
    padding: '2rem',
  },
  content: {
    textAlign: 'center' as const,
    maxWidth: '500px',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '24px',
    color: '#28a745',
    marginBottom: '1rem',
    fontWeight: '600',
  },
  description: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
  },
};
