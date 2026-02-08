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

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[];
  product_count: number;
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
