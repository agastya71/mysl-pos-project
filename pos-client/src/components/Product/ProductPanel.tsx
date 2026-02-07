import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addToCart } from '../../store/slices/cart.slice';
import { fetchProducts } from '../../store/slices/products.slice';
import { Product } from '../../types/product.types';
import SearchBar from './SearchBar';
import ProductGrid from './ProductGrid';

const ProductPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, searchResults, searchQuery, isLoading, error } = useAppSelector((state) => state.products);

  // Load all products on mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: 100 }));
  }, [dispatch]);

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({ product, quantity: 1 }));
  };

  // Show search results when searching, otherwise show all products
  const displayProducts = searchQuery ? searchResults : items;

  return (
    <div style={styles.container}>
      <SearchBar />
      {error && <div style={styles.error}>{error}</div>}
      {isLoading ? (
        <div style={styles.loading}>Loading products...</div>
      ) : (
        <ProductGrid products={displayProducts} onAddToCart={handleAddToCart} />
      )}
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#666',
  },
};

export default ProductPanel;
