/**
 * @fileoverview Category Controller - HTTP request handlers for hierarchical category management
 *
 * This controller handles all category-related API endpoints:
 * - POST /api/v1/categories - Create new category (root or child)
 * - GET /api/v1/categories - List all categories as tree structure
 * - GET /api/v1/categories/:id - Get category details with children
 * - PUT /api/v1/categories/:id - Update category (can change parent)
 * - DELETE /api/v1/categories/:id - Soft delete category
 *
 * Features:
 * - Hierarchical category tree (parent-child relationships)
 * - Unlimited nesting depth (categories can have subcategories)
 * - Category number auto-generation (CAT-XXXXXX)
 * - Tree structure built by service layer (O(n) two-pass algorithm)
 * - Display order support for custom sorting
 * - Product count per category (computed via LEFT JOIN)
 * - Soft delete with validation (cannot delete if has active products/children)
 *
 * Category Tree Structure:
 * - Backend stores flat records with parent_category_id foreign key
 * - Service layer builds tree structure before returning
 * - Frontend receives pre-built tree (no client-side tree building needed)
 * - Each category includes children array (CategoryWithChildren[])
 *
 * Tree Building Algorithm (in service layer):
 * 1. Pass 1: Create map of all categories with empty children arrays
 * 2. Pass 2: Link each category to its parent (or root if no parent)
 * 3. Result: Array of root categories with nested children
 * 4. Time complexity: O(n) where n = total categories
 *
 * Validation Rules:
 * - Category name required (1-100 characters)
 * - Parent category must exist (if specified)
 * - Cannot delete category with active products
 * - Cannot delete category with active child categories
 * - Cannot create circular parent relationships
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have 'manager' role
 *
 * @module controllers/category
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/category.service - Category business logic with tree building
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3A)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../types/api.types';
import { CreateCategoryRequest, UpdateCategoryRequest, CategoryWithChildren } from '../types/category.types';

const categoryService = new CategoryService();

/**
 * Zod validation schema for category creation
 *
 * Validates request body for POST /api/v1/categories.
 * Categories can be created at root level or as children of existing categories.
 *
 * Required fields:
 * - name: Category name (1-100 characters)
 *
 * Optional fields:
 * - description: Category description (text)
 * - parent_category_id: UUID of parent category (creates subcategory)
 * - display_order: Sort order within parent (integer ≥ 0, default: 0)
 *
 * Parent category validation:
 * - If parent_category_id provided, parent must exist
 * - Parent must be active (is_active = true)
 * - Cannot create circular parent relationships
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Create root category
 * {
 *   name: "Electronics",
 *   description: "Electronic devices and accessories"
 * }
 *
 * @example
 * // Create subcategory with display order
 * {
 *   name: "Smartphones",
 *   description: "Mobile phones and accessories",
 *   parent_category_id: "electronics-uuid",
 *   display_order: 1
 * }
 */
const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
  parent_category_id: z.string().uuid().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * Zod validation schema for category updates
 *
 * Validates request body for PUT /api/v1/categories/:id.
 * All fields are optional (partial updates supported).
 *
 * Updatable fields:
 * - name: Category name (1-100 characters)
 * - description: Category description (text)
 * - parent_category_id: UUID of new parent (null to move to root)
 * - display_order: Sort order within parent (integer ≥ 0)
 * - is_active: Active status (boolean) - use for soft delete/restore
 *
 * Parent change validation:
 * - New parent must exist and be active
 * - Cannot make category its own parent
 * - Cannot create circular parent relationships
 * - Can set to null to move category to root level
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Update name and description
 * {
 *   name: "Consumer Electronics",
 *   description: "Updated description"
 * }
 *
 * @example
 * // Move category to different parent
 * {
 *   parent_category_id: "new-parent-uuid",
 *   display_order: 2
 * }
 *
 * @example
 * // Move category to root level
 * {
 *   parent_category_id: null
 * }
 *
 * @example
 * // Soft delete category
 * {
 *   is_active: false
 * }
 */
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parent_category_id: z.string().uuid().nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

