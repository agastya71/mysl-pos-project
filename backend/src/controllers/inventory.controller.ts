/**
 * @fileoverview Inventory Controller - HTTP request handlers for inventory management
 *
 * This controller handles incoming HTTP requests for inventory operations:
 * - Creating manual inventory adjustments
 * - Fetching adjustment history with filters and pagination
 * - Viewing adjustment details
 * - Product-specific adjustment history
 * - 5 inventory report endpoints (Phase 3C)
 *
 * Request validation is performed using Zod schemas before calling service layer.
 * All handlers follow Express async pattern with proper error handling via next().
 *
 * Endpoints:
 * - POST /api/v1/inventory/adjustments - Create adjustment
 * - GET /api/v1/inventory/adjustments - List adjustments (filtered, paginated)
 * - GET /api/v1/inventory/adjustments/:id - Get adjustment by ID
 * - GET /api/v1/inventory/products/:productId/history - Product history
 * - GET /api/v1/inventory/reports/low-stock - Low stock report
 * - GET /api/v1/inventory/reports/out-of-stock - Out of stock report
 * - GET /api/v1/inventory/reports/valuation - Valuation report
 * - GET /api/v1/inventory/reports/movement - Movement report
 * - GET /api/v1/inventory/reports/category-summary - Category summary
 *
 * @module controllers/inventory
 * @requires express - HTTP server framework
 * @requires zod - Schema validation library
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3B)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from '../services/inventory.service';
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { InventoryAdjustment } from '../types/inventory.types';

const inventoryService = new InventoryService();

// ========================================
// VALIDATION SCHEMAS
// ========================================

/**
 * Zod schema for creating inventory adjustment
 *
 * Validates:
 * - product_id: Must be valid UUID
 * - adjustment_type: One of 5 types (damage, theft, found, correction, initial)
 * - quantity_change: Non-zero integer (negative for reductions, positive for additions)
 * - reason: Required string, 1-500 characters
 * - notes: Optional string, max 1000 characters
 */
const createAdjustmentSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  adjustment_type: z.enum(['damage', 'theft', 'found', 'correction', 'initial']),
  quantity_change: z.number().int('Quantity change must be an integer').refine(val => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Zod schema for fetching adjustments with filters
 *
 * Validates query parameters:
 * - product_id: Optional UUID filter
 * - adjustment_type: Optional type filter
 * - start_date: Optional date range start (YYYY-MM-DD)
 * - end_date: Optional date range end (YYYY-MM-DD)
 * - page: Optional page number (coerced to int, min 1)
 * - limit: Optional page size (coerced to int, min 1, max 100)
 */
const getAdjustmentsQuerySchema = z.object({
  product_id: z.string().uuid().optional(),
  adjustment_type: z.enum(['damage', 'theft', 'found', 'correction', 'initial']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ========================================
// PHASE 3B: ADJUSTMENT HANDLERS
// ========================================

/**
 * Create a new inventory adjustment
 *
 * POST /api/v1/inventory/adjustments
 *
 * Validates request body, creates adjustment via service layer.
 * Adjustment number is auto-generated (ADJ-XXXXXX format).
 * Product quantity is automatically updated via database trigger.
 *
 * Backend validates that negative adjustments won't cause inventory to go below zero.
 *
 * @async
 * @param {Request} req - Express request with validated body and authenticated user
 * @param {Response<ApiResponse<InventoryAdjustment>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Request body
 * POST /api/v1/inventory/adjustments
 * {
 *   "product_id": "uuid",
 *   "adjustment_type": "damage",
 *   "quantity_change": -5,
 *   "reason": "Water damage",
 *   "notes": "Storm on 2026-02-08"
 * }
 *
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "adjustment_number": "ADJ-000123",
 *     "product_id": "uuid",
 *     "adjustment_type": "damage",
 *     "quantity_change": -5,
 *     "old_quantity": 100,
 *     "new_quantity": 95,
 *     "reason": "Water damage",
 *     "notes": "Storm on 2026-02-08",
 *     "adjusted_by": "user-uuid",
 *     "adjusted_at": "2026-02-08T10:30:00Z"
 *   },
 *   "message": "Adjustment ADJ-000123 created successfully"
 * }
 *
 * @throws {400} If validation fails or adjustment would cause negative inventory
 * @throws {401} If user is not authenticated
 * @throws {404} If product not found
 */
export const createAdjustment = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body with Zod schema
    const validatedData = createAdjustmentSchema.parse(req.body);

    // Get authenticated user ID from JWT middleware
    const userId = req.user!.userId;

    // Create adjustment via service layer
    const adjustment = await inventoryService.createAdjustment(userId, validatedData as any);

    // Return 201 Created with adjustment data
    res.status(201).json({
      success: true,
      data: adjustment,
      message: `Adjustment ${adjustment.adjustment_number} created successfully`,
    });
  } catch (error) {
    // Pass validation or service errors to error middleware
    next(error);
  }
};

/**
 * Get all adjustments with filters and pagination
 *
 * GET /api/v1/inventory/adjustments
 *
 * Retrieves adjustment list with optional filters:
 * - product_id: Filter by specific product
 * - adjustment_type: Filter by type (damage, theft, found, correction, initial)
 * - start_date / end_date: Date range filter
 * - page / limit: Pagination (default: page=1, limit=20)
 *
 * @async
 * @param {Request} req - Express request with query parameters
 * @param {Response<ApiResponse<PaginatedResponse<InventoryAdjustment>>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * GET /api/v1/inventory/adjustments?adjustment_type=damage&page=1&limit=20
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "data": [ /* array of adjustments */ ],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 20,
 *       "total": 150,
 *       "totalPages": 8
 *     }
 *   }
 * }
 *
 * @throws {400} If query parameters are invalid
 * @throws {401} If user is not authenticated
 */
