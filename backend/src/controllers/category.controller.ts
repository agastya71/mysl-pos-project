/**
 * Category Controller
 *
 * Request handlers for category management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../types/api.types';
import { CreateCategoryRequest, UpdateCategoryRequest, CategoryWithChildren } from '../types/category.types';

const categoryService = new CategoryService();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  parent_category_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parent_category_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

/**
 * Create a new category
 * POST /api/v1/categories
 */
export const createCategory = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren>>,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(validatedData);

    res.status(201).json({
      success: true,
      data: {
        ...category,
        children: [],
        product_count: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories (tree structure)
 * GET /api/v1/categories
 */
export const getCategories = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    const activeOnly = req.query.active_only === 'true' ? true : req.query.active_only === 'false' ? false : undefined;
    const categories = await categoryService.getCategories(activeOnly);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID
 * GET /api/v1/categories/:id
 */
export const getCategoryById = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren>>,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/v1/categories/:id
 */
export const updateCategory = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren>>,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateCategorySchema.parse(req.body);
    const category = await categoryService.updateCategory(req.params.id, validatedData);

    res.json({
      success: true,
      data: {
        ...category,
        children: [],
        product_count: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category (soft delete)
 * DELETE /api/v1/categories/:id
 */
export const deleteCategory = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    await categoryService.deleteCategory(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
