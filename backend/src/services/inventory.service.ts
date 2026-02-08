/**
 * Inventory Service
 *
 * Business logic for managing inventory adjustments
 */

import { pool } from '../config/database';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  AdjustmentType,
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

    if (data.quantity_change === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'Quantity change cannot be zero');
    }

    // Get current product quantity
    const productQuery = `
      SELECT id, quantity_in_stock, name, sku
      FROM products
      WHERE id = $1
    `;
    const productResult = await pool.query(productQuery, [data.product_id]);

    if (productResult.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Product not found');
    }

    const product = productResult.rows[0];
    const oldQuantity = product.quantity_in_stock;
    const newQuantity = oldQuantity + data.quantity_change;

    // Validate that adjustment won't result in negative inventory
    if (newQuantity < 0) {
      throw new AppError(
        400,
        'INVALID_ADJUSTMENT',
        `Adjustment would result in negative inventory (current: ${oldQuantity}, change: ${data.quantity_change})`
      );
    }

    // Insert adjustment (trigger will update product quantity)
    const insertQuery = `
      INSERT INTO inventory_adjustments (
        product_id,
        adjustment_type,
        quantity_change,
        old_quantity,
        new_quantity,
        reason,
        notes,
        adjusted_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.product_id,
      data.adjustment_type,
      data.quantity_change,
      oldQuantity,
      newQuantity,
      data.reason.trim(),
      data.notes || null,
      userId,
    ];

    try {
      const result = await pool.query(insertQuery, values);
      return result.rows[0];
    } catch (error: any) {
      if (error.message?.includes('negative inventory')) {
        throw new AppError(400, 'INVALID_ADJUSTMENT', error.message);
      }
      throw error;
    }
  }

  /**
   * Get adjustment by ID
   */
  async getAdjustmentById(id: string): Promise<InventoryAdjustment> {
    const query = `
      SELECT
        ia.*,
        p.name as product_name,
        p.sku as product_sku,
        u.username as adjuster_name
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      LEFT JOIN users u ON ia.adjusted_by = u.id
      WHERE ia.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Adjustment not found');
    }

    return result.rows[0];
  }

  /**
   * Get adjustments with optional filters and pagination
   */
  async getAdjustments(query: GetAdjustmentsQuery): Promise<PaginatedResponse<InventoryAdjustment>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (query.product_id) {
      conditions.push(`ia.product_id = $${paramCount++}`);
      values.push(query.product_id);
    }

    if (query.adjustment_type) {
      conditions.push(`ia.adjustment_type = $${paramCount++}`);
      values.push(query.adjustment_type);
    }

    if (query.start_date) {
      conditions.push(`ia.adjustment_date >= $${paramCount++}`);
      values.push(query.start_date);
    }

    if (query.end_date) {
      conditions.push(`ia.adjustment_date <= $${paramCount++}`);
      values.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM inventory_adjustments ia
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT
        ia.*,
        p.name as product_name,
        p.sku as product_sku,
        u.username as adjuster_name
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      LEFT JOIN users u ON ia.adjusted_by = u.id
      ${whereClause}
      ORDER BY ia.adjustment_date DESC, ia.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    values.push(limit, offset);

    const dataResult = await pool.query(dataQuery, values);

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
   * Get adjustment history for a specific product
   */
  async getProductHistory(productId: string): Promise<InventoryAdjustment[]> {
    const query = `
      SELECT
        ia.*,
        p.name as product_name,
        p.sku as product_sku,
        u.username as adjuster_name
      FROM inventory_adjustments ia
      LEFT JOIN products p ON ia.product_id = p.id
      LEFT JOIN users u ON ia.adjusted_by = u.id
      WHERE ia.product_id = $1
      ORDER BY ia.adjustment_date DESC, ia.created_at DESC
    `;

    const result = await pool.query(query, [productId]);
    return result.rows;
  }
}
