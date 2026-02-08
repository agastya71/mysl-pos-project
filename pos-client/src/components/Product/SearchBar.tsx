/**
 * @fileoverview SearchBar Component - Debounced product search input for POS interface
 *
 * This component provides a real-time search input for products with debouncing,
 * auto-focus, and clear functionality. Searches across product name, SKU, and barcode.
 *
 * Features:
 * - Debounced search (300ms delay) to reduce API calls
 * - Auto-focus on mount for immediate typing
 * - Clear button (✕) appears when query is not empty
 * - Syncs with Redux search state
 * - Automatic fallback to full product list when search cleared
 * - Searches: product name, SKU, barcode (backend handles matching)
 *
 * Search Behavior:
 * - User types → Local state updates immediately (no delay)
 * - After 300ms of no typing → Dispatch search action
 * - Empty search → Fetches all products (limit: 100)
 * - Only active products returned (is_active = true)
 *
 * Redux Integration:
 * - Dispatches searchProducts() with query
 * - Updates products.searchQuery in Redux state
 * - Fetches products when search cleared
 * - Syncs local state with Redux state (one-way from Redux)
 *
 * Used In:
 * - ProductPanel component (POS product search)
 * - Main POS interface for cashier product lookup
 *
 * Styling:
 * - Full width input with rounded corners
 * - Gray border (2px) with white background
 * - Clear button positioned absolutely inside input (right side)
 * - Auto-focus for immediate use
 *
 * @module components/Product/SearchBar
 * @requires react - React library with hooks (useState, useEffect)
 * @requires ../../store/hooks - Redux typed hooks (useAppDispatch, useAppSelector)
 * @requires ../../store/slices/products.slice - Redux product actions
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchProducts, setSearchQuery, fetchProducts } from '../../store/slices/products.slice';

/**
 * SearchBar component props interface
 *
 * Optional props for the SearchBar component.
 * All props are optional - component works standalone with Redux.
 *
 * @interface SearchBarProps
 * @property {function} [onSearch] - Optional callback when search executes
 */
interface SearchBarProps {
  /** Optional callback fired when search is executed (after debounce) */
  onSearch?: (query: string) => void;
}

/**
 * SearchBar Component
 *
 * Debounced search input for product lookup in POS interface.
 * Provides real-time search with 300ms debounce to optimize API calls.
 *
 * Component Architecture:
 * - Local state (localQuery): Immediate UI updates (no delay)
 * - Redux state (reduxSearchQuery): Source of truth for search state
 * - Debounce effect: Delays API call by 300ms after last keystroke
 * - Sync effect: Clears local state when Redux state cleared externally
 *
 * Debounce Logic:
 * 1. User types → localQuery updates immediately
 * 2. Start 300ms timer
 * 3. User types again → Clear previous timer, start new 300ms timer
 * 4. After 300ms of no typing → Execute search
 * 5. Prevents excessive API calls during rapid typing
 *
 * Search Flow:
 * 1. User types "widget"
 * 2. localQuery = "widget" (immediate)
 * 3. Wait 300ms
 * 4. dispatch(searchProducts("widget"))
 * 5. Products filtered by backend (name/SKU/barcode match)
 * 6. Results displayed in ProductGrid
 *
 * Clear Flow:
 * 1. User clicks clear button (✕)
 * 2. localQuery = "" (immediate)
 * 3. dispatch(setSearchQuery(""))
 * 4. dispatch(fetchProducts({ limit: 100 }))
 * 5. All products displayed (up to 100)
 *
 * Redux State Sync:
 * - When reduxSearchQuery cleared externally (e.g., navigation away)
 * - Component clears localQuery to match
 * - Prevents stale search query after returning to page
 * - One-way sync: Redux → Local (not Local → Redux during typing)
 *
 * @component
 * @param {SearchBarProps} props - Component props
 * @returns {JSX.Element} Rendered search input with optional clear button
 *
 * @example
 * // Basic usage (standalone with Redux)
 * <SearchBar />
 *
 * @example
 * // With callback for analytics
 * const handleSearch = (query: string) => {
 *   console.log('User searched for:', query);
 *   analytics.track('product_search', { query });
 * };
 *
 * <SearchBar onSearch={handleSearch} />
 *
 * @example
 * // Usage in ProductPanel
 * const ProductPanel = () => {
 *   return (
 *     <div>
 *       <h2>Products</h2>
 *       <SearchBar />
 *       <ProductGrid />
 *     </div>
 *   );
 * };
 *
 * @example
 * // Search behavior demonstration
 * // User types: "w" → "wi" → "wid" → "widg" → "widget"
 * // API calls: 0 (still typing)
 * // After 300ms: API call for "widget"
 * // Result: 1 API call instead of 5
 *
 * @see ProductPanel for container component
 * @see products.slice for Redux search actions
 * @see product.api for backend search implementation
 */
