/**
 * Category Service
 *
 * Business logic for managing product categories
 */

import { pool } from '../config/database';
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryWithChildren,
} from '../types/category.types';
import { AppError } from '../middleware/error.middleware';

export class CategoryService {
  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
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

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get category by ID with children and product count
   */
  async getCategoryById(id: string): Promise<CategoryWithChildren> {
    // Get category with product count
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

    // Get children with their product counts
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
        children: [], // Direct children only for now
      })),
    };
  }

  /**
   * Get all categories in tree structure
   */
  async getCategories(activeOnly?: boolean): Promise<CategoryWithChildren[]> {
    // Get all categories with product counts
    let query = `
      SELECT
        c.*,
        COUNT(p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    `;

    const values: any[] = [];

    if (activeOnly !== undefined) {
      query += ` WHERE c.is_active = $1`;
      values.push(activeOnly);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.display_order, c.name
    `;

    const result = await pool.query(query, values);
    const categories = result.rows.map((row) => ({
      ...row,
      product_count: parseInt(row.product_count || '0'),
    }));

    // Build tree structure
    return this.buildCategoryTree(categories);
  }

  /**
   * Helper function to build category tree
   */
  private buildCategoryTree(categories: any[]): CategoryWithChildren[] {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map of all categories
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children.push(category);
        } else {
          // Parent not found, treat as root
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  /**
   * Update category
   */
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

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

    if (updates.length === 0) {
      throw new AppError(400, 'INVALID_INPUT', 'No fields to update');
    }

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
   * Delete category (soft delete)
   */
  async deleteCategory(id: string): Promise<void> {
    // Check if category has products
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

    // Check if category has children
    const childrenCheckQuery = `
      SELECT id
      FROM categories
      WHERE parent_category_id = $1 AND is_active = true
    `;

    const childrenCheckResult = await pool.query(childrenCheckQuery, [id]);

    if (childrenCheckResult.rowCount && childrenCheckResult.rowCount > 0) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot delete category with subcategories');
    }

    // Soft delete
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
