/**
 * @fileoverview Category Type Definitions - Hierarchical category data structures
 *
 * Defines category entity, tree structures, and create/update request types.
 * Supports hierarchical parent-child relationships for product organization.
 *
 * @module types/category.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 3A)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Category entity
 *
 * Category record from database with hierarchical support.
 * Auto-generated category_number (CAT-XXXXXX). Supports parent-child relationships
 * via parent_category_id for nested category structures.
 *
 * @interface Category
 * @property {string} id - UUID primary key
 * @property {string} category_number - Auto-generated (CAT-000001, CAT-000002, ...)
 * @property {string} name - Category name (required, max 100 chars, unique)
 * @property {string} [description] - Optional description (max 500 chars)
 * @property {string} [parent_category_id] - Foreign key to parent category (null for root categories)
 * @property {number} display_order - Display order for sorting (default: 0)
 * @property {boolean} is_active - Whether category is active
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 *
 * @example
 * const category: Category = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   category_number: "CAT-000042",
 *   name: "Electronics",
 *   description: "Electronic devices and accessories",
 *   parent_category_id: null, // Root category
 *   display_order: 1,
 *   is_active: true,
 *   created_at: "2024-01-15T10:30:00Z",
 *   updated_at: "2024-01-15T10:30:00Z"
 * };
 *
 * @example
 * // Child category
 * const subcategory: Category = {
 *   id: "789e4567-e89b-12d3-a456-426614174001",
 *   category_number: "CAT-000043",
 *   name: "Smartphones",
 *   description: "Mobile phones and accessories",
 *   parent_category_id: "123e4567-e89b-12d3-a456-426614174000", // Parent is Electronics
 *   display_order: 1,
 *   is_active: true,
 *   created_at: "2024-01-15T10:35:00Z",
 *   updated_at: "2024-01-15T10:35:00Z"
 * };
 */
export interface Category {
  id: string;
  category_number: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Category with children (tree structure)
 *
 * Extended category type with nested children array for hierarchical tree display.
 * Built server-side via buildCategoryTree() algorithm. Includes product_count for each node.
 * Supports infinite nesting depth (recursive structure).
 *
 * @interface CategoryWithChildren
 * @extends Category
 * @property {CategoryWithChildren[]} children - Array of child categories (recursive)
 * @property {number} product_count - Count of products directly assigned to this category
 *
 * @example
 * const tree: CategoryWithChildren = {
 *   id: "123",
 *   category_number: "CAT-000001",
 *   name: "Electronics",
 *   description: "Electronic devices",
 *   parent_category_id: null,
 *   display_order: 1,
 *   is_active: true,
 *   created_at: "2024-01-15T10:30:00Z",
 *   updated_at: "2024-01-15T10:30:00Z",
 *   product_count: 5,
 *   children: [
 *     {
 *       id: "456",
 *       category_number: "CAT-000002",
 *       name: "Smartphones",
 *       parent_category_id: "123",
 *       display_order: 1,
 *       is_active: true,
 *       product_count: 12,
 *       children: []
 *     }
 *   ]
 * };
 */
export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  product_count: number;
}

/**
 * Create category request
 *
 * Request body for POST /api/v1/categories endpoint.
 * Only name is required; parent_category_id optional for creating subcategories.
 *
 * @interface CreateCategoryRequest
 * @property {string} name - Category name (required, max 100 chars, must be unique)
 * @property {string} [description] - Optional description (max 500 chars)
 * @property {string} [parent_category_id] - Parent category UUID (null for root category)
 * @property {number} [display_order] - Display order for sorting (default: 0)
 *
 * @example
 * const request: CreateCategoryRequest = {
 *   name: "Laptops",
 *   description: "Laptop computers and accessories",
 *   parent_category_id: "123e4567-e89b-12d3-a456-426614174000", // Electronics
 *   display_order: 2
 * };
 */
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
}

/**
 * Update category request
 *
 * Request body for PUT /api/v1/categories/:id endpoint.
 * All fields optional - only provide fields to update.
 *
 * @interface UpdateCategoryRequest
 * @property {string} [name] - Category name (max 100 chars, must be unique)
 * @property {string} [description] - Description (max 500 chars)
 * @property {string} [parent_category_id] - Parent category UUID (set to null to make root)
 * @property {number} [display_order] - Display order for sorting
 * @property {boolean} [is_active] - Whether category is active
 *
 * @example
 * const update: UpdateCategoryRequest = {
 *   name: "Mobile Phones",
 *   description: "Updated description for mobile phones category",
 *   display_order: 5
 * };
 */
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
  is_active?: boolean;
}
