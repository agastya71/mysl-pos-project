/**
 * Inventory Service - Report Methods
 *
 * Added report generation methods for Phase 3C
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

export class InventoryService {
  /**
   * Create a new inventory adjustment
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

      // Get current product quantity
      const productResult = await client.query(
        'SELECT id, quantity_in_stock FROM products WHERE id = $1',
        [data.product_id]
      );

      if (productResult.rowCount === 0) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      }

      const currentQuantity = productResult.rows[0].quantity_in_stock;
      const newQuantity = currentQuantity + data.quantity_change;

      // Prevent negative inventory
      if (newQuantity < 0) {
        throw new AppError(
          400,
          'NEGATIVE_INVENTORY',
          `Adjustment would result in negative inventory. Current: ${currentQuantity}, Change: ${data.quantity_change}`
        );
      }

      // Insert adjustment record (trigger will update product quantity)
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
   * Get adjustment by ID
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
   * Get adjustments with filters and pagination
   */
  async getAdjustments(query: GetAdjustmentsQuery): Promise<PaginatedResponse<InventoryAdjustment>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

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

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_adjustments ia ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get adjustments with product and user info
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
   * Get product's inventory adjustment history
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
   * Get low stock products (quantity <= reorder_level)
   */
  async getLowStockProducts(): Promise<LowStockProduct[]> {
    const result = await pool.query(
      `SELECT
        p.id,
        p.sku,
        p.name,
        p.sku,
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

    return result.rows.map(row => ({
      ...row,
      stock_value: parseFloat(row.stock_value) || 0,
    }));
  }

  /**
   * Get out of stock products (quantity = 0)
   */
  async getOutOfStockProducts(): Promise<OutOfStockProduct[]> {
    const result = await pool.query(
      `SELECT
        p.id,
        p.sku,
        p.name,
        p.sku,
        p.reorder_quantity,
        c.name as category_name,
        MAX(ti.created_at) as last_sale_date
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN transaction_items ti ON p.id = ti.product_id
       LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed'
       WHERE p.quantity_in_stock = 0
         AND p.is_active = true
       GROUP BY p.id, p.sku, p.name, p.sku, p.reorder_quantity, c.name
       ORDER BY p.name ASC`
    );

    return result.rows;
  }

  /**
   * Get inventory valuation report
   */
  async getInventoryValuation(): Promise<InventoryValuation> {
    // Get overall totals
    const totalResult = await pool.query(
      `SELECT
        COALESCE(SUM(base_price * quantity_in_stock), 0) as total_value,
        COALESCE(SUM(quantity_in_stock), 0) as total_items
       FROM products
       WHERE is_active = true`
    );

    // Get valuation by category
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
   * Get inventory movement report for a date range
   */
  async getInventoryMovementReport(startDate: string, endDate: string): Promise<MovementReportItem[]> {
    const result = await pool.query(
      `WITH opening_stock AS (
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
        p.sku,
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
   * Get category summary report
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

export const inventoryService = new InventoryService();