const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const dispatch = useAppDispatch();
  const reduxSearchQuery = useAppSelector((state) => state.products.searchQuery);
  const [localQuery, setLocalQuery] = useState('');

  /**
   * Debounced search effect
   *
   * Executes search after 300ms of no typing.
   * Prevents excessive API calls during rapid typing.
   *
   * Effect dependencies: [localQuery, dispatch, onSearch]
   * - localQuery changes → Reset timer
   * - dispatch/onSearch stable (no re-trigger)
   *
   * Cleanup: Clears timer on unmount or before next effect
   *
   * @effect
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        // Non-empty search: Execute product search
        dispatch(setSearchQuery(localQuery));
        dispatch(searchProducts(localQuery));
        onSearch?.(localQuery);
      } else {
        // Empty search: Fetch all products (clear search)
        dispatch(setSearchQuery(''));
        dispatch(fetchProducts({ limit: 100 }));
      }
    }, 300);

    // Cleanup: Clear timer to prevent stale searches
    return () => clearTimeout(timer);
  }, [localQuery, dispatch, onSearch]);

  /**
   * Redux state sync effect
   *
   * Syncs local state with Redux when Redux state cleared externally.
   * One-way sync: Redux → Local (prevents infinite loops).
   *
   * Use case: User navigates away, search state cleared, returns to page
   * Result: Search input cleared to match Redux state
   *
   * IMPORTANT: Does NOT include localQuery in deps
   * - Would cause infinite loop (local changes → clear → trigger effect → clear)
   * - Only syncs when reduxSearchQuery explicitly cleared
   *
   * Effect dependencies: [reduxSearchQuery]
   * - reduxSearchQuery === '' → Clear local if not already cleared
   *
   * @effect
   */
  useEffect(() => {
    if (reduxSearchQuery === '' && localQuery !== '') {
      setLocalQuery('');
    }
  }, [reduxSearchQuery]);

  /**
   * Handle input change
   *
   * Updates local state immediately (no debounce).
   * Provides instant visual feedback to user.
   * Debounce effect handles delayed search dispatch.
   *
   * @function handleChange
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   * @returns {void}
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  /**
   * Handle clear button click
   *
   * Clears search query and fetches all products.
   * Immediate clear (no debounce).
   *
   * Actions:
   * 1. Clear local state (input value)
   * 2. Clear Redux search query
   * 3. Fetch all products (limit: 100)
   *
   * @function handleClear
   * @returns {void}
   */
  const handleClear = () => {
    setLocalQuery('');
    dispatch(setSearchQuery(''));
    dispatch(fetchProducts({ limit: 100 }));
  };

  return (
    <div style={styles.container}>
      {/* Search input: Auto-focused, full width, debounced */}
      <input
        type="text"
        placeholder="Search products by name, SKU, or barcode..."
        value={localQuery}
        onChange={handleChange}
        style={styles.input}
        autoComplete="off"
        autoFocus
      />

      {/* Clear button: Only shown when query not empty */}
      {localQuery && (
        <button onClick={handleClear} style={styles.clearButton}>
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Component inline styles
 *
 * Defines all styling for search bar component.
 * Inline styles ensure component works standalone without external CSS.
 *
 * @constant
 * @type {object}
 */
const styles = {
  /** Container: Relative positioning for absolute clear button */
  container: {
    position: 'relative' as const,
    marginBottom: '1rem',
  },
  /** Input: Full width with padding for clear button on right */
  input: {
    width: '100%',
    padding: '0.75rem 2.5rem 0.75rem 1rem', // Extra right padding for clear button
    fontSize: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#000000',
    boxSizing: 'border-box' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  /** Clear button: Positioned absolutely inside input (right side) */
  clearButton: {
    position: 'absolute' as const,
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#666',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
};

export default SearchBar;
