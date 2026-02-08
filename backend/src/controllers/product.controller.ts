/**
 * @fileoverview Product Controller - HTTP request handlers for product management
 *
 * This controller handles all product-related API endpoints:
 * - POST /api/v1/products - Create new product
 * - GET /api/v1/products - List products with pagination and filters
 * - GET /api/v1/products/:id - Get product details by ID
 * - GET /api/v1/products/search - Quick search for POS interface
 * - PUT /api/v1/products/:id - Update product (partial updates)
 * - DELETE /api/v1/products/:id - Soft delete product
 * - GET /api/v1/products/categories - Get all categories (for dropdown)
 *
 * Features:
 * - Full CRUD operations with soft delete (is_active flag)
 * - Inventory tracking (quantity_in_stock, reorder_level, reorder_quantity)
 * - Category assignment (links to categories table)
 * - Pricing (base_price, cost_price, tax_rate)
 * - Product identification (SKU, barcode, name)
 * - Search functionality (by name, SKU, barcode)
 * - Pagination and filtering for product list
 * - Vendor tracking (optional vendor_id foreign key)
 *
 * Inventory Management:
 * - quantity_in_stock: Current stock level (updated via adjustments and transactions)
 * - reorder_level: Threshold for low stock alert
 * - reorder_quantity: Suggested quantity to order when low
 * - Inventory automatically deducted on transactions (via trigger)
 * - Manual adjustments tracked in inventory_adjustments table
 *
 * Pricing Structure:
 * - base_price: Selling price (required, must be ≥ 0)
 * - cost_price: Purchase cost (optional, for profit calculation)
 * - tax_rate: Tax percentage (0-100, default: null = use terminal default)
 * - All prices stored as NUMERIC(10,2) for accuracy
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have appropriate role (manager for create/update/delete, cashier for read)
 *
 * @module controllers/product
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/product.service - Product business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1A)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { ApiResponse } from '../types/api.types';
import {
  Product,
  ProductListResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ProductListQuery,
  Category,
} from '../types/product.types';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

/**
 * Zod validation schema for product creation
 *
 * Validates request body for POST /api/v1/products.
 * Ensures product has required fields and validates optional inventory/pricing fields.
 *
 * Required fields:
 * - sku: Stock Keeping Unit (1-100 characters, must be unique)
 * - name: Product name (1-255 characters)
 * - base_price: Selling price (number ≥ 0)
 *
 * Optional fields:
 * - barcode: Barcode for scanning (max 100 characters, should be unique)
 * - description: Product description (text)
 * - category_id: UUID of category (must exist in categories table)
 * - cost_price: Purchase cost (number ≥ 0, for profit margin calculation)
 * - tax_rate: Tax percentage (0-100, null = use terminal default)
 * - quantity_in_stock: Initial stock level (integer ≥ 0, default: 0)
 * - reorder_level: Low stock threshold (integer ≥ 0)
 * - reorder_quantity: Suggested reorder amount (integer ≥ 0)
 * - vendor_id: UUID of vendor/supplier (must exist in vendors table)
 * - image_url: Product image URL (must be valid URL)
 *
 * Validation notes:
 * - SKU must be unique across all products
 * - Barcode should be unique if provided
 * - Category must exist and be active if provided
 * - All prices are non-negative
 * - Tax rate is percentage (10 = 10%, not 0.10)
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Minimal product
 * {
 *   sku: "WDG-001",
 *   name: "Blue Widget",
 *   base_price: 19.99
 * }
 *
 * @example
 * // Complete product with inventory
 * {
 *   sku: "WDG-002",
 *   barcode: "123456789012",
 *   name: "Red Widget",
 *   description: "Premium quality widget in red",
 *   category_id: "category-uuid",
 *   base_price: 29.99,
 *   cost_price: 15.00,
 *   tax_rate: 10,
 *   quantity_in_stock: 50,
 *   reorder_level: 10,
 *   reorder_quantity: 20,
 *   vendor_id: "vendor-uuid",
 *   image_url: "https://example.com/images/red-widget.jpg"
 * }
 */
const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  base_price: z.number().min(0, 'Base price must be positive'),
  cost_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  quantity_in_stock: z.number().int().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  reorder_quantity: z.number().int().min(0).optional(),
  vendor_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
});

