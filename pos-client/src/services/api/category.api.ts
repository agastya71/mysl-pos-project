/**
 * @fileoverview Category API Service - Frontend API client for category operations
 *
 * This service provides API methods for hierarchical category management:
 * - getCategories: Get all categories in tree structure with product counts
 * - getCategoryById: Get specific category with children
 * - createCategory: Create new category with auto-generated category_number
 * - updateCategory: Update existing category (name, description, parent, order)
 * - deleteCategory: Soft delete category (validates no products/children)
 *
 * Category Structure:
 * - Hierarchical tree with parent-child relationships
 * - Unlimited nesting depth (categories can have subcategories)
 * - Auto-generated category_number (CAT-XXXXXX format)
 * - Display order for controlling category sequence
 * - Product count per category (calculated from products table)
 * - Soft delete via is_active flag
 *
 * Tree Building Algorithm:
 * - Backend builds tree using two-pass O(n) algorithm
 * - First pass: Create map of id → category
 * - Second pass: Link children to parents
 * - Frontend receives pre-built tree structure (CategoryWithChildren[])
 * - Recursive rendering in CategoryTree component
 *
 * Use Cases:
 * - Category management: Admin interface for creating/editing categories
 * - Product organization: Assign products to categories
 * - Navigation: Browse products by category
 * - Reporting: Group sales/inventory by category
 *
 * API Endpoints:
 * - GET /api/v1/categories?active_only={true|false} - List all (tree structure)
 * - GET /api/v1/categories/:id - Get category by ID with children
 * - POST /api/v1/categories - Create category
 * - PUT /api/v1/categories/:id - Update category
 * - DELETE /api/v1/categories/:id - Soft delete category
 *
 * @module services/api/category
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/category.types - Category types
 * @requires ../../types/api.types - API response types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3A)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import {
  Category,
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../types/category.types';
import { ApiResponse } from '../../types/api.types';

const BASE_URL = '/categories';

/**
 * Category API Service
 *
 * Provides methods for hierarchical category management in POS system.
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - getCategories: Get all categories in tree structure (pre-built by backend)
 * - getCategoryById: Get specific category with its children
 * - createCategory: Create new category with auto-generated category_number
 * - updateCategory: Update category information (partial updates supported)
 * - deleteCategory: Soft delete category (validates no active products/children)
 *
 * Tree Structure:
 * - Backend returns pre-built tree (CategoryWithChildren[])
 * - Each category includes children array (nested structure)
 * - Product count included for each category (from LEFT JOIN)
 * - Frontend uses recursive rendering for tree display
 *
 * Usage in Redux:
 * - Called from categories.slice.ts async thunks
 * - Responses stored in Redux categories state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const categoryApi = {
  /**
   * Get all categories in tree structure
   *
   * HTTP: GET /api/v1/categories?active_only={true|false}
   *
   * Retrieves all categories as a pre-built hierarchical tree structure.
   * Backend performs tree building using two-pass O(n) algorithm and returns
   * complete tree with children nested under parents.
   *
   * Query parameters:
   * - active_only: Filter by active status (optional)
   *   - true: Return only active categories (is_active = true)
   *   - false: Return only inactive categories (is_active = false)
   *   - undefined: Return all categories regardless of status
   *
   * Tree structure:
   * - Root categories: Categories with no parent (parent_category_id = null)
   * - Children: Nested under parent in children array
   * - Unlimited depth: Categories can have subcategories at any level
   * - Sorted by: display_order ASC (user-defined ordering)
   *
   * Each category includes:
   * - id, category_number (CAT-XXXXXX), name, description
   * - parent_category_id: Parent UUID or null for root
   * - display_order: User-defined sort order
   * - is_active: Active status flag
   * - product_count: Number of products in this category (from LEFT JOIN)
   * - children: Array of child categories (recursive structure)
   *
   * Tree building algorithm (backend):
   * 1. First pass: Create map of id → category object
   * 2. Second pass: Link children to parents via parent_category_id
   * 3. Collect root categories (no parent)
   * 4. Return root categories with nested children
   *
   * Use cases:
   * - Category management page (display full tree)
   * - Product form (select category from tree)
   * - Navigation menu (category hierarchy)
   * - Reports (group by category tree)
   *
   * @async
   * @function getCategories
   * @param {boolean} [activeOnly] - Filter by active status (true/false/undefined)
   * @returns {Promise<CategoryWithChildren[]>} Array of root categories with nested children
   * @throws {Error} If request fails (network error, server error)
   *
   * @example
   * // Get all categories (active and inactive)
   * const tree = await categoryApi.getCategories();
   * console.log('Root categories:', tree.length);
   * console.log('First category children:', tree[0].children.length);
   *
   * @example
   * // Get active categories only
   * const activeTree = await categoryApi.getCategories(true);
   * console.log('Active categories:', activeTree);
   *
   * @example
   * // Get inactive categories only
   * const inactiveTree = await categoryApi.getCategories(false);
   * console.log('Inactive categories:', inactiveTree);
   *
   * @example
   * // Traverse tree recursively
   * const tree = await categoryApi.getCategories();
   * const printTree = (categories: CategoryWithChildren[], depth = 0) => {
   *   categories.forEach(cat => {
   *     console.log('  '.repeat(depth) + cat.name + ` (${cat.product_count} products)`);
   *     printTree(cat.children, depth + 1);
   *   });
   * };
   * printTree(tree);
   *
   * @example
   * // Usage in Redux thunk (categories.slice.ts)
   * export const fetchCategories = createAsyncThunk(
   *   'categories/fetchAll',
   *   async (activeOnly?: boolean) => {
   *     return await categoryApi.getCategories(activeOnly);
   *   }
   * );
   *
   * @see CategoryWithChildren type in ../../types/category.types.ts
   * @see categories.slice.ts for Redux integration
   * @see CategoryTree component for recursive rendering
   * @see category.service.ts for backend tree building algorithm
   */
  getCategories: async (activeOnly?: boolean): Promise<CategoryWithChildren[]> => {
    const params = activeOnly !== undefined ? { active_only: activeOnly } : {};
    const response = await apiClient.get<ApiResponse<CategoryWithChildren[]>>(
      BASE_URL,
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get category by ID with children
   *
   * HTTP: GET /api/v1/categories/:id
   *
   * Retrieves specific category with its direct children (one level deep).
   * Includes product count for the category.
   *
   * Returns category with:
   * - id, category_number (CAT-XXXXXX), name, description
   * - parent_category_id: Parent UUID or null for root
   * - display_order: User-defined sort order
   * - is_active: Active status flag
   * - product_count: Number of products in this category
   * - children: Array of direct child categories (one level)
   * - created_at, updated_at: Timestamps
   *
   * Children structure:
   * - Only direct children included (not grandchildren)
   * - Children sorted by display_order ASC
   * - Each child includes product_count
   * - For full tree, use getCategories() instead
   *
   * Use cases:
   * - Category detail view (show category info + direct children)
   * - Category edit form (pre-fill data)
   * - Breadcrumb navigation (show parent-child path)
   * - Single-level category picker
   *
   * @async
   * @function getCategoryById
   * @param {string} id - Category UUID
   * @returns {Promise<CategoryWithChildren>} Category with direct children
   * @throws {Error} If category not found (404) or request fails
   *
   * @example
   * // Get category details
   * const category = await categoryApi.getCategoryById('category-uuid');
   * console.log('Category:', category.name);
   * console.log('Product count:', category.product_count);
   * console.log('Direct children:', category.children.length);
   *
   * @example
   * // Check if category has parent
   * const category = await categoryApi.getCategoryById('category-uuid');
   * if (category.parent_category_id) {
   *   console.log('This is a subcategory');
   * } else {
   *   console.log('This is a root category');
   * }
   *
   * @example
   * // Usage in Redux thunk (categories.slice.ts)
   * export const fetchCategoryById = createAsyncThunk(
   *   'categories/fetchById',
   *   async (id: string) => {
   *     return await categoryApi.getCategoryById(id);
   *   }
   * );
   *
   * @see CategoryWithChildren type in ../../types/category.types.ts
   * @see categories.slice.ts for Redux integration
   */
  getCategoryById: async (id: string): Promise<CategoryWithChildren> => {
    const response = await apiClient.get<ApiResponse<CategoryWithChildren>>(
      `${BASE_URL}/${id}`
    );
    if (!response.data.data) {
      throw new Error('Category not found');
    }
    return response.data.data;
  },

  /**
   * Create new category
   *
   * HTTP: POST /api/v1/categories
   *
   * Creates new category with auto-generated category_number (CAT-XXXXXX format).
   * Category number generated sequentially via database trigger.
   *
   * Required fields:
   * - name: Category name (1-100 characters, unique)
   *
   * Optional fields:
   * - description: Category description (max 500 characters)
   * - parent_category_id: Parent category UUID (null for root category)
   * - display_order: Sort order (integer, default: 0)
   *
   * Auto-generated fields:
   * - id: UUID primary key
   * - category_number: Sequential CAT-000001, CAT-000002, etc.
   * - is_active: Initialized to true
   * - created_at, updated_at: Timestamps
   *
   * Parent-child relationships:
   * - Set parent_category_id to create subcategory
   * - Set parent_category_id to null for root category
   * - Parent must exist and be active
   * - Unlimited nesting depth supported
   *
   * Display order:
   * - Controls category sequence in tree
   * - Lower numbers appear first
   * - Default: 0 (appears at top)
   * - Use for custom sorting (e.g., 10, 20, 30 for easy reordering)
   *
   * Validation:
   * - name required and non-empty
   * - name must be unique across all categories
   * - parent_category_id must reference existing active category
   * - description limited to 500 characters
   *
   * @async
   * @function createCategory
   * @param {CreateCategoryRequest} data - Category data (name, description, parent, order)
   * @returns {Promise<Category>} Created category with auto-generated category_number
   * @throws {Error} If validation fails or request fails
   *
   * @example
   * // Create root category
   * const category = await categoryApi.createCategory({
   *   name: 'Electronics',
   *   description: 'Electronic devices and accessories',
   *   display_order: 10
   * });
   * console.log('Created category:', category.category_number);
   *
   * @example
   * // Create subcategory
   * const subcategory = await categoryApi.createCategory({
   *   name: 'Smartphones',
   *   description: 'Mobile phones and smartphones',
   *   parent_category_id: 'electronics-uuid',
   *   display_order: 20
   * });
   * console.log('Created subcategory under Electronics');
   *
   * @example
   * // Create minimal category
   * const category = await categoryApi.createCategory({
   *   name: 'Books'
   * });
   * console.log('Category number:', category.category_number);
   *
   * @example
   * // Usage in Redux thunk (categories.slice.ts)
   * export const createCategory = createAsyncThunk(
   *   'categories/create',
   *   async (data: CreateCategoryRequest) => {
   *     return await categoryApi.createCategory(data);
   *   }
   * );
   *
   * @see CreateCategoryRequest type in ../../types/category.types.ts
   * @see Category type in ../../types/category.types.ts
   * @see categories.slice.ts for Redux integration
   */
  createCategory: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(BASE_URL, data);
    if (!response.data.data) {
      throw new Error('Failed to create category');
    }
    return response.data.data;
  },

  /**
   * Update existing category
   *
   * HTTP: PUT /api/v1/categories/:id
   *
   * Updates category information with partial update support.
   * Only fields provided in the request will be updated.
   *
   * Updatable fields:
   * - name: Category name (must remain unique)
   * - description: Category description
   * - parent_category_id: Move category to different parent (null for root)
   * - display_order: Change sort order
   *
   * Non-updatable fields (managed by system):
   * - id, category_number: Immutable identifiers
   * - created_at: Immutable timestamp
   * - updated_at: Auto-updated by database
   * - is_active: Use deleteCategory() to soft delete
   *
   * Parent changes:
   * - Can move category to different parent
   * - Can convert subcategory to root (set parent_category_id = null)
   * - Can convert root to subcategory (set parent_category_id)
   * - Cannot create circular references (validation prevents)
   * - Children move with parent (entire subtree relocated)
   *
   * Validation:
   * - name must remain unique if changed
   * - parent_category_id must reference existing active category
   * - Cannot set category as its own parent (circular reference)
   * - Cannot set descendant as parent (circular reference)
   * - Category must exist and not be deleted
   *
   * @async
   * @function updateCategory
   * @param {string} id - Category UUID to update
   * @param {UpdateCategoryRequest} data - Category data to update (partial)
   * @returns {Promise<Category>} Updated category with new data
   * @throws {Error} If category not found (404) or validation fails
   *
   * @example
   * // Update category name and description
   * const category = await categoryApi.updateCategory('category-uuid', {
   *   name: 'Consumer Electronics',
   *   description: 'Electronics for home and personal use'
   * });
   * console.log('Updated category:', category.name);
   *
   * @example
   * // Move category to different parent
   * const category = await categoryApi.updateCategory('category-uuid', {
   *   parent_category_id: 'new-parent-uuid'
   * });
   * console.log('Category moved to new parent');
   *
   * @example
   * // Convert subcategory to root category
   * const category = await categoryApi.updateCategory('category-uuid', {
   *   parent_category_id: null
   * });
   * console.log('Category is now a root category');
   *
   * @example
   * // Change display order
   * const category = await categoryApi.updateCategory('category-uuid', {
   *   display_order: 50
   * });
   * console.log('Display order updated');
   *
   * @example
   * // Usage in Redux thunk (categories.slice.ts)
   * export const updateCategory = createAsyncThunk(
   *   'categories/update',
   *   async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
   *     return await categoryApi.updateCategory(id, data);
   *   }
   * );
   *
   * @see UpdateCategoryRequest type in ../../types/category.types.ts
   * @see Category type in ../../types/category.types.ts
   * @see categories.slice.ts for Redux integration
   */
  updateCategory: async (
    id: string,
    data: UpdateCategoryRequest
  ): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `${BASE_URL}/${id}`,
      data
    );
    if (!response.data.data) {
      throw new Error('Failed to update category');
    }
    return response.data.data;
  },

  /**
   * Delete category (soft delete with validation)
   *
   * HTTP: DELETE /api/v1/categories/:id
   *
   * Soft deletes category by setting is_active = false.
   * Validates category has no active products or active subcategories before deletion.
   *
   * Soft delete behavior:
   * - Sets is_active = false (category marked as inactive)
   * - Category record remains in database
   * - Historical product data preserved (product.category_id remains valid)
   * - Category excluded from active category lists
   * - Can be reactivated by setting is_active = true via update
   *
   * Validation rules:
   * - Cannot delete category with active products (must reassign products first)
   * - Cannot delete category with active subcategories (must delete/deactivate children first)
   * - Can delete category with inactive products (historical data preserved)
   * - Can delete category with inactive subcategories (cascade soft delete)
   *
   * Why soft delete:
   * - Maintains referential integrity (product.category_id remains valid)
   * - Preserves historical product data
   * - Enables category reactivation if needed
   * - Supports audit trails and compliance requirements
   *
   * Deletion workflow:
   * 1. Check for active products in category
   * 2. Check for active subcategories
   * 3. If any found, return validation error
   * 4. If none found, set is_active = false
   * 5. Return success
   *
   * To delete category with products:
   * 1. Reassign all products to different category
   * 2. Deactivate or delete all subcategories
   * 3. Then delete the category
   *
   * @async
   * @function deleteCategory
   * @param {string} id - Category UUID to delete
   * @returns {Promise<void>} Resolves when category deleted
   * @throws {Error} If category has active products/subcategories or not found (404)
   *
   * @example
   * // Delete category (succeeds if no active products/subcategories)
   * await categoryApi.deleteCategory('category-uuid');
   * console.log('Category deleted (soft delete)');
   *
   * @example
   * // Handle validation error
   * try {
   *   await categoryApi.deleteCategory('category-uuid');
   * } catch (error) {
   *   if (error.message.includes('active products')) {
   *     console.error('Cannot delete: category has active products');
   *     console.log('Reassign products first');
   *   } else if (error.message.includes('active subcategories')) {
   *     console.error('Cannot delete: category has active subcategories');
   *     console.log('Delete subcategories first');
   *   }
   * }
   *
   * @example
   * // Usage in Redux thunk (categories.slice.ts)
   * export const deleteCategory = createAsyncThunk(
   *   'categories/delete',
   *   async (id: string) => {
   *     await categoryApi.deleteCategory(id);
   *     return id; // Return ID to remove from Redux state
   *   }
   * );
   *
   * @see categories.slice.ts for Redux integration
   * @see category.controller.ts for backend validation logic
   */
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};