/**
 * Create new category
 *
 * HTTP: POST /api/v1/categories
 *
 * Creates new category with auto-generated category_number (CAT-XXXXXX).
 * Can create root-level category or subcategory under existing parent.
 *
 * Category creation flow:
 * 1. Validate request body (name required, optional parent/order)
 * 2. If parent_category_id provided, validate parent exists and is active
 * 3. Insert category record into database
 * 4. Database trigger generates category_number (CAT-000001, CAT-000002, etc.)
 * 5. Return created category with empty children array
 *
 * Display order:
 * - Controls sort order within parent level
 * - Lower numbers displayed first
 * - Default: 0 (displayed first if no other categories)
 * - Used by frontend to sort siblings in tree view
 *
 * @async
 * @param {Request} req - Express request with category data in body
 * @param {Response<ApiResponse<CategoryWithChildren>>} res - Express response with created category
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>} Sends 201 Created with category details
 * @throws {AppError} 400 if validation fails (missing name, invalid parent UUID, negative display_order)
 * @throws {AppError} 404 if parent category not found
 * @throws {AppError} 409 if category name already exists at same level
 *
 * @example
 * // Request - create root category
 * POST /api/v1/categories
 * {
 *   name: "Electronics",
 *   description: "Electronic devices and accessories"
 * }
 *
 * @example
 * // Request - create subcategory
 * POST /api/v1/categories
 * {
 *   name: "Smartphones",
 *   description: "Mobile phones",
 *   parent_category_id: "electronics-uuid",
 *   display_order: 1
 * }
 *
 * @example
 * // Response (201 Created)
 * {
 *   success: true,
 *   data: {
 *     id: "category-uuid",
 *     category_number: "CAT-000123",
 *     name: "Smartphones",
 *     description: "Mobile phones",
 *     parent_category_id: "electronics-uuid",
 *     display_order: 1,
 *     is_active: true,
 *     children: [],
 *     product_count: 0,
 *     created_at: "2026-02-08T10:30:00Z",
 *     updated_at: "2026-02-08T10:30:00Z"
 *   }
 * }
 *
 * @see CategoryService.createCategory for implementation
 * @see database trigger `generate_category_number` for auto-numbering
 */
