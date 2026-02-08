/**
 * @fileoverview Category Service - Manages hierarchical product categories
 *
 * This service provides category management with support for:
 * - Hierarchical tree structure (parent-child relationships)
 * - CRUD operations (Create, Read, Update, Delete)
 * - Tree building algorithm (flat to hierarchical conversion)
 * - Product count tracking per category
 * - Soft delete with validation (prevents deleting categories with products/children)
 * - Automatic category number generation (CAT-XXXXXX)
 * - Display order management for custom sorting
 *
 * Categories can be nested infinitely, though the UI typically shows 2-3 levels.
 * The service builds the complete tree structure from a flat database result,
 * preserving parent-child relationships.
 *
 * @module services/category
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-25 (Phase 3A)
 */

import { pool } from '../config/database';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryWithChildren,
} from '../types/category.types';
import { AppError } from '../middleware/error.middleware';

/**
 * CategoryService - Handles all category-related business logic
 *
 * This class provides methods for managing hierarchical product categories.
 * Categories are stored flat in the database with parent_category_id references,
 * and converted to tree structure when retrieved.
 *
 * All database operations use parameterized queries to prevent SQL injection.
 *
 * @class CategoryService
 */
export class CategoryService {
  /**
   * Creates a new category with optional parent
   *
   * The database trigger 'set_category_number' automatically generates a
   * unique category number in format CAT-XXXXXX (e.g., CAT-000001).
   *
   * Categories can be created at root level (no parent) or as children of
   * existing categories. The hierarchical structure supports infinite nesting
   * depth, though UI typically limits to 2-3 levels.
   *
   * Default values:
   * - is_active: true (set by database default)
   * - display_order: 0 if not specified
   * - description: null if not provided
   *
   * @async
   * @param {CreateCategoryRequest} data - Category data
   * @param {string} data.name - Category name (required, max 100 chars)
   * @param {string} [data.description] - Optional description (max 500 chars)
   * @param {string} [data.parent_category_id] - UUID of parent category (null for root level)
   * @param {number} [data.display_order=0] - Sort order (lower numbers appear first)
   * @returns {Promise<Category>} The created category with auto-generated fields
   * @throws {AppError} 400 - If name is empty or invalid
   *
   * @example
   * // Create root-level category
   * const category = await categoryService.createCategory({
   *   name: 'Electronics',
   *   description: 'Electronic devices and accessories',
   *   display_order: 1
   * });
   * // Returns: { id, category_number: "CAT-000001", name: "Electronics", ... }
   *
   * @example
   * // Create subcategory
   * const subcategory = await categoryService.createCategory({
   *   name: 'Smartphones',
   *   parent_category_id: 'electronics-category-uuid',
   *   display_order: 1
   * });
   */
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    // Validate name is provided and not empty
    if (!data.name || data.name.trim() === '') {
      throw new AppError(400, 'INVALID_INPUT', 'Category name is required');
    }

