/**
 * @fileoverview Inventory Service - Manages inventory adjustments and reporting
 *
 * This service provides comprehensive inventory management capabilities including:
 * - Manual inventory adjustments (damage, theft, found, correction, initial)
 * - Inventory reporting (low stock, out of stock, valuation, movement, category summary)
 * - Audit trail tracking for all inventory changes
 * - Negative inventory prevention
 *
 * All adjustment operations are transactional and automatically update product quantities
 * via database triggers. All report methods use optimized SQL queries with appropriate
 * joins and aggregations for performance.
 *
 * @module services/inventory
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-06 (Phase 3B)
 * @updated 2026-02-08 (Phase 3C - Added report methods)
 */

import { pool } from '../config/database';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  AdjustmentType,
  LowStockProduct,
  OutOfStockProduct,
  InventoryValuation,
  CategoryValuation,
  MovementReportItem,
  CategorySummary,
} from '../types/inventory.types';
import { AppError } from '../middleware/error.middleware';
import { PaginatedResponse } from '../types/api.types';

/**
 * InventoryService - Handles all inventory-related business logic
 *
 * This class provides methods for managing inventory adjustments and generating
 * various inventory reports. All database operations use parameterized queries
 * to prevent SQL injection.
 *
 * @class InventoryService
 */
export class InventoryService {
  /**
   * Creates a new inventory adjustment and updates product quantity
   *
   * This method performs the following operations in a database transaction:
   * 1. Validates the adjustment request
   * 2. Retrieves current product quantity
   * 3. Calculates new quantity and validates it's not negative
   * 4. Inserts adjustment record
   * 5. Database trigger automatically updates product.quantity_in_stock
   *
   * The adjustment is atomic - either all operations succeed or all are rolled back.
   * Negative inventory is prevented by validating the new quantity before insertion.
   *
   * @async
   * @param {string} userId - ID of the user creating the adjustment
   * @param {CreateAdjustmentRequest} data - Adjustment details
   * @param {string} data.product_id - UUID of the product being adjusted
   * @param {AdjustmentType} data.adjustment_type - Type: damage, theft, found, correction, initial
   * @param {number} data.quantity_change - Change in quantity (positive or negative)
   * @param {string} data.reason - Required explanation for the adjustment
   * @param {string} [data.notes] - Optional additional notes
   * @returns {Promise<InventoryAdjustment>} The created adjustment record with auto-generated fields
   * @throws {AppError} 400 - If validation fails or adjustment would cause negative inventory
   * @throws {AppError} 404 - If product is not found
   *
   * @example
   * // Add 50 units found during stock count
   * const adjustment = await inventoryService.createAdjustment(
   *   'user-uuid',
   *   {
   *     product_id: 'product-uuid',
   *     adjustment_type: 'found',
   *     quantity_change: 50,
   *     reason: 'Found during monthly stock count',
   *     notes: 'Located in back storage room'
   *   }
   * );
   *
   * @example
   * // Remove 3 units due to damage
   * const adjustment = await inventoryService.createAdjustment(
   *   'user-uuid',
   *   {
   *     product_id: 'product-uuid',
   *     adjustment_type: 'damage',
   *     quantity_change: -3,
   *     reason: 'Water damage from roof leak'
   *   }
   * );
   */
  async createAdjustment(
    userId: string,
    data: CreateAdjustmentRequest
  ): Promise<InventoryAdjustment> {
    // Validate input
    if (!data.product_id || !data.adjustment_type || !data.reason) {
      throw new AppError(400, 'INVALID_INPUT', 'Product ID, adjustment type, and reason are required');
    }

    if (data.reason.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Reason cannot be empty');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current product quantity to calculate new quantity
      const productResult = await client.query(
        'SELECT id, quantity_in_stock FROM products WHERE id = $1',
        [data.product_id]
      );

      if (productResult.rowCount === 0) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      }

      const currentQuantity = productResult.rows[0].quantity_in_stock;
      const newQuantity = currentQuantity + data.quantity_change;

      // Prevent negative inventory - critical business rule
      if (newQuantity < 0) {
        throw new AppError(
          400,
          'NEGATIVE_INVENTORY',
          `Adjustment would result in negative inventory. Current: ${currentQuantity}, Change: ${data.quantity_change}`
        );
      }

      // Insert adjustment record
      // Database trigger 'apply_adjustment_trigger' will automatically
      // update products.quantity_in_stock to new_quantity
      const adjustmentResult = await client.query(
        `INSERT INTO inventory_adjustments
         (product_id, adjustment_type, quantity_change, old_quantity, new_quantity, reason, notes, adjusted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.product_id,
          data.adjustment_type,
          data.quantity_change,
          currentQuantity,
          newQuantity,
          data.reason,
          data.notes || null,
          userId,
        ]
      );

      await client.query('COMMIT');

      return adjustmentResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a single inventory adjustment by ID with related data
   *
   * Returns the adjustment record along with product name/SKU and adjuster username
   * via LEFT JOINs. This provides complete context for displaying adjustment details.
   *
   * @async
   * @param {string} id - UUID of the adjustment to retrieve
   * @returns {Promise<InventoryAdjustment>} Adjustment with product and user details
   * @throws {AppError} 404 - If adjustment is not found
   *
   * @example
   * const adjustment = await inventoryService.getAdjustmentById('adjustment-uuid');
   * console.log(adjustment.product_name); // "Wireless Keyboard"
   * console.log(adjustment.adjuster_name); // "admin"
   */
  async getAdjustmentById(id: string): Promise<InventoryAdjustment> {
    const result = await pool.query(
      `SELECT
        ia.*,
        p.name as product_name,
        p.sku as product_sku,
        u.username as adjuster_name
       FROM inventory_adjustments ia
       LEFT JOIN products p ON ia.product_id = p.id
       LEFT JOIN users u ON ia.adjusted_by = u.id
       WHERE ia.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'ADJUSTMENT_NOT_FOUND', 'Adjustment not found');
    }

