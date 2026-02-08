/**
 * @fileoverview Product Type Definitions - Product data structures
 *
 * Defines product entity, list query parameters, and paginated response types.
 * Used across product management, inventory, and POS transaction flows.
 *
 * @module types/product.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Product entity
 *
 * Complete product record from database with all fields.
 * Used in product management, inventory, and transaction flows.
 *
 * @interface Product
 * @property {string} id - UUID primary key
 * @property {string} sku - Stock Keeping Unit (unique, indexed)
 * @property {string} [barcode] - Optional barcode for scanning
 * @property {string} name - Product name (max 200 chars)
 * @property {string} [description] - Optional description
 * @property {string} [category_id] - Foreign key to categories table
 * @property {number} base_price - Selling price (decimal 10,2)
 * @property {number} [cost_price] - Purchase/cost price (for margins)
 * @property {number} tax_rate - Tax rate percentage (e.g., 8.00 for 8%)
 * @property {number} quantity_in_stock - Current inventory quantity
 * @property {number} reorder_level - Minimum stock before reorder alert
 * @property {number} reorder_quantity - Suggested reorder quantity
 * @property {string} [vendor_id] - Foreign key to vendors table
 * @property {string} [image_url] - URL to product image
 * @property {boolean} is_active - Whether product is active/available
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 *
 * @example
 * const product: Product = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   sku: "APPLE-IPHONE-15-PRO",
 *   name: "Apple iPhone 15 Pro",
 *   base_price: 999.99,
 *   tax_rate: 8.00,
 *   quantity_in_stock: 25,
 *   reorder_level: 10,
 *   reorder_quantity: 20,
 *   is_active: true,
 *   created_at: "2024-01-15T10:30:00Z",
 *   updated_at: "2024-01-15T10:30:00Z"
 * };
 */
export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  base_price: number;
  cost_price?: number;
  tax_rate: number;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  vendor_id?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product list query parameters
 *
 * Optional filters, pagination, and sorting parameters for product list endpoint.
 * All fields optional - defaults applied server-side.
 *
 * @interface ProductListQuery
 * @property {number} [page] - Page number (1-indexed, default: 1)
 * @property {number} [limit] - Items per page (default: 50, max: 100)
 * @property {string} [search] - Search term (matches name, SKU, barcode)
 * @property {string} [category_id] - Filter by category UUID
 * @property {boolean} [is_active] - Filter by active status
 * @property {'name' | 'base_price' | 'quantity_in_stock' | 'created_at'} [sort_by] - Sort field (default: name)
 * @property {'asc' | 'desc'} [sort_order] - Sort direction (default: asc)
 *
 * @example
 * const query: ProductListQuery = {
 *   page: 1,
 *   limit: 20,
 *   search: "iphone",
 *   is_active: true,
 *   sort_by: "base_price",
 *   sort_order: "desc"
 * };
 */
export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'base_price' | 'quantity_in_stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Product list paginated response
 *
 * Standardized paginated response for product list endpoint.
 * Includes products array and pagination metadata.
 *
 * @interface ProductListResponse
 * @property {Product[]} products - Array of product records
 * @property {Object} pagination - Pagination metadata
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total number of matching products
 * @property {number} pagination.total_pages - Total number of pages
 *
 * @example
 * const response: ProductListResponse = {
 *   products: [
 *     { id: "123", sku: "PROD-001", name: "Product 1", ... },
 *     { id: "456", sku: "PROD-002", name: "Product 2", ... }
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 150,
 *     total_pages: 8
 *   }
 * };
 */
export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
