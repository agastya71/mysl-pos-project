/**
 * @fileoverview ProductCard Component - Individual product card for POS grid display
 *
 * Displays product information in a card format with image, details, and Add to Cart button.
 * Used in ProductGrid for POS product selection interface.
 *
 * Features:
 * - Product image with fallback placeholder
 * - Product name (2-line ellipsis), SKU, price, stock level
 * - Add to Cart button (disabled when out of stock)
 * - Hover effects (card shadow/transform)
 * - Out of stock state handling
 *
 * Card Layout:
 * - Image: 120px height, cover fit (or "No Image" placeholder)
 * - Content: Product name, SKU, price, stock
 * - Footer: Price + stock on left, Add button on right
 *
 * Button States:
 * - In stock: Blue background (#007bff), "Add" label, clickable
 * - Out of stock: Gray background (#ccc), "Out of Stock" label, disabled
 *
 * @module components/Product/ProductCard
 * @requires react
 * @requires ../../types/product.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { Product } from '../../types/product.types';

/**
 * ProductCard component props
 *
 * @interface ProductCardProps
 * @property {Product} product - Product data to display
 * @property {function} onAddToCart - Callback when Add button clicked
 */
interface ProductCardProps {
  /** Product data including name, price, SKU, stock, image */
  product: Product;
  /** Callback fired when user clicks Add button (passes product object) */
  onAddToCart: (product: Product) => void;
}

/**
 * ProductCard Component
 *
 * Presentational card component displaying product for POS selection.
 * Shows product image, details, and Add to Cart button.
 *
 * @component
 * @param {ProductCardProps} props - Component props
 * @returns {JSX.Element} Rendered product card
 *
 * @example
 * // Basic usage in ProductGrid
 * <ProductCard
 *   product={product}
 *   onAddToCart={handleAddToCart}
 * />
 *
 * @example
 * // Grid layout
 * <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
 *   {products.map(product => (
 *     <ProductCard
 *       key={product.id}
 *       product={product}
 *       onAddToCart={handleAddToCart}
 *     />
 *   ))}
 * </div>
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const isOutOfStock = product.quantity_in_stock === 0;

  return (
    <div style={styles.card}>
      {/* Product image or placeholder */}
      <div style={styles.imageContainer}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder}>
            <span style={styles.imagePlaceholderText}>No Image</span>
          </div>
        )}
      </div>

      {/* Product details */}
      <div style={styles.content}>
        <h3 style={styles.name}>{product.name}</h3>
        <p style={styles.sku}>SKU: {product.sku}</p>

        {/* Footer: Price/stock + Add button */}
        <div style={styles.footer}>
          <div>
            <p style={styles.price}>${Number(product.base_price).toFixed(2)}</p>
            <p style={styles.stock}>Stock: {product.quantity_in_stock}</p>
          </div>
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            style={{
              ...styles.addButton,
              ...(isOutOfStock ? styles.addButtonDisabled : {}),
            }}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  imageContainer: {
    width: '100%',
    height: '120px',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: '0.875rem',
  },
  content: {
    padding: '0.75rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  name: {
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: '0 0 0.25rem 0',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
  },
  sku: {
    fontSize: '0.75rem',
    color: '#666',
    margin: '0 0 0.5rem 0',
  },
  footer: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#007bff',
    margin: '0 0 0.25rem 0',
  },
  stock: {
    fontSize: '0.75rem',
    color: '#666',
    margin: 0,
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};

export default ProductCard;
