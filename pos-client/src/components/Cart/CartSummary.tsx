import React from 'react';

interface CartSummaryProps {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, tax_amount, discount_amount, total_amount }) => {
  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Subtotal:</span>
        <span style={styles.value}>${Number(subtotal).toFixed(2)}</span>
      </div>
      {discount_amount > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>Discount:</span>
          <span style={{...styles.value, color: '#dc3545'}}>-${Number(discount_amount).toFixed(2)}</span>
        </div>
      )}
      <div style={styles.row}>
        <span style={styles.label}>Tax:</span>
        <span style={styles.value}>${Number(tax_amount).toFixed(2)}</span>
      </div>
      <div style={{...styles.row, ...styles.totalRow}}>
        <span style={styles.totalLabel}>Total:</span>
        <span style={styles.totalValue}>${Number(total_amount).toFixed(2)}</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    borderTop: '2px solid #e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    color: '#666',
  },
  value: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  totalRow: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #ddd',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  totalValue: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#007bff',
  },
};

export default CartSummary;
