import React from 'react';

interface PaymentMethodSelectorProps {
  selectedMethod: 'cash' | 'credit_card' | 'debit_card' | 'check';
  onSelect: (method: 'cash' | 'credit_card' | 'debit_card' | 'check') => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ selectedMethod, onSelect }) => {
  const methods = [
    { value: 'cash' as const, label: 'Cash', icon: '💵' },
    { value: 'credit_card' as const, label: 'Credit Card', icon: '💳' },
    { value: 'debit_card' as const, label: 'Debit Card', icon: '💳' },
    { value: 'check' as const, label: 'Check', icon: '📝' },
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Select Payment Method</h3>
      <div style={styles.methods}>
        {methods.map((method) => (
          <button
            key={method.value}
            onClick={() => onSelect(method.value)}
            style={{
              ...styles.methodButton,
              ...(selectedMethod === method.value ? styles.methodButtonActive : {}),
            }}
          >
            <span style={styles.icon}>{method.icon}</span>
            <span style={styles.label}>{method.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: '1.5rem',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  methods: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  methodButton: {
    padding: '1rem',
    backgroundColor: 'white',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  methodButtonActive: {
    borderColor: '#007bff',
    backgroundColor: '#e7f3ff',
  },
  icon: {
    fontSize: '2rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
};

export default PaymentMethodSelector;
