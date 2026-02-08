/**
 * @fileoverview Products Redux Slice - Manages product catalog and search
 *
 * This slice handles product data for the POS system:
 * - Product search for adding items to cart (live search in POS interface)
 * - Product list fetching with filters (for inventory/product management)
 * - Search query state (for controlled input)
 * - Separate storage for full catalog (items) vs search results
 *
 * State structure:
 * - `items`: Full product list (for inventory/catalog pages)
 * - `searchResults`: Search results (for POS product search)
 * - `searchQuery`: Current search text (for controlled input binding)
 *
 * Usage pattern:
 * - POS page: Use searchProducts thunk + searchResults for adding to cart
 * - Inventory page: Use fetchProducts thunk + items for catalog management
 *
 * @module store/slices/products
 * @requires @reduxjs/toolkit - Redux state management with reducers and thunks
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Product, ProductListQuery } from '../../types/product.types';
import { productApi } from '../../services/api/product.api';

/**
 * Products state interface
 *
 * Maintains two separate product arrays:
 * - items: Full catalog (for inventory/product management)
 * - searchResults: Search matches (for POS product search)
 *
 * @interface ProductsState
 * @property {Product[]} items - Full product catalog
 * @property {Product[]} searchResults - Products matching search query
 * @property {boolean} isLoading - True during async product fetch/search
 * @property {string | null} error - Error message from failed fetch/search
 * @property {string} searchQuery - Current search text (for controlled input)
 */
export interface ProductsState {
  items: Product[];
  searchResults: Product[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

// Initial empty state
const initialState: ProductsState = {
  items: [],
  searchResults: [],
  isLoading: false,
  error: null,
  searchQuery: '',
};

/**
 * Async thunk: Search products by name, SKU, or barcode
 *
 * Performs real-time product search for POS interface. Results are limited
 * to 20 products for performance. Searches across name, SKU, and barcode fields.
 *
 * Used in POS product search to add items to cart.
 *
 * @async
 * @function searchProducts
 * @param {string} query - Search text (name, SKU, or barcode)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Product[]>} Array of matching products (max 20)
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Search for products
 * import { useAppDispatch } from '../../store/hooks';
 * import { searchProducts, setSearchQuery } from '../../store/slices/products.slice';
 *
 * const dispatch = useAppDispatch();
 *
 * const handleSearch = (query: string) => {
 *   dispatch(setSearchQuery(query)); // Update controlled input
 *   dispatch(searchProducts(query)); // Fetch results
 * };
 *
 * @see productApi.searchProducts for backend API call
 * @see Product interface in types/product.types.ts
 */
export const searchProducts = createAsyncThunk(
  'products/search',
  async (query: string, { rejectWithValue }) => {
    try {
      // Call backend search API (limit 20 results)
      const response = await productApi.searchProducts(query, 20);
      return response.products;
    } catch (error: any) {
      // Extract error message from API response
      return rejectWithValue(error.response?.data?.error?.message || 'Search failed');
    }
  }
);

/**
 * Async thunk: Fetch products with filters
 *
 * Retrieves product catalog with optional filters (category, active status, etc.).
 * Results stored in `items` array. Used for inventory and product management pages.
 *
 * @async
 * @function fetchProducts
 * @param {ProductListQuery} filters - Filter criteria (category_id, is_active, etc.)
 * @param {object} thunkAPI - Redux Toolkit thunk API
 * @returns {Promise<Product[]>} Array of products matching filters
 * @throws {string} Error message on failure (via rejectWithValue)
 *
 * @example
 * // Fetch all active products
 * dispatch(fetchProducts({ is_active: true }));
 *
 * @example
 * // Fetch products in specific category
 * dispatch(fetchProducts({ category_id: 'category-uuid', is_active: true }));
 *
 * @see productApi.getProducts for backend API call
 * @see ProductListQuery interface in types/product.types.ts
 */
export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (filters: ProductListQuery, { rejectWithValue }) => {
    try {
      // Call backend products API with filters
      const response = await productApi.getProducts(filters);
      return response.products;
    } catch (error: any) {
      // Extract error message from API response
      return rejectWithValue(error.response?.data?.error?.message || 'Fetch failed');
    }
  }
);

/**
 * Products Redux Slice
 *
 * Manages product state with 3 synchronous reducers and 2 async thunks:
 * - setSearchQuery: Update search input text
 * - clearSearchResults: Clear search results and query
 * - clearError: Clear error message
 * - searchProducts: Search products (async)
 * - fetchProducts: Fetch filtered products (async)
 *
 * @slice products
 * @state ProductsState
 */
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    /**
     * Sets search query text
     *
     * Updates the searchQuery state for controlled input binding.
     * Typically dispatched on every keystroke in search input.
     *
     * @param {ProductsState} state - Current products state
     * @param {PayloadAction<string>} action - Search query text
     *
     * @example
     * // Update search query on input change
     * <input
     *   value={searchQuery}
     *   onChange={(e) => dispatch(setSearchQuery(e.target.value))}
     * />
     */
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    /**
     * Clears search results and query
     *
     * Resets searchResults to empty array and searchQuery to empty string.
     * Used when closing search or navigating away from POS page.
     *
     * @param {ProductsState} state - Current products state
     *
     * @example
     * // Clear search when closing modal
     * dispatch(clearSearchResults());
     */
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },

    /**
     * Clears error message
     *
     * Resets error state after displaying error to user or before retrying.
     *
     * @param {ProductsState} state - Current products state
     *
     * @example
     * // Clear error before retry
     * dispatch(clearError());
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // SearchProducts: pending - set loading state
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // SearchProducts: fulfilled - store search results
      .addCase(searchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.isLoading = false;
        state.searchResults = action.payload;
        state.error = null;
      })
      // SearchProducts: rejected - set error state
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // FetchProducts: pending - set loading state
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // FetchProducts: fulfilled - store product catalog
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.isLoading = false;
        state.items = action.payload;
        state.error = null;
      })
      // FetchProducts: rejected - set error state
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, clearSearchResults, clearError } = productsSlice.actions;
export default productsSlice.reducer;
