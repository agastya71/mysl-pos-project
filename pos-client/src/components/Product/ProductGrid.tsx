/**
 * @fileoverview ProductGrid Component - Responsive grid of product cards
 *
 * Displays products in responsive grid layout using ProductCard components.
 * Shows empty state when no products match search.
 *
 * @module components/Product/ProductGrid
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React from 'react';
import { Product } from '../../types/product.types';
import ProductCard from './ProductCard';

/**
 * ProductGrid component props
 *
 * @interface ProductGridProps
 * @property {Product[]} products - Array of products to display
 * @property {function} onAddToCart - Callback when product added to cart
 */
interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

/**
 * ProductGrid Component
 *
 * Responsive grid displaying product cards. Uses CSS Grid with auto-fill
 * for responsive columns (minimum 150px per card).
 *
 * @component
 * @param {ProductGridProps} props - Component props
 * @returns {JSX.Element} Product grid or empty state
 *
 * @example
 * <ProductGrid
 *   products={products}
 *   onAddToCart={handleAddToCart}
 * />
 */
const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart }) => {
  if (products.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No products found. Try a different search term.</p>
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#666',
  },
};

export default ProductGrid;