export const createCategory = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren>>,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createCategorySchema.parse(req.body);
    const category = await categoryService.createCategory(validatedData as any);

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
 * Get all categories as tree structure
 *
 * HTTP: GET /api/v1/categories
 *
 * Retrieves all categories organized into hierarchical tree structure.
 * Backend builds tree using two-pass O(n) algorithm in service layer.
 *
 * Query parameters:
 * - active_only: Filter by active status
 *   - 'true' → only active categories (is_active = true)
 *   - 'false' → only inactive categories (is_active = false)
 *   - undefined/missing → all categories regardless of status
 *
 * Tree structure:
 * - Root categories (no parent_category_id) at top level
 * - Each category includes children array (nested CategoryWithChildren[])
 * - Children sorted by display_order ascending
 * - Unlimited nesting depth supported
 *
 * Product count:
 * - product_count: Number of active products directly in this category
 * - Does NOT include products in subcategories (direct count only)
 * - Computed via LEFT JOIN with products table
 *
 * Tree building algorithm (in service layer):
 * 1. Fetch all categories from database (filtered by active_only if specified)
 * 2. Create map of all categories with empty children arrays
 * 3. Iterate through categories, linking each to its parent
 * 4. Return array of root categories (parent_category_id = null)
 *
 * @async
 * @param {Request} req - Express request with optional active_only query param
 * @param {Response<ApiResponse<CategoryWithChildren[]>>} res - Express response with category tree
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>} Sends 200 OK with category tree
 *
 * @example
 * // Request - get all categories
 * GET /api/v1/categories
 *
 * @example
 * // Request - get only active categories
 * GET /api/v1/categories?active_only=true
 *
 * @example
 * // Response (200 OK) - tree structure
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: "electronics-uuid",
 *       category_number: "CAT-000001",
 *       name: "Electronics",
 *       description: "Electronic devices",
 *       parent_category_id: null,
 *       display_order: 0,
 *       is_active: true,
 *       product_count: 5,
 *       children: [
 *         {
 *           id: "smartphones-uuid",
 *           category_number: "CAT-000002",
 *           name: "Smartphones",
 *           description: "Mobile phones",
 *           parent_category_id: "electronics-uuid",
 *           display_order: 1,
 *           is_active: true,
 *           product_count: 12,
 *           children: []
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * @see CategoryService.getCategories for tree building implementation
 */
export const getCategories = async (
  req: Request,
  res: Response<ApiResponse<CategoryWithChildren[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse active_only query parameter with three states: true, false, undefined
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
 * Get category details by ID
 *
 * HTTP: GET /api/v1/categories/:id
 *
 * Retrieves complete category details including children and product count.
 * Used for category detail view and edit forms.
 *
 * Returns full category record:
 * - id, category_number, name, description
 * - parent_category_id, display_order, is_active
 * - children: Array of immediate child categories (not grandchildren)
 * - product_count: Number of active products in this category
 * - created_at, updated_at
 *
 * Children array:
 * - Only includes immediate children (not recursive)
 * - Sorted by display_order ascending
 * - Each child has empty children array (not recursively populated)
 *
 * @async
 * @param {Request} req - Express request with category ID in params
 * @param {Response<ApiResponse<CategoryWithChildren>>} res - Express response with category details
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>} Sends 200 OK with category details
 * @throws {AppError} 404 if category not found
 *
 * @example
 * // Request
 * GET /api/v1/categories/category-uuid
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   data: {
 *     id: "electronics-uuid",
 *     category_number: "CAT-000001",
 *     name: "Electronics",
 *     description: "Electronic devices and accessories",
 *     parent_category_id: null,
 *     display_order: 0,
 *     is_active: true,
 *     product_count: 5,
 *     children: [
 *       {
 *         id: "smartphones-uuid",
 *         category_number: "CAT-000002",
 *         name: "Smartphones",
 *         parent_category_id: "electronics-uuid",
 *         display_order: 1,
 *         is_active: true,
 *         product_count: 12,
 *         children: []
 *       }
 *     ],
 *     created_at: "2026-02-01T10:00:00Z",
 *     updated_at: "2026-02-08T10:00:00Z"
 *   }
 * }
 *
 * @see CategoryService.getCategoryById for implementation
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
 *
 * HTTP: PUT /api/v1/categories/:id
 *
 * Updates category with partial field updates.
 * Can change name, description, parent, display order, or active status.
 *
 * Updatable fields:
 * - name, description: Basic category info
 * - parent_category_id: Move to different parent (or null for root)
 * - display_order: Change sort order within parent
 * - is_active: Soft delete/restore category
 *
 * Parent change validation:
 * - New parent must exist and be active
 * - Cannot make category its own parent
 * - Cannot create circular parent relationships (category → child → grandchild → category)
 * - Set to null to move category to root level
 *
 * Partial update logic:
 * - Only provided fields are updated
 * - Omitted fields remain unchanged
 * - SET clause built dynamically based on provided fields
 *
 * @async
 * @param {Request} req - Express request with category ID in params and update data in body
 * @param {Response<ApiResponse<CategoryWithChildren>>} res - Express response with updated category
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>} Sends 200 OK with updated category details
 * @throws {AppError} 400 if validation fails (name empty, invalid parent UUID, circular parent)
 * @throws {AppError} 404 if category or new parent not found
 * @throws {AppError} 409 if name already exists at same level
 *
 * @example
 * // Request - update name and description
 * PUT /api/v1/categories/category-uuid
 * {
 *   name: "Consumer Electronics",
 *   description: "Updated description for consumer electronics"
 * }
 *
 * @example
 * // Request - move to different parent
 * PUT /api/v1/categories/smartphones-uuid
 * {
 *   parent_category_id: "mobile-devices-uuid",
 *   display_order: 1
 * }
 *
 * @example
 * // Request - move to root level
 * PUT /api/v1/categories/category-uuid
 * {
 *   parent_category_id: null
 * }
 *
 * @example
 * // Request - soft delete category
 * PUT /api/v1/categories/category-uuid
 * {
 *   is_active: false
 * }
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   data: {
 *     id: "category-uuid",
 *     category_number: "CAT-000001",
 *     name: "Consumer Electronics",
 *     description: "Updated description",
 *     parent_category_id: null,
 *     display_order: 0,
 *     is_active: true,
 *     children: [],
 *     product_count: 5,
 *     updated_at: "2026-02-08T11:00:00Z"
 *   }
 * }
 *
 * @see CategoryService.updateCategory for implementation with circular parent detection
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
 *
 * HTTP: DELETE /api/v1/categories/:id
 *
 * Soft deletes category by setting is_active = false.
 * Validates category has no active products or active child categories before deletion.
 *
 * Validation rules:
 * - Category must exist
 * - Category must have no active products (product_count = 0)
 * - Category must have no active child categories
 * - If validation fails, returns 409 Conflict with error message
 *
 * Soft delete benefits:
 * - Preserves historical data (product.category_id foreign keys remain valid)
 * - Maintains referential integrity
 * - Allows category restoration (via PUT with is_active = true)
 * - Audit trail preserved (created_at, updated_at)
 *
 * Effects:
 * - Category hidden from category tree (when active_only = true)
 * - Category hidden from product category selector
 * - Historical product records still reference category
 * - Products must be moved to different category before deletion
 * - Child categories must be deleted/moved first
 *
 * Hard delete (permanent removal) is not supported to maintain data integrity.
 *
 * @async
 * @param {Request} req - Express request with category ID in params
 * @param {Response<ApiResponse>} res - Express response with success message
 * @param {NextFunction} next - Express next function for error handling
 * @returns {Promise<void>} Sends 200 OK with success message
 * @throws {AppError} 404 if category not found
 * @throws {AppError} 409 if category has active products
 * @throws {AppError} 409 if category has active child categories
 *
 * @example
 * // Request
 * DELETE /api/v1/categories/category-uuid
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   message: "Category deleted successfully"
 * }
 *
 * @example
 * // Error response (409 Conflict) - has products
 * {
 *   success: false,
 *   error: {
 *     code: "CATEGORY_HAS_PRODUCTS",
 *     message: "Cannot delete category with active products"
 *   }
 * }
 *
 * @example
 * // Error response (409 Conflict) - has children
 * {
 *   success: false,
 *   error: {
 *     code: "CATEGORY_HAS_CHILDREN",
 *     message: "Cannot delete category with active child categories"
 *   }
 * }
 *
 * @see CategoryService.deleteCategory for implementation with validation
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
