import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateQuantity, removeFromCart, clearCart } from '../../store/slices/cart.slice';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import CartActions from './CartActions';

interface CartPanelProps {
  onCheckout: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ onCheckout }) => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);

  const handleUpdateQuantity = (product_id: string, quantity: number) => {
    dispatch(updateQuantity({ product_id, quantity }));
  };

  const handleRemove = (product_id: string) => {
    dispatch(removeFromCart(product_id));
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the cart?')) {
      dispatch(clearCart());
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Shopping Cart</h2>
        <span style={styles.itemCount}>
          {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div style={styles.itemsContainer}>
        {cart.items.length === 0 ? (
          <div style={styles.empty}>
            <p>Cart is empty</p>
            <p style={styles.emptyHint}>Search and add products to start</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <CartItem
              key={item.product_id}
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      <CartSummary
        subtotal={cart.subtotal}
        tax_amount={cart.tax_amount}
        discount_amount={cart.discount_amount}
        total_amount={cart.total_amount}
      />

      <CartActions
        hasItems={cart.items.length > 0}
        onClearCart={handleClearCart}
        onCheckout={onCheckout}
      />
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'white',
  },
  header: {
    padding: '1rem',
    borderBottom: '2px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  itemCount: {
    fontSize: '0.875rem',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
  },
  itemsContainer: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#999',
  },
  emptyHint: {
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
};

export default CartPanel;