    const query = `
      INSERT INTO categories (name, description, parent_category_id, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      data.name.trim(),
      data.description || null,
      data.parent_category_id || null,
      data.display_order !== undefined ? data.display_order : 0,
    ];

    // Database trigger 'set_category_number' will automatically
    // generate category_number in format CAT-XXXXXX
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Retrieves a single category by ID with its direct children
   *
   * Returns the category along with:
   * - Product count (active products only)
   * - Direct children categories (one level deep)
   * - Each child includes its product count
   *
   * Children are sorted by display_order ASC, then name ASC.
   * This method does NOT return grandchildren - only immediate children.
   * For full tree structure, use getCategories().
   *
   * @async
   * @param {string} id - UUID of the category
   * @returns {Promise<CategoryWithChildren>} Category with children and product counts
   * @throws {AppError} 404 - If category is not found
   *
   * @example
   * const category = await categoryService.getCategoryById('category-uuid');
   * console.log(category.category_number); // "CAT-000001"
   * console.log(category.product_count); // 15
   * console.log(category.children.length); // 3 (direct children only)
   */
  async getCategoryById(id: string): Promise<CategoryWithChildren> {
    // Get category with product count
    // COUNT only includes active products (is_active = true)
    const categoryQuery = `
      SELECT
        c.*,
        COUNT(p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const categoryResult = await pool.query(categoryQuery, [id]);

    if (categoryResult.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const category = categoryResult.rows[0];

    // Get direct children with their product counts
    // Sorted by display_order (custom sort), then name (alphabetically)
    const childrenQuery = `
      SELECT
        c.*,
        COUNT(p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.parent_category_id = $1
      GROUP BY c.id
      ORDER BY c.display_order, c.name
    `;

    const childrenResult = await pool.query(childrenQuery, [id]);

    return {
      ...category,
      product_count: parseInt(category.product_count || '0'),
      children: childrenResult.rows.map((child) => ({
        ...child,
        product_count: parseInt(child.product_count || '0'),
        children: [], // Direct children only - no grandchildren
      })),
    };
  }

  /**
   * Retrieves all categories organized in hierarchical tree structure
   *
   * Returns all categories (or only active ones if filtered) organized into
   * a tree structure preserving parent-child relationships. Categories are
   * fetched flat from the database and transformed into a hierarchical
   * structure using the buildCategoryTree algorithm.
   *
   * Each category includes:
   * - All category fields (id, name, description, etc.)
   * - Product count (active products only)
   * - Nested children array (recursive)
   *
   * Root categories (parent_category_id = null) are returned at the top level.
   * Each category's children are recursively nested within the children array.
   *
   * Categories are sorted by display_order ASC, then name ASC at each level.
   *
   * @async
   * @param {boolean} [activeOnly] - Filter by is_active status (true/false/undefined)
   * @returns {Promise<CategoryWithChildren[]>} Array of root categories with nested children
   *
   * @example
   * // Get all categories in tree structure
   * const tree = await categoryService.getCategories();
   * // Returns: [
   * //   {
   * //     id: "uuid",
   * //     category_number: "CAT-000001",
   * //     name: "Electronics",
   * //     product_count: 5,
   * //     children: [
   * //       {
   * //         id: "uuid",
   * //         category_number: "CAT-000002",
   * //         name: "Smartphones",
   * //         parent_category_id: "electronics-uuid",
   * //         product_count: 3,
   * //         children: []
   * //       }
   * //     ]
   * //   }
   * // ]
   *
   * @example
   * // Get only active categories
   * const activeTree = await categoryService.getCategories(true);
   * // Only returns categories with is_active = true
   */
  async getCategories(activeOnly?: boolean): Promise<CategoryWithChildren[]> {
    // Get all categories with product counts (active products only)
    let query = `
      SELECT
        c.*,
        COUNT(p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    `;

    const values: any[] = [];

    // Optional filter by active status
    if (activeOnly !== undefined) {
      query += ` WHERE c.is_active = $1`;
      values.push(activeOnly);
    }

    // Sort by display_order (custom order), then name (alphabetically)
    query += `
      GROUP BY c.id
      ORDER BY c.display_order, c.name
    `;

    const result = await pool.query(query, values);
    const categories = result.rows.map((row) => ({
      ...row,
      product_count: parseInt(row.product_count || '0'),
    }));

    // Transform flat list into hierarchical tree structure
    return this.buildCategoryTree(categories);
  }

  /**
   * Builds hierarchical tree structure from flat category array
   *
   * This algorithm transforms a flat array of categories into a nested tree
   * structure by using parent_category_id relationships. It uses a two-pass
   * approach for optimal performance:
   *
   * Pass 1: Create a Map of all categories with empty children arrays
   * Pass 2: Link each category to its parent (or to root if no parent)
   *
   * Categories without a parent (parent_category_id = null) become root nodes.
   * Categories with parent_category_id are added to their parent's children array.
   * If a parent is not found (orphaned category), it's treated as a root category.
   *
   * Time complexity: O(n) where n is the number of categories
   * Space complexity: O(n) for the categoryMap
   *
   * @private
   * @param {any[]} categories - Flat array of categories from database
   * @returns {CategoryWithChildren[]} Array of root categories with nested children
   *
   * @example
   * // Input (flat):
   * [
   *   { id: '1', name: 'Electronics', parent_category_id: null },
   *   { id: '2', name: 'Smartphones', parent_category_id: '1' },
   *   { id: '3', name: 'iPhone', parent_category_id: '2' }
   * ]
   *
   * // Output (tree):
   * [
   *   {
   *     id: '1',
   *     name: 'Electronics',
   *     children: [
   *       {
   *         id: '2',
   *         name: 'Smartphones',
   *         parent_category_id: '1',
   *         children: [
   *           {
   *             id: '3',
   *             name: 'iPhone',
   *             parent_category_id: '2',
   *             children: []
   *           }
   *         ]
   *       }
   *     ]
   *   }
   * ]
   */
  private buildCategoryTree(categories: any[]): CategoryWithChildren[] {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map of all categories with empty children arrays
    // This allows O(1) lookup when linking parents and children
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree structure by linking children to parents
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;

      if (cat.parent_category_id) {
        // Has a parent - try to find it and add as child
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children.push(category);
        } else {
          // Parent not found (orphaned) - treat as root
          rootCategories.push(category);
        }
      } else {
        // No parent - this is a root category
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  /**
   * Updates an existing category with partial field updates
   *
   * Supports partial updates - only provided fields are updated.
   * Undefined fields are ignored, allowing selective updates.
   *
   * You can change:
   * - name (must not be empty)
   * - description
   * - parent_category_id (move to different parent or root)
   * - display_order (change sort position)
   * - is_active (soft delete/activate)
   *
   * The updated_at timestamp is automatically set to current time.
   *
   * **Important:** Moving a category to a new parent does NOT validate
   * against circular references (e.g., making a category its own ancestor).
   * The database will accept this but may cause infinite loops in tree traversal.
   *
   * @async
   * @param {string} id - UUID of the category to update
   * @param {UpdateCategoryRequest} data - Fields to update (partial)
   * @param {string} [data.name] - Update category name
   * @param {string} [data.description] - Update description
   * @param {string} [data.parent_category_id] - Move to new parent (or null for root)
   * @param {number} [data.display_order] - Update sort order
   * @param {boolean} [data.is_active] - Activate/deactivate
   * @returns {Promise<Category>} The updated category
   * @throws {AppError} 404 - If category is not found
   * @throws {AppError} 400 - If name is empty or no fields to update
   *
   * @example
   * // Update only name
   * const category = await categoryService.updateCategory('category-uuid', {
   *   name: 'Consumer Electronics'
   * });
   *
   * @example
   * // Move category to different parent
   * const category = await categoryService.updateCategory('category-uuid', {
   *   parent_category_id: 'new-parent-uuid',
   *   display_order: 5
   * });
   *
   * @example
   * // Deactivate category (soft delete)
   * const category = await categoryService.updateCategory('category-uuid', {
   *   is_active: false
   * });
   */
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic update query based on provided fields
    if (data.name !== undefined) {
      if (data.name.trim() === '') {
        throw new AppError(400, 'INVALID_INPUT', 'Category name cannot be empty');
      }
      updates.push(`name = $${paramCount++}`);
      values.push(data.name.trim());
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (data.parent_category_id !== undefined) {
      updates.push(`parent_category_id = $${paramCount++}`);
      values.push(data.parent_category_id);
    }

    if (data.display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(data.display_order);
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    // Validate at least one field is being updated
    if (updates.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'No fields to update');
    }

    // Always update the timestamp
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    return result.rows[0];
  }

  /**
   * Soft deletes a category with validation
   *
   * This is a soft delete - the category is marked as inactive (is_active = false)
   * rather than being physically removed from the database.
   *
   * **Validation rules (prevents deletion if):**
   * 1. Category has active products assigned to it
   * 2. Category has active subcategories (children)
   *
   * These rules ensure data integrity and prevent orphaning of products
   * or subcategories. To delete a category, you must first:
   * - Move or delete all products in the category
   * - Move or delete all child categories
   *
   * The category's historical data (transaction history, etc.) remains intact.
   *
   * **Note:** This method does not return the updated category. To verify
   * the deletion, use getCategoryById() afterward (it will still exist with
   * is_active=false).
   *
   * @async
   * @param {string} id - UUID of the category to delete
   * @returns {Promise<void>}
   * @throws {AppError} 400 - If category has active products or subcategories
   * @throws {AppError} 404 - If category is not found
   *
   * @example
   * // Soft delete a category (must be empty)
   * await categoryService.deleteCategory('category-uuid');
   * // Category now has is_active = false, but record still exists
   *
   * @example
   * // Attempting to delete category with products (will fail)
   * try {
   *   await categoryService.deleteCategory('category-uuid');
   * } catch (error) {
   *   // Error: Cannot delete category with active products
   * }
   *
   * @example
   * // Reactivate a deleted category
   * await categoryService.deleteCategory('category-uuid');  // Soft delete
   * await categoryService.updateCategory('category-uuid', { is_active: true });  // Reactivate
   */
  async deleteCategory(id: string): Promise<void> {
    // Check if category has active products
    // Prevents orphaning products without a category
    const productCheckQuery = `
      SELECT COUNT(*) as count
      FROM products
      WHERE category_id = $1 AND is_active = true
    `;

    const productCheckResult = await pool.query(productCheckQuery, [id]);
    const productCount = parseInt(productCheckResult.rows[0].count);

    if (productCount > 0) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot delete category with active products');
    }

    // Check if category has active children (subcategories)
    // Prevents orphaning child categories
    const childrenCheckQuery = `
      SELECT id
      FROM categories
      WHERE parent_category_id = $1 AND is_active = true
    `;

    const childrenCheckResult = await pool.query(childrenCheckQuery, [id]);

    if (childrenCheckResult.rowCount && childrenCheckResult.rowCount > 0) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot delete category with subcategories');
    }

    // Soft delete - set is_active to false
    // Record remains in database for historical reference
    const deleteQuery = `
      UPDATE categories
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }
  }
}

/**
 * Singleton instance of CategoryService
 *
 * Import and use this instance rather than creating new instances:
 * @example
 * import { categoryService } from '../services/category.service';
 * const tree = await categoryService.getCategories(true);
 */
export const categoryService = new CategoryService();
