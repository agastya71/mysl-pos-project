import { apiClient } from './api.client';
import {
  Category,
  CategoryWithChildren,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../types/category.types';
import { ApiResponse } from '../../types/api.types';

const BASE_URL = '/categories';

export const categoryApi = {
  // Get all categories (tree structure)
  getCategories: async (activeOnly?: boolean): Promise<CategoryWithChildren[]> => {
    const params = activeOnly !== undefined ? { active_only: activeOnly } : {};
    const response = await apiClient.get<ApiResponse<CategoryWithChildren[]>>(
      BASE_URL,
      { params }
    );
    return response.data.data || [];
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<CategoryWithChildren> => {
    const response = await apiClient.get<ApiResponse<CategoryWithChildren>>(
      `${BASE_URL}/${id}`
    );
    if (!response.data.data) {
      throw new Error('Category not found');
    }
    return response.data.data;
  },

  // Create category
  createCategory: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(BASE_URL, data);
    if (!response.data.data) {
      throw new Error('Failed to create category');
    }
    return response.data.data;
  },

  // Update category
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

  // Delete category
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};
