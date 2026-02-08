/**
 * Category Types
 *
 * Types for product categorization with hierarchical support
 */

export interface Category {
  id: string;
  category_number: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  parent_category_id?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  product_count: number;
}

export interface CategoryTreeNode {
  id: string;
  category_number: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  product_count: number;
  children: CategoryTreeNode[];
}