export const getAdjustments = async (
  req: Request,
  res: Response<ApiResponse<PaginatedResponse<InventoryAdjustment>>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query parameters with Zod schema
    const validatedQuery = getAdjustmentsQuerySchema.parse(req.query);

    // Fetch adjustments from service layer
    const result = await inventoryService.getAdjustments(validatedQuery);

    // Return 200 OK with paginated results
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Pass validation or service errors to error middleware
    next(error);
  }
};

/**
 * Get adjustment by ID
 *
 * GET /api/v1/inventory/adjustments/:id
 *
 * Retrieves full adjustment details including product snapshot at time of adjustment.
 *
 * @async
 * @param {Request} req - Express request with adjustment ID in params
 * @param {Response<ApiResponse<InventoryAdjustment>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * GET /api/v1/inventory/adjustments/uuid-here
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "adjustment_number": "ADJ-000123",
 *     "product_id": "product-uuid",
 *     "adjustment_type": "damage",
 *     "quantity_change": -5,
 *     "old_quantity": 100,
 *     "new_quantity": 95,
 *     "reason": "Water damage",
 *     "adjusted_at": "2026-02-08T10:30:00Z",
 *     /* ... additional fields ... */
 *   }
 * }
 *
 * @throws {401} If user is not authenticated
 * @throws {404} If adjustment not found
 */
export const getAdjustmentById = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch adjustment by ID from service layer
    const adjustment = await inventoryService.getAdjustmentById(req.params.id);

    // Return 200 OK with adjustment data
    res.json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

/**
 * Get adjustment history for a product
 *
 * GET /api/v1/inventory/products/:productId/history
 *
 * Retrieves all adjustments for a specific product, ordered by date descending.
 * Useful for viewing complete audit trail of stock changes for a product.
 *
 * @async
 * @param {Request} req - Express request with product ID in params
 * @param {Response<ApiResponse<InventoryAdjustment[]>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * GET /api/v1/inventory/products/product-uuid/history
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     { /* adjustment 1 (most recent) */ },
 *     { /* adjustment 2 */ },
 *     { /* adjustment 3 */ }
 *   ]
 * }
 *
 * @throws {401} If user is not authenticated
 * @throws {404} If product not found
 */
export const getProductHistory = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch product adjustment history from service layer
    const history = await inventoryService.getProductInventoryHistory(req.params.productId);

    // Return 200 OK with history array
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

// ========================================
// PHASE 3C: INVENTORY REPORT HANDLERS
// ========================================

/**
 * Get low stock products report
 *
 * GET /api/v1/inventory/reports/low-stock
 *
 * Retrieves products where quantity_in_stock <= reorder_level.
 * Results sorted by quantity ascending (lowest stock first), then by name.
 *
 * @async
 * @param {Request} req - Express request
 * @param {Response<ApiResponse<any>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "sku": "PROD-001",
 *       "name": "Product Name",
 *       "quantity_in_stock": 5,
 *       "reorder_level": 10,
 *       "reorder_quantity": 50,
 *       "category_name": "Electronics",
 *       "stock_value": 125.50
 *     }
 *   ]
 * }
 *
 * @throws {401} If user is not authenticated
 */