/**
 * Zod validation schema for product updates
 *
 * Validates request body for PUT /api/v1/products/:id.
 * All fields are optional (partial updates supported).
 *
 * Updatable fields:
 * - sku, name, description: Product identification
 * - barcode: Barcode for scanning
 * - category_id: Category assignment
 * - base_price, cost_price, tax_rate: Pricing and tax
 * - quantity_in_stock: Current stock (prefer using inventory adjustments)
 * - reorder_level, reorder_quantity: Reorder thresholds
 * - vendor_id: Supplier assignment
 * - is_active: Active status (boolean) - use for soft delete/restore
 * - image_url: Product image URL
 *
 * Validation notes:
 * - SKU must remain unique if changed
 * - Barcode must remain unique if changed
 * - Updating quantity_in_stock directly bypasses audit trail (prefer inventory adjustments)
 * - is_active = false soft deletes product (hides from POS, preserves transaction history)
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Update price and stock
 * {
 *   base_price: 24.99,
 *   quantity_in_stock: 75
 * }
 *
 * @example
 * // Change category and update reorder settings
 * {
 *   category_id: "new-category-uuid",
 *   reorder_level: 15,
 *   reorder_quantity: 30
 * }
 *
 * @example
 * // Soft delete product
 * {
 *   is_active: false
 * }
 */
const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  base_price: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  quantity_in_stock: z.number().int().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  reorder_quantity: z.number().int().min(0).optional(),
  vendor_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().optional(),
});

/**
 * Zod validation schema for product list query parameters
 *
 * Validates query parameters for GET /api/v1/products.
 * All parameters are optional (defaults applied in service layer).
 *
 * Available filters:
 * - search: Search across name, SKU, barcode (case-insensitive partial match)
 * - category_id: Filter by specific category (UUID)
 * - is_active: Filter by active status (true/false string)
 *
 * Pagination:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Sorting:
 * - sort_by: Field to sort by (name, base_price, quantity_in_stock, created_at)
 * - sort_order: Sort direction (asc, desc) - default: asc
 *
 * String transformations:
 * - page and limit: String → Number
 * - is_active: 'true'/'false' string → boolean
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Search active products by name
 * GET /api/v1/products?search=widget&is_active=true&page=1&limit=20
 *
 * @example
 * // Filter by category and sort by price
 * GET /api/v1/products?category_id=category-uuid&sort_by=base_price&sort_order=asc
 */
const listProductsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => (val ? val === 'true' : undefined)),
  sort_by: z.enum(['name', 'base_price', 'quantity_in_stock', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

/**
 * Product Controller Class
 *
 * Handles HTTP requests for product management with 7 endpoints:
 * - createProduct: Create new product
 * - getProducts: List products with filters and pagination
 * - getProductById: Retrieve product details by ID
 * - searchProducts: Quick search for POS interface
 * - updateProduct: Update product with partial field updates
 * - deleteProduct: Soft delete product (set is_active = false)
 * - getCategories: Get all categories for dropdown
 *
 * All methods are async and throw AppError on validation/business logic failures.
 * Errors are caught by global error middleware.
 *
 * @class ProductController
 */
export class ProductController {
  private productService: ProductService;

  /**
   * Initialize ProductController with ProductService instance
   *
   * @constructor
   */
  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Create new product
   *
   * HTTP: POST /api/v1/products
   *
   * Creates new product with all inventory, pricing, and category information.
   * SKU and barcode must be unique across all products.
   *
   * Product creation flow:
   * 1. Validate request body (SKU, name, base_price required)
   * 2. Check SKU uniqueness (throw 409 if duplicate)
   * 3. Check barcode uniqueness if provided (throw 409 if duplicate)
   * 4. Validate category exists if provided (throw 404 if not found)
   * 5. Insert product record into database
   * 6. Return created product with all fields
   *
   * Initial inventory:
   * - quantity_in_stock defaults to 0 if not provided
   * - Use inventory adjustments for subsequent stock changes
   * - Reorder thresholds optional (for low stock alerts)
   *
   * @async
   * @param {Request<{}, {}, CreateProductRequest>} req - Express request with product data in body
   * @param {Response<ApiResponse<Product>>} res - Express response with created product
   * @returns {Promise<void>} Sends 201 Created with product details
   * @throws {AppError} 400 if validation fails (missing required fields, negative prices, invalid UUID)
   * @throws {AppError} 404 if category or vendor not found
   * @throws {AppError} 409 if SKU or barcode already exists
   *
   * @example
   * // Request
   * POST /api/v1/products
   * {
   *   sku: "WDG-001",
   *   barcode: "123456789012",
   *   name: "Blue Widget",
   *   description: "Premium quality widget",
   *   category_id: "category-uuid",
   *   base_price: 19.99,
   *   cost_price: 10.00,
   *   tax_rate: 10,
   *   quantity_in_stock: 50,
   *   reorder_level: 10,
   *   reorder_quantity: 20
   * }
   *
   * @example
   * // Response (201 Created)
   * {
   *   success: true,
   *   data: {
   *     id: "product-uuid",
   *     sku: "WDG-001",
   *     barcode: "123456789012",
   *     name: "Blue Widget",
   *     description: "Premium quality widget",
   *     category_id: "category-uuid",
   *     base_price: "19.99",
   *     cost_price: "10.00",
   *     tax_rate: "10.00",
   *     quantity_in_stock: 50,
   *     reorder_level: 10,
   *     reorder_quantity: 20,
   *     is_active: true,
   *     created_at: "2026-02-08T10:30:00Z",
   *     updated_at: "2026-02-08T10:30:00Z"
   *   }
   * }
   *
   * @see ProductService.createProduct for implementation
   */
  async createProduct(
    req: Request<{}, {}, CreateProductRequest>,
    res: Response<ApiResponse<Product>>
  ) {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const product = await this.productService.createProduct(validation.data as any);

    res.status(201).json({
      success: true,
      data: product,
    });
  }

  /**
   * List products with filters and pagination
   *
   * HTTP: GET /api/v1/products
   *
   * Retrieves paginated product list with optional filtering and sorting.
   * Used for product management page and inventory reports.
   *
   * Available filters:
   * - search: Searches across name, SKU, barcode (case-insensitive ILIKE)
   * - category_id: Filter by specific category
   * - is_active: Filter by active status (true/false)
   *
   * Sorting options:
   * - name: Alphabetical order
   * - base_price: Price order
   * - quantity_in_stock: Stock level order
   * - created_at: Chronological order
   *
   * Returns product summary with category name:
   * - id, sku, barcode, name, description
   * - category_id, category_name (from JOIN)
   * - base_price, cost_price, tax_rate
   * - quantity_in_stock, reorder_level, reorder_quantity
   * - is_active, created_at, updated_at
   *
   * @async
   * @param {Request} req - Express request with query parameters
   * @param {Response<ApiResponse<ProductListResponse>>} res - Express response with product list and pagination
   * @returns {Promise<void>} Sends 200 OK with product list and pagination metadata
   * @throws {AppError} 400 if query parameters invalid (non-numeric page/limit, invalid enum values)
   *
   * @example
   * // Request with search and filters
   * GET /api/v1/products?search=widget&category_id=category-uuid&is_active=true&page=1&limit=20&sort_by=name&sort_order=asc
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     products: [
   *       {
   *         id: "product-uuid",
   *         sku: "WDG-001",
   *         name: "Blue Widget",
   *         category_name: "Widgets",
   *         base_price: "19.99",
   *         quantity_in_stock: 50,
   *         is_active: true
   *       }
   *     ],
   *     pagination: {
   *       page: 1,
   *       limit: 20,
   *       total: 156,
   *       totalPages: 8
   *     }
   *   }
   * }
   *
   * @see ProductService.getProducts for implementation with SQL query building
   */
  async getProducts(req: Request, res: Response<ApiResponse<ProductListResponse>>) {
    const validation = listProductsSchema.safeParse(req.query);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', validation.error.errors);
    }

    const result = await this.productService.getProducts(validation.data as ProductListQuery);

    res.json({
      success: true,
      data: result,
    });
  }

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
   * - category_id, category_name (from JOIN with categories)
   * - base_price, cost_price, tax_rate
   * - quantity_in_stock, reorder_level, reorder_quantity
   * - vendor_id, image_url
   * - is_active, created_at, updated_at
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with product ID in params
   * @param {Response<ApiResponse<Product>>} res - Express response with product details
   * @returns {Promise<void>} Sends 200 OK with product details
   * @throws {AppError} 404 if product not found
   *
   * @example
   * // Request
   * GET /api/v1/products/product-uuid
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     id: "product-uuid",
   *     sku: "WDG-001",
   *     barcode: "123456789012",
   *     name: "Blue Widget",
   *     description: "Premium quality widget",
   *     category_id: "category-uuid",
   *     category_name: "Widgets",
   *     base_price: "19.99",
   *     cost_price: "10.00",
   *     tax_rate: "10.00",
   *     quantity_in_stock: 50,
   *     reorder_level: 10,
   *     reorder_quantity: 20,
   *     vendor_id: "vendor-uuid",
   *     image_url: "https://example.com/widget.jpg",
   *     is_active: true,
   *     created_at: "2026-02-01T10:00:00Z",
   *     updated_at: "2026-02-08T10:00:00Z"
   *   }
   * }
   *
   * @see ProductService.getProductById for implementation
   */
  async getProductById(req: Request<{ id: string }>, res: Response<ApiResponse<Product>>) {
    const product = await this.productService.getProductById(req.params.id);

    res.json({
      success: true,
      data: product,
    });
  }

  /**
   * Quick search products for POS interface
   *
   * HTTP: GET /api/v1/products/search
   *
   * Fast product search for POS interface with typeahead functionality.
   * Searches across name, SKU, and barcode with partial matching.
   *
   * Search behavior:
   * - Case-insensitive partial match (ILIKE)
   * - Searches name, SKU, barcode fields
   * - Returns only active products (is_active = true)
   * - Results sorted by relevance (exact matches first)
   * - Limited to configurable max results (default: 10)
   *
   * Use cases:
   * - POS product search (as cashier types)
   * - Barcode scanner integration
   * - Quick product lookup during transaction
   *
   * Returns minimal product info for POS:
   * - id, sku, name, base_price, tax_rate, quantity_in_stock
   * - Omits description, cost_price, vendor info for performance
   *
   * @async
   * @param {Request} req - Express request with search query in query params
   * @param {Response<ApiResponse<Product[]>>} res - Express response with search results
   * @returns {Promise<void>} Sends 200 OK with search results
   * @throws {AppError} 400 if search query (q) missing
   *
   * @example
   * // Request - search by name
   * GET /api/v1/products/search?q=widget&limit=5
   *
   * @example
   * // Request - search by SKU
   * GET /api/v1/products/search?q=WDG-001
   *
   * @example
   * // Request - search by barcode
   * GET /api/v1/products/search?q=123456789012
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: "product-uuid-1",
   *       sku: "WDG-001",
   *       name: "Blue Widget",
   *       base_price: "19.99",
   *       tax_rate: "10.00",
   *       quantity_in_stock: 50
   *     },
   *     {
   *       id: "product-uuid-2",
   *       sku: "WDG-002",
   *       name: "Red Widget",
   *       base_price: "24.99",
   *       tax_rate: "10.00",
   *       quantity_in_stock: 30
   *     }
   *   ]
   * }
   *
   * @see ProductService.searchProducts for implementation with ILIKE query
   */
  async searchProducts(req: Request, res: Response<ApiResponse<Product[]>>) {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Search query (q) is required');
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const products = await this.productService.searchProducts(q, limitNum);

    res.json({
      success: true,
      data: products,
    });
  }

  /**
   * Update product
   *
   * HTTP: PUT /api/v1/products/:id
   *
   * Updates product with partial field updates. Only send fields you want to change.
   * Can update pricing, inventory levels, category, or active status.
   *
   * Updatable fields:
   * - sku, name, barcode, description: Product identification
   * - category_id: Category assignment
   * - base_price, cost_price, tax_rate: Pricing
   * - quantity_in_stock: Direct stock update (prefer inventory adjustments)
   * - reorder_level, reorder_quantity: Reorder thresholds
   * - vendor_id: Supplier assignment
   * - is_active: Active status (soft delete/restore)
   * - image_url: Product image
   *
   * Inventory note:
   * - Updating quantity_in_stock directly bypasses audit trail
   * - Prefer using inventory adjustments (POST /api/v1/inventory/adjustments)
   * - Adjustments create audit trail with reason and date
   *
   * Partial update logic:
   * - Only provided fields are updated
   * - Omitted fields remain unchanged
   * - SET clause built dynamically
   *
   * @async
   * @param {Request<{ id: string }, {}, UpdateProductRequest>} req - Express request with product ID in params and update data in body
   * @param {Response<ApiResponse<Product>>} res - Express response with updated product
   * @returns {Promise<void>} Sends 200 OK with updated product details
   * @throws {AppError} 400 if validation fails (negative prices, invalid UUID, field too long)
   * @throws {AppError} 404 if product, category, or vendor not found
   * @throws {AppError} 409 if SKU or barcode already exists (unique constraint)
   *
   * @example
   * // Request - update price
   * PUT /api/v1/products/product-uuid
   * {
   *   base_price: 24.99
   * }
   *
   * @example
   * // Request - change category and update reorder settings
   * PUT /api/v1/products/product-uuid
   * {
   *   category_id: "new-category-uuid",
   *   reorder_level: 15,
   *   reorder_quantity: 30
   * }
   *
   * @example
   * // Request - soft delete product
   * PUT /api/v1/products/product-uuid
   * {
   *   is_active: false
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     id: "product-uuid",
   *     sku: "WDG-001",
   *     name: "Blue Widget",
   *     base_price: "24.99",
   *     is_active: true,
   *     updated_at: "2026-02-08T11:00:00Z"
   *   }
   * }
   *
   * @see ProductService.updateProduct for implementation
   */
  async updateProduct(
    req: Request<{ id: string }, {}, UpdateProductRequest>,
    res: Response<ApiResponse<Product>>
  ) {
    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const product = await this.productService.updateProduct(req.params.id, validation.data);

    res.json({
      success: true,
      data: product,
    });
  }

  /**
   * Delete product (soft delete)
   *
   * HTTP: DELETE /api/v1/products/:id
   *
   * Soft deletes product by setting is_active = false.
   * Product record remains in database but hidden from POS and product lists.
   *
   * Soft delete benefits:
   * - Preserves transaction history (transaction_items.product_id remains valid)
   * - Maintains referential integrity
   * - Allows product restoration (via PUT with is_active = true)
   * - Audit trail preserved (created_at, updated_at)
   *
   * Effects:
   * - Product hidden from POS search
   * - Product hidden from product list (when is_active filter = true)
   * - Historical transactions still show product with snapshot
   * - Inventory adjustments history preserved
   * - Product can be restored via PUT /api/v1/products/:id with is_active = true
   *
   * Hard delete (permanent removal) is not supported to maintain data integrity.
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with product ID in params
   * @param {Response<ApiResponse>} res - Express response with success message
   * @returns {Promise<void>} Sends 200 OK with success message
   * @throws {AppError} 404 if product not found
   *
   * @example
   * // Request
   * DELETE /api/v1/products/product-uuid
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     message: "Product deactivated successfully"
   *   }
   * }
   *
   * @see ProductService.deleteProduct for implementation
   */
  async deleteProduct(req: Request<{ id: string }>, res: Response<ApiResponse>) {
    await this.productService.deleteProduct(req.params.id);

    res.json({
      success: true,
      data: { message: 'Product deactivated successfully' },
    });
  }

  /**
   * Get all categories for dropdown
   *
   * HTTP: GET /api/v1/products/categories
   *
   * Retrieves all active categories for product category selector dropdown.
   * Returns flat list (not tree structure) for simple dropdown usage.
   *
   * Returns category summary:
   * - id, name (minimal fields for dropdown)
   * - Only active categories (is_active = true)
   * - Sorted alphabetically by name
   *
   * Use cases:
   * - Product create/edit form category dropdown
   * - Product filter category selector
   * - Simple category list without tree structure
   *
   * Note: For full category tree with children, use GET /api/v1/categories instead.
   *
   * @async
   * @param {Request} req - Express request (no parameters)
   * @param {Response<ApiResponse<Category[]>>} res - Express response with category list
   * @returns {Promise<void>} Sends 200 OK with category list
   *
   * @example
   * // Request
   * GET /api/v1/products/categories
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: "category-uuid-1",
   *       name: "Electronics"
   *     },
   *     {
   *       id: "category-uuid-2",
   *       name: "Widgets"
   *     }
   *   ]
   * }
   *
   * @see ProductService.getCategories for implementation
   */
  async getCategories(req: Request, res: Response<ApiResponse<Category[]>>) {
    const categories = await this.productService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  }
}
