import React from 'react';
import { Product } from '../../types/product.types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

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
