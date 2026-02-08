/**
 * @fileoverview ProductPanel Component - Product selection panel for POS
 *
 * Container component combining SearchBar and ProductGrid.
 * Manages product state and Add to Cart functionality.
 *
 * @module components/Product/ProductPanel
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addToCart } from '../../store/slices/cart.slice';
import { fetchProducts } from '../../store/slices/products.slice';
import { Product } from '../../types/product.types';
import SearchBar from './SearchBar';
import ProductGrid from './ProductGrid';

/**
 * ProductPanel Component
 *
 * Left panel in POS interface showing product search and selection.
 * Combines SearchBar and ProductGrid, manages Redux state.
 *
 * Features:
 * - Loads all products on mount (limit: 100)
 * - Search functionality via SearchBar
 * - Displays search results when searching, all products otherwise
 * - Add to cart with quantity 1
 * - Loading and error states
 *
 * @component
 * @returns {JSX.Element} Product panel with search and grid
 *
 * @example
 * // Used in POSPage
 * <div style={{ display: 'flex' }}>
 *   <ProductPanel />
 *   <CartPanel />
 * </div>
 */
const ProductPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, searchResults, searchQuery, isLoading, error } = useAppSelector((state) => state.products);

  /**
   * Load all products on mount
   * Fetches first 100 active products for POS selection
   */
  useEffect(() => {
    dispatch(fetchProducts({ limit: 100 }));
  }, [dispatch]);

  /**
   * Handle Add to Cart
   * Adds product to cart with quantity 1
   */
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
