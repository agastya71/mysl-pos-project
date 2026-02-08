/**
 * @fileoverview Product API Service - Frontend API client for product operations
 *
 * This service provides API methods for product operations:
 * - searchProducts: Quick search for POS interface (typeahead)
 * - getProducts: List products with filters and pagination
 * - getProductById: Get complete product details by ID
 *
 * Use Cases:
 * - POS search: Real-time product search as cashier types
 * - Product management: Admin interface for product list
 * - Product details: View/edit product information
 *
 * API Endpoints:
 * - GET /api/v1/products - List products (with query params)
 * - GET /api/v1/products/:id - Get product by ID
 *
 * Note: Create, update, delete operations handled by admin interface
 * (not included in this POS-focused API service)
 *
 * @module services/api/product
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/api.types - API response types
 * @requires ../../types/product.types - Product types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import { Product, ProductListQuery, ProductListResponse } from '../../types/product.types';

/**
 * Product API Service
 *
 * Provides methods for product operations in POS interface.
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - searchProducts: Quick search for POS (active products only)
 * - getProducts: List products with full filters and pagination
 * - getProductById: Get complete product details
 *
 * Usage in Redux:
 * - Called from products.slice.ts async thunks
 * - Responses stored in Redux products state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const productApi = {
  /**
   * Quick search products for POS interface
   *
   * HTTP: GET /api/v1/products?search={query}&limit={limit}&is_active=true
   *
   * Fast product search for POS with typeahead functionality.
   * Searches across name, SKU, and barcode.
   * Returns only active products for immediate sale.
   *
   * Search behavior:
   * - Case-insensitive partial match
   * - Searches: name, SKU, barcode
   * - Filter: is_active = true (only active products)
   * - Default limit: 20 results
   * - No pagination (returns top N matches)
   *
   * Use cases:
   * - POS product search (as cashier types)
   * - Barcode scanner integration
   * - Quick product lookup during transaction
   *
   * Performance:
   * - Fast response (< 100ms typically)
   * - Limited results for quick rendering
   * - Active products only (smaller dataset)
   *
   * @async
   * @function searchProducts
   * @param {string} query - Search query (name, SKU, or barcode)
   * @param {number} [limit=20] - Maximum results to return (default: 20)
   * @returns {Promise<ProductListResponse>} Product list with pagination metadata
   * @throws {Error} If search fails (network error, server error)
   *
   * @example
   * // Search by product name
   * const results = await productApi.searchProducts('widget');
   * console.log('Found products:', results.products);
   *
   * @example
   * // Search by SKU
   * const results = await productApi.searchProducts('WDG-001');
   * console.log('Product:', results.products[0].name);
   *
   * @example
   * // Search with custom limit
   * const results = await productApi.searchProducts('blue', 5);
   * console.log('Top 5 matches:', results.products);
   *
   * @example
   * // Usage in Redux thunk (products.slice.ts)
   * export const searchProducts = createAsyncThunk(
   *   'products/search',
   *   async (query: string) => {
   *     return await productApi.searchProducts(query);
   *   }
   * );
   *
   * @see ProductListResponse type in ../../types/product.types.ts
   * @see products.slice.ts for Redux integration
   */
  searchProducts: async (query: string, limit: number = 20): Promise<ProductListResponse> => {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/products', {
      params: { search: query, limit, is_active: true },
    });
    return response.data.data!;
  },

  /**
   * List products with filters and pagination
   *
   * HTTP: GET /api/v1/products (with query parameters)
   *
   * Retrieves paginated product list with optional filtering and sorting.
   * Used for product management page and inventory reports.
   *
   * Available filters (ProductListQuery):
   * - search: Search across name, SKU, barcode
   * - category_id: Filter by specific category
   * - is_active: Filter by active status
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   * - sort_by: Field to sort by (name, base_price, quantity_in_stock, created_at)
   * - sort_order: Sort direction (asc, desc)
   *
   * Returns product list with:
   * - products: Array of product objects with full details
   * - pagination: Page metadata (page, limit, total, totalPages)
   *
   * Use cases:
   * - Product management list page
   * - Inventory reports
   * - Product catalog browsing
   *
   * @async
   * @function getProducts
   * @param {ProductListQuery} filters - Filter and pagination parameters
   * @returns {Promise<ProductListResponse>} Product list with pagination metadata
   * @throws {Error} If request fails (network error, server error)
   *
   * @example
   * // Get first page of products
   * const results = await productApi.getProducts({ page: 1, limit: 20 });
   * console.log('Total products:', results.pagination.total);
   *
   * @example
   * // Search with filters
   * const results = await productApi.getProducts({
   *   search: 'widget',
   *   category_id: 'category-uuid',
   *   is_active: true,
   *   page: 1,
   *   limit: 20,
   *   sort_by: 'name',
   *   sort_order: 'asc'
   * });
   * console.log('Filtered products:', results.products);
   *
   * @example
   * // Usage in Redux thunk (products.slice.ts)
   * export const fetchProducts = createAsyncThunk(
   *   'products/fetchAll',
   *   async (filters: ProductListQuery) => {
   *     return await productApi.getProducts(filters);
   *   }
   * );
   *
   * @see ProductListQuery type in ../../types/product.types.ts
   * @see ProductListResponse type in ../../types/product.types.ts
   * @see products.slice.ts for Redux integration
   */
  getProducts: async (filters: ProductListQuery): Promise<ProductListResponse> => {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/products', {
      params: filters,
    });
    return response.data.data!;
  },

  /**
   * Get product details by ID
   *
   * HTTP: GET /api/v1/products/:id
   *
   * Retrieves complete product details including all fields and category info.
   * Used for product detail view and edit forms.
   *
   * Returns full product record:
   * - id, sku, barcode, name, description
   * - category_id, category_name
   * - base_price, cost_price, tax_rate
   * - quantity_in_stock, reorder_level, reorder_quantity
   * - vendor_id, image_url
   * - is_active, created_at, updated_at
   *
   * Use cases:
   * - Product detail view
   * - Product edit form (pre-fill data)
   * - Transaction history (product info)
   *
   * @async
   * @function getProductById
   * @param {string} id - Product UUID
   * @returns {Promise<Product>} Complete product details
   * @throws {Error} If product not found (404) or request fails
   *
   * @example
   * // Get product details
   * const product = await productApi.getProductById('product-uuid');
   * console.log('Product:', product.name);
   * console.log('Price:', product.base_price);
   * console.log('Stock:', product.quantity_in_stock);
   *
   * @example
   * // Usage in Redux thunk (products.slice.ts)
   * export const fetchProductById = createAsyncThunk(
   *   'products/fetchById',
   *   async (id: string) => {
   *     return await productApi.getProductById(id);
   *   }
   * );
   *
   * @see Product type in ../../types/product.types.ts
   * @see products.slice.ts for Redux integration
   */
  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  },
};