export const getLowStockReport = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch low stock products from service layer
    const products = await inventoryService.getLowStockProducts();

    // Return 200 OK with product array
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

/**
 * Get out of stock products report
 *
 * GET /api/v1/inventory/reports/out-of-stock
 *
 * Retrieves products where quantity_in_stock = 0.
 * Results sorted by days since last sale descending (longest out of stock first).
 *
 * @async
 * @param {Request} req - Express request
 * @param {Response<ApiResponse<any>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "sku": "PROD-002",
 *       "name": "Product Name",
 *       "category_name": "Clothing",
 *       "last_sold_date": "2026-01-15",
 *       "days_out_of_stock": 24
 *     }
 *   ]
 * }
 *
 * @throws {401} If user is not authenticated
 */
export const getOutOfStockReport = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch out of stock products from service layer
    const products = await inventoryService.getOutOfStockProducts();

    // Return 200 OK with product array
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

/**
 * Get inventory valuation report
 *
 * GET /api/v1/inventory/reports/valuation
 *
 * Calculates total inventory value and category-level breakdowns.
 * - total_value: Sum of (base_price × quantity) across all active products
 * - total_items: Total number of product SKUs
 * - category_breakdown: Value and item count per category
 *
 * @async
 * @param {Request} req - Express request
 * @param {Response<ApiResponse<any>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "total_value": 150250.75,
 *     "total_items": 450,
 *     "category_breakdown": [
 *       {
 *         "category_name": "Electronics",
 *         "value": 85000.50,
 *         "percentage": 56.5
 *       }
 *     ]
 *   }
 * }
 *
 * @throws {401} If user is not authenticated
 */
export const getValuationReport = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Calculate inventory valuation from service layer
    const valuation = await inventoryService.getInventoryValuation();

    // Return 200 OK with valuation data
    res.json({
      success: true,
      data: valuation,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

/**
 * Get inventory movement report
 *
 * GET /api/v1/inventory/reports/movement
 *
 * Tracks stock changes over a date range from sales and manual adjustments.
 * Requires start_date and end_date query parameters (YYYY-MM-DD format).
 *
 * @async
 * @param {Request} req - Express request with start_date and end_date query params
 * @param {Response<ApiResponse<any>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Request
 * GET /api/v1/inventory/reports/movement?start_date=2026-01-08&end_date=2026-02-08
 *
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "product_id": "uuid",
 *       "sku": "PROD-001",
 *       "name": "Product Name",
 *       "opening_stock": 100,
 *       "sales_in_period": -25,
 *       "adjustments_in_period": -5,
 *       "closing_stock": 70,
 *       "net_change": -30
 *     }
 *   ]
 * }
 *
 * @throws {400} If start_date or end_date are missing
 * @throws {401} If user is not authenticated
 */
export const getMovementReport = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate date range from query parameters
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      res.status(400).json({
        success: false,
        error: {
          message: 'start_date and end_date are required',
          code: 'INVALID_INPUT',
        },
      });
      return;
    }

    // Fetch movement report from service layer
    const movements = await inventoryService.getInventoryMovementReport(
      start_date as string,
      end_date as string
    );

    // Return 200 OK with movement data
    res.json({
      success: true,
      data: movements,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};

/**
 * Get category summary report
 *
 * GET /api/v1/inventory/reports/category-summary
 *
 * Aggregates inventory health metrics by category:
 * - total_products, in_stock, low_stock, out_of_stock counts
 * - total_quantity and total_value per category
 *
 * @async
 * @param {Request} req - Express request
 * @param {Response<ApiResponse<any>>} res - Express response
 * @param {NextFunction} next - Express error handler
 * @returns {Promise<void>}
 *
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "category_name": "Electronics",
 *       "total_products": 50,
 *       "in_stock": 45,
 *       "low_stock": 8,
 *       "out_of_stock": 5,
 *       "total_quantity": 2500,
 *       "total_value": 125000.00
 *     }
 *   ]
 * }
 *
 * @throws {401} If user is not authenticated
 */
export const getCategorySummaryReport = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Fetch category summary from service layer
    const summary = await inventoryService.getCategorySummary();

    // Return 200 OK with summary data
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    // Pass service errors to error middleware
    next(error);
  }
};
