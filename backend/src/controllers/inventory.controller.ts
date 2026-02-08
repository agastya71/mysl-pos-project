/**
 * Inventory Controller
 *
 * Request handlers for inventory management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from '../services/inventory.service';
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { InventoryAdjustment } from '../types/inventory.types';

const inventoryService = new InventoryService();

// Validation schemas
const createAdjustmentSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  adjustment_type: z.enum(['damage', 'theft', 'found', 'correction', 'initial']),
  quantity_change: z.number().int('Quantity change must be an integer').refine(val => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

const getAdjustmentsQuerySchema = z.object({
  product_id: z.string().uuid().optional(),
  adjustment_type: z.enum(['damage', 'theft', 'found', 'correction', 'initial']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * Create a new inventory adjustment
 * POST /api/v1/inventory/adjustments
 */
export const createAdjustment = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment>>,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createAdjustmentSchema.parse(req.body);
    const userId = req.user!.userId;

    const adjustment = await inventoryService.createAdjustment(userId, validatedData as any);

    res.status(201).json({
      success: true,
      data: adjustment,
      message: `Adjustment ${adjustment.adjustment_number} created successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all adjustments with filters
 * GET /api/v1/inventory/adjustments
 */
export const getAdjustments = async (
  req: Request,
  res: Response<ApiResponse<PaginatedResponse<InventoryAdjustment>>>,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getAdjustmentsQuerySchema.parse(req.query);
    const result = await inventoryService.getAdjustments(validatedQuery);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get adjustment by ID
 * GET /api/v1/inventory/adjustments/:id
 */
export const getAdjustmentById = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment>>,
  next: NextFunction
): Promise<void> => {
  try {
    const adjustment = await inventoryService.getAdjustmentById(req.params.id);

    res.json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get adjustment history for a product
 * GET /api/v1/inventory/products/:productId/history
 */
export const getProductHistory = async (
  req: Request,
  res: Response<ApiResponse<InventoryAdjustment[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await inventoryService.getProductInventoryHistory(req.params.productId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
