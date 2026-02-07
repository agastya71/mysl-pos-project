import React, { useState } from 'react';
import { CartItem as CartItemType } from '../../store/slices/cart.slice';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (product_id: string, quantity: number) => void;
  onRemove: (product_id: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const [quantity, setQuantity] = useState(item.quantity.toString());

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdateQuantity(item.product_id, numValue);
    }
  };

  const handleIncrement = () => {
    const newQuantity = item.quantity + 1;
    setQuantity(newQuantity.toString());
    onUpdateQuantity(item.product_id, newQuantity);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;
      setQuantity(newQuantity.toString());
      onUpdateQuantity(item.product_id, newQuantity);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        <h4 style={styles.name}>{item.product.name}</h4>
        <p style={styles.sku}>SKU: {item.product.sku}</p>
        <p style={styles.price}>${Number(item.unit_price).toFixed(2)} each</p>
      </div>
      <div style={styles.controls}>
        <div style={styles.quantityControls}>
          <button onClick={handleDecrement} style={styles.quantityButton}>
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            style={styles.quantityInput}
            min="1"
          />
          <button onClick={handleIncrement} style={styles.quantityButton}>
            +
          </button>
        </div>
        <div style={styles.totals}>
          <p style={styles.lineTotal}>${Number(item.line_total).toFixed(2)}</p>
          <button onClick={() => onRemove(item.product_id)} style={styles.removeButton}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '0.75rem',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: '0 0 0.25rem 0',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sku: {
    fontSize: '0.75rem',
    color: '#666',
    margin: '0 0 0.25rem 0',
  },
  price: {
    fontSize: '0.75rem',
    color: '#666',
    margin: 0,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    alignItems: 'flex-end',
  },
  quantityControls: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
  },
  quantityButton: {
    width: '28px',
    height: '28px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  quantityInput: {
    width: '50px',
    padding: '0.25rem',
    textAlign: 'center' as const,
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  totals: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  lineTotal: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#007bff',
    margin: 0,
  },
  removeButton: {
    border: 'none',
    background: 'none',
    color: '#dc3545',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.25rem',
    lineHeight: 1,
  },
};

export default CartItem;