    return result.rows[0];
  }

  /**
   * Retrieves paginated list of inventory adjustments with optional filters
   *
   * Supports filtering by:
   * - Product ID (specific product)
   * - Adjustment type (damage, theft, found, correction, initial)
   * - Date range (start_date and/or end_date)
   *
   * Results are sorted by adjustment_date DESC (most recent first) and include
   * product name/SKU and adjuster username for display purposes.
   *
   * @async
   * @param {GetAdjustmentsQuery} query - Filter and pagination parameters
   * @param {number} [query.page=1] - Page number (1-indexed)
   * @param {number} [query.limit=20] - Items per page
   * @param {string} [query.product_id] - Filter by specific product UUID
   * @param {AdjustmentType} [query.adjustment_type] - Filter by adjustment type
   * @param {string} [query.start_date] - Filter adjustments on or after this date (YYYY-MM-DD)
   * @param {string} [query.end_date] - Filter adjustments on or before this date (YYYY-MM-DD)
   * @returns {Promise<PaginatedResponse<InventoryAdjustment>>} Paginated adjustments with metadata
   *
   * @example
   * // Get first page of all adjustments
   * const result = await inventoryService.getAdjustments({ page: 1, limit: 20 });
   *
   * @example
   * // Get damage adjustments for a specific product in January 2026
   * const result = await inventoryService.getAdjustments({
   *   product_id: 'product-uuid',
   *   adjustment_type: 'damage',
   *   start_date: '2026-01-01',
   *   end_date: '2026-01-31'
   * });
   */
  async getAdjustments(query: GetAdjustmentsQuery): Promise<PaginatedResponse<InventoryAdjustment>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause based on provided filters
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (query.product_id) {
      whereConditions.push(`ia.product_id = $${paramIndex++}`);
      queryParams.push(query.product_id);
    }

    if (query.adjustment_type) {
      whereConditions.push(`ia.adjustment_type = $${paramIndex++}`);
      queryParams.push(query.adjustment_type);
    }

    if (query.start_date) {
      whereConditions.push(`ia.adjustment_date >= $${paramIndex++}`);
      queryParams.push(query.start_date);
    }

    if (query.end_date) {
      whereConditions.push(`ia.adjustment_date <= $${paramIndex++}`);
      queryParams.push(query.end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_adjustments ia ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated adjustments with related data
    queryParams.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT
        ia.*,
        p.name as product_name,
        p.sku as product_sku,
        u.username as adjuster_name
       FROM inventory_adjustments ia
       LEFT JOIN products p ON ia.product_id = p.id
       LEFT JOIN users u ON ia.adjusted_by = u.id
       ${whereClause}
       ORDER BY ia.adjustment_date DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      queryParams
    );

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves complete adjustment history for a specific product
   *
   * Returns all adjustments for the product sorted by date (most recent first).
   * Includes adjuster username for audit trail purposes.
   *
   * @async
   * @param {string} productId - UUID of the product
   * @returns {Promise<InventoryAdjustment[]>} Array of all adjustments for the product
   *
   * @example
   * const history = await inventoryService.getProductInventoryHistory('product-uuid');
   * history.forEach(adj => {
   *   console.log(`${adj.adjustment_date}: ${adj.quantity_change} (${adj.adjustment_type})`);
   * });
   */
  async getProductInventoryHistory(productId: string): Promise<InventoryAdjustment[]> {
    const result = await pool.query(
      `SELECT
        ia.*,
        u.username as adjuster_name
       FROM inventory_adjustments ia
       LEFT JOIN users u ON ia.adjusted_by = u.id
       WHERE ia.product_id = $1
       ORDER BY ia.adjustment_date DESC`,
      [productId]
    );

    return result.rows;
  }

  // ========================================
  // PHASE 3C: INVENTORY REPORTS
  // ========================================

  /**
   * Generates low stock report - products at or below reorder level
   *
   * Returns all active products where quantity_in_stock <= reorder_level.
   * This report identifies products that need reordering from suppliers.
   *
   * The query:
   * - Includes category name via LEFT JOIN (products may not have categories)
   * - Calculates stock value as (base_price * quantity_in_stock)
   * - Filters only active products
   * - Sorts by quantity ASC (lowest stock first), then alphabetically
   *
   * Stock value is calculated in the query and converted from string to float
   * to ensure proper numeric handling in the application.
   *
   * @async
   * @returns {Promise<LowStockProduct[]>} Array of products needing reorder
   * @throws {Error} If database query fails
   *
   * @example
   * const lowStock = await inventoryService.getLowStockProducts();
   * // Returns: [
   * //   {
   * //     id: "uuid",
   * //     sku: "KEYBOARD-001",
   * //     name: "Wireless Keyboard",
   * //     quantity_in_stock: 5,
   * //     reorder_level: 10,
   * //     reorder_quantity: 50,
   * //     category_name: "Electronics",
   * //     stock_value: 125.50
   * //   }
   * // ]
   *
   * @see LowStockProduct interface in types/inventory.types.ts
   * @see Low Stock Report component in pos-client/src/components/Inventory/LowStockReport.tsx
   */
  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const result = await pool.query(
      `SELECT
        p.id,
        p.sku,
        p.name,
        p.quantity_in_stock,
        p.reorder_level,
        p.reorder_quantity,
        c.name as category_name,
        (p.base_price * p.quantity_in_stock) as stock_value
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.quantity_in_stock <= p.reorder_level
         AND p.is_active = true
       ORDER BY p.quantity_in_stock ASC, p.name ASC`
    );

    // Parse stock_value from string to float (PostgreSQL returns numeric as string)
    return result.rows.map(row => ({
      ...row,
      stock_value: parseFloat(row.stock_value) || 0,
    }));
  }

  /**
   * Generates out of stock report - products with zero quantity
   *
   * Returns all active products with quantity_in_stock = 0. This is a critical
   * report for identifying products that are completely unavailable for sale.
   *
   * The query:
   * - Includes category name via LEFT JOIN
   * - Includes last_sale_date via LEFT JOIN to transactions/transaction_items
   * - Only considers completed transactions for last sale date
   * - Groups by product fields to aggregate MAX(created_at) for last sale
   * - Filters only active products with zero quantity
   * - Sorts alphabetically by product name
   *
   * Last sale date helps prioritize reordering - products sold recently should
   * be reordered first.
   *
   * @async
   * @returns {Promise<OutOfStockProduct[]>} Array of products completely out of stock
   * @throws {Error} If database query fails
   *
   * @example
   * const outOfStock = await inventoryService.getOutOfStockProducts();
   * // Returns: [
   * //   {
   * //     id: "uuid",
   * //     sku: "MOUSE-002",
   * //     name: "Wireless Mouse",
   * //     reorder_quantity: 100,
   * //     category_name: "Electronics",
   * //     last_sale_date: "2026-02-05T14:30:00Z"
   * //   }
   * // ]
   *
   * @see OutOfStockProduct interface in types/inventory.types.ts
   * @see Out of Stock Report component in pos-client/src/components/Inventory/OutOfStockReport.tsx
   */
  async getOutOfStockProducts(): Promise<OutOfStockProduct[]> {
    const result = await pool.query(
      `SELECT
        p.id,
        p.sku,
        p.name,
        p.reorder_quantity,
        c.name as category_name,
        MAX(ti.created_at) as last_sale_date
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN transaction_items ti ON p.id = ti.product_id
       LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed'
       WHERE p.quantity_in_stock = 0
         AND p.is_active = true
       GROUP BY p.id, p.sku, p.name, p.reorder_quantity, c.name
       ORDER BY p.name ASC`
    );

    return result.rows;
  }

  /**
   * Generates inventory valuation report - total inventory value and breakdown by category
   *
   * Calculates the total value of all inventory (sum of base_price * quantity_in_stock)
   * and provides a breakdown by category showing:
   * - Product count per category
   * - Total quantity of items per category
   * - Total value per category
   *
   * This report is useful for:
   * - Financial reporting (inventory as an asset)
   * - Identifying which categories hold the most inventory value
   * - Budget planning and purchasing decisions
   *
   * The report runs two queries:
   * 1. Overall totals across all products
   * 2. Category-level breakdown (only includes categories with products)
   *
   * Categories with zero products are excluded from the breakdown via HAVING clause.
   *
   * @async
   * @returns {Promise<InventoryValuation>} Total value and category breakdown
   * @throws {Error} If database query fails
   *
   * @example
   * const valuation = await inventoryService.getInventoryValuation();
   * // Returns: {
   * //   total_value: 9158.82,
   * //   total_items: 118,
   * //   by_category: [
   * //     {
   * //       category_id: "uuid",
   * //       category_name: "Electronics",
   * //       product_count: 5,
   * //       total_quantity: 45,
   * //       total_value: 3250.00
   * //     }
   * //   ]
   * // }
   *
   * @see InventoryValuation and CategoryValuation interfaces in types/inventory.types.ts
   * @see Valuation Report component in pos-client/src/components/Inventory/ValuationReport.tsx
   */
  async getInventoryValuation(): Promise<InventoryValuation> {
    // Get overall totals - sum across all active products
    // COALESCE ensures we get 0 instead of NULL if no products exist
    const totalResult = await pool.query(
      `SELECT
        COALESCE(SUM(base_price * quantity_in_stock), 0) as total_value,
        COALESCE(SUM(quantity_in_stock), 0) as total_items
       FROM products
       WHERE is_active = true`
    );

    // Get valuation breakdown by category
    // LEFT JOIN products to include all categories (even with 0 products)
    // HAVING COUNT(p.id) > 0 excludes categories with no products
    const categoryResult = await pool.query(
      `SELECT
        c.id as category_id,
        c.name as category_name,
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.quantity_in_stock), 0) as total_quantity,
        COALESCE(SUM(p.base_price * p.quantity_in_stock), 0) as total_value
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
       WHERE c.is_active = true
       GROUP BY c.id, c.name
       HAVING COUNT(p.id) > 0
       ORDER BY total_value DESC`
    );

    // Parse numeric values from string to proper types
    const byCategory: CategoryValuation[] = categoryResult.rows.map(row => ({
      category_id: row.category_id,
      category_name: row.category_name,
      product_count: parseInt(row.product_count),
      total_quantity: parseInt(row.total_quantity),
      total_value: parseFloat(row.total_value),
    }));

    return {
      total_value: parseFloat(totalResult.rows[0].total_value),
      total_items: parseInt(totalResult.rows[0].total_items),
      by_category: byCategory,
    };
  }

  /**
   * Generates inventory movement report - stock changes over a date range
   *
   * This complex report tracks inventory changes from sales and manual adjustments
   * over a specified date range. For each product with movements, it shows:
   * - Opening stock (quantity at start of period)
   * - Sales quantity (items sold during period)
   * - Adjustment quantity (manual adjustments during period)
   * - Closing stock (current quantity)
   * - Net change (closing - opening)
   *
   * The query uses CTEs (Common Table Expressions) for clarity:
   * 1. opening_stock: Calculates quantity at start date by adding back all changes after start date
   * 2. sales_in_period: Sums completed sales within date range
   * 3. adjustments_in_period: Sums manual adjustments within date range
   * 4. Final SELECT: Joins all CTEs to produce complete movement data
   *
   * Only products with actual movements (sales > 0 OR adjustments != 0 OR quantity changed)
   * are included to keep the report focused on meaningful changes.
   *
   * Results are sorted by absolute net change DESC to show products with the biggest
   * movements first (whether positive or negative).
   *
   * @async
   * @param {string} startDate - Start of date range (YYYY-MM-DD format)
   * @param {string} endDate - End of date range (YYYY-MM-DD format)
   * @returns {Promise<MovementReportItem[]>} Array of products with movement data
   * @throws {Error} If database query fails or date format is invalid
   *
   * @example
   * const movements = await inventoryService.getInventoryMovementReport(
   *   '2026-02-01',
   *   '2026-02-08'
   * );
   * // Returns: [
   * //   {
   * //     product_id: "uuid",
   * //     sku: "KEYBOARD-001",
   * //     product_name: "Wireless Keyboard",
   * //     category_name: "Electronics",
   * //     opening_stock: 29,
   * //     sales_quantity: 5,
   * //     adjustment_quantity: 25,
   * //     closing_stock: 49,
   * //     net_change: 20
   * //   }
   * // ]
   *
   * @see MovementReportItem interface in types/inventory.types.ts
   * @see Movement Report component in pos-client/src/components/Inventory/MovementReport.tsx
   */
  async getInventoryMovementReport(startDate: string, endDate: string): Promise<MovementReportItem[]> {
    const result = await pool.query(
      `WITH opening_stock AS (
        -- Calculate stock at start of period by adding back all changes after start date
        SELECT
          p.id as product_id,
          p.quantity_in_stock +
            COALESCE(SUM(CASE WHEN ti.created_at >= $1 THEN ti.quantity ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN ia.adjustment_date >= $1 THEN ia.quantity_change ELSE 0 END), 0) as opening_quantity
        FROM products p
        LEFT JOIN transaction_items ti ON p.id = ti.product_id
        LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed'
        LEFT JOIN inventory_adjustments ia ON p.id = ia.product_id
        WHERE p.is_active = true
        GROUP BY p.id, p.quantity_in_stock
      ),
      sales_in_period AS (
        -- Sum all completed sales within the date range
        SELECT
          ti.product_id,
          COALESCE(SUM(ti.quantity), 0) as sales_quantity
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.status = 'completed'
          AND t.created_at >= $1
          AND t.created_at <= $2
        GROUP BY ti.product_id
      ),
      adjustments_in_period AS (
        -- Sum all manual adjustments within the date range
        SELECT
          product_id,
          COALESCE(SUM(quantity_change), 0) as adjustment_quantity
        FROM inventory_adjustments
        WHERE adjustment_date >= $1
          AND adjustment_date <= $2
        GROUP BY product_id
      )
      SELECT
        p.id as product_id,
        p.sku,
        p.name as product_name,
        c.name as category_name,
        COALESCE(os.opening_quantity, p.quantity_in_stock) as opening_stock,
        COALESCE(sp.sales_quantity, 0) as sales_quantity,
        COALESCE(ap.adjustment_quantity, 0) as adjustment_quantity,
        p.quantity_in_stock as closing_stock,
        (p.quantity_in_stock - COALESCE(os.opening_quantity, p.quantity_in_stock)) as net_change
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN opening_stock os ON p.id = os.product_id
      LEFT JOIN sales_in_period sp ON p.id = sp.product_id
      LEFT JOIN adjustments_in_period ap ON p.id = ap.product_id
      WHERE p.is_active = true
        AND (sp.sales_quantity > 0 OR ap.adjustment_quantity != 0 OR p.quantity_in_stock != COALESCE(os.opening_quantity, p.quantity_in_stock))
      ORDER BY ABS(p.quantity_in_stock - COALESCE(os.opening_quantity, p.quantity_in_stock)) DESC`,
      [startDate, endDate]
    );

    // Parse all numeric values from string to integer
    return result.rows.map(row => ({
      ...row,
      opening_stock: parseInt(row.opening_stock),
      sales_quantity: parseInt(row.sales_quantity),
      adjustment_quantity: parseInt(row.adjustment_quantity),
      closing_stock: parseInt(row.closing_stock),
      net_change: parseInt(row.net_change),
    }));
  }

  /**
   * Generates category summary report - aggregated inventory statistics by category
   *
   * Provides a high-level overview of inventory health grouped by category.
   * For each category with products, shows:
   * - Product count
   * - Total quantity across all products
   * - Total value (sum of base_price * quantity for all products)
   * - Average value per item (total value / product count)
   * - Low stock count (products <= reorder level)
   * - Out of stock count (products with quantity = 0)
   *
   * This report helps identify:
   * - Which categories need attention (high low_stock_count or out_of_stock_count)
   * - Which categories hold the most inventory value
   * - Overall inventory health by category
   *
   * The query:
   * - LEFT JOINs products to categories (includes all active categories)
   * - Uses CASE expressions to count low/out of stock products
   * - Calculates average value per item with CASE to avoid division by zero
   * - HAVING COUNT(p.id) > 0 excludes categories with no products
   * - Orders by total_value DESC to show most valuable categories first
   *
   * @async
   * @returns {Promise<CategorySummary[]>} Array of category statistics
   * @throws {Error} If database query fails
   *
   * @example
   * const summary = await inventoryService.getCategorySummary();
   * // Returns: [
   * //   {
   * //     category_id: "uuid",
   * //     category_name: "Electronics",
   * //     product_count: 5,
   * //     total_quantity: 45,
   * //     total_value: 3250.00,
   * //     average_value_per_item: 650.00,
   * //     low_stock_count: 1,
   * //     out_of_stock_count: 0
   * //   }
   * // ]
   *
   * @see CategorySummary interface in types/inventory.types.ts
   * @see Category Summary Report component in pos-client/src/components/Inventory/CategorySummaryReport.tsx
   */
  async getCategorySummary(): Promise<CategorySummary[]> {
    const result = await pool.query(
      `SELECT
        c.id as category_id,
        c.name as category_name,
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.quantity_in_stock), 0) as total_quantity,
        COALESCE(SUM(p.base_price * p.quantity_in_stock), 0) as total_value,
        CASE
          WHEN COUNT(p.id) > 0 THEN COALESCE(SUM(p.base_price * p.quantity_in_stock), 0) / COUNT(p.id)
          ELSE 0
        END as average_value_per_item,
        COUNT(CASE WHEN p.quantity_in_stock <= p.reorder_level THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN p.quantity_in_stock = 0 THEN 1 END) as out_of_stock_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
       WHERE c.is_active = true
       GROUP BY c.id, c.name
       HAVING COUNT(p.id) > 0
       ORDER BY total_value DESC`
    );

    // Parse all numeric values from string to proper types
    return result.rows.map(row => ({
      category_id: row.category_id,
      category_name: row.category_name,
      product_count: parseInt(row.product_count),
      total_quantity: parseInt(row.total_quantity),
      total_value: parseFloat(row.total_value),
      average_value_per_item: parseFloat(row.average_value_per_item),
      low_stock_count: parseInt(row.low_stock_count),
      out_of_stock_count: parseInt(row.out_of_stock_count),
    }));
  }
}

/**
 * Singleton instance of InventoryService
 *
 * Import and use this instance rather than creating new instances:
 * @example
 * import { inventoryService } from '../services/inventory.service';
 * const adjustments = await inventoryService.getAdjustments({ page: 1 });
 */
export const inventoryService = new InventoryService();
