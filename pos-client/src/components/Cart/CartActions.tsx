import React from 'react';

interface CartActionsProps {
  hasItems: boolean;
  onClearCart: () => void;
  onCheckout: () => void;
}

const CartActions: React.FC<CartActionsProps> = ({ hasItems, onClearCart, onCheckout }) => {
  return (
    <div style={styles.container}>
      <button
        onClick={onClearCart}
        disabled={!hasItems}
        style={{
          ...styles.button,
          ...styles.clearButton,
          ...(hasItems ? {} : styles.buttonDisabled),
        }}
      >
        Clear Cart
      </button>
      <button
        onClick={onCheckout}
        disabled={!hasItems}
        style={{
          ...styles.button,
          ...styles.checkoutButton,
          ...(hasItems ? {} : styles.buttonDisabled),
        }}
      >
        Checkout
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem',
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #e0e0e0',
  },
  button: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  clearButton: {
    backgroundColor: '#f8f9fa',
    color: '#333',
    border: '1px solid #ddd',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default CartActions;
