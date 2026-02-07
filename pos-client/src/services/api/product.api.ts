import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import { Product, ProductListQuery, ProductListResponse } from '../../types/product.types';

export const productApi = {
  searchProducts: async (query: string, limit: number = 20): Promise<ProductListResponse> => {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/products', {
      params: { search: query, limit, is_active: true },
    });
    return response.data.data!;
  },

  getProducts: async (filters: ProductListQuery): Promise<ProductListResponse> => {
    const response = await apiClient.get<ApiResponse<ProductListResponse>>('/products', {
      params: filters,
    });
    return response.data.data!;
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  },
};
