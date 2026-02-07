import { apiClient } from './api.client';

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  base_price: number;
  cost_price?: number;
  tax_rate: number;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  vendor_id?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id?: string;
  base_price: number;
  cost_price?: number;
  tax_rate?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  vendor_id?: string;
  image_url?: string;
}

export interface UpdateProductRequest {
  sku?: string;
  barcode?: string;
  name?: string;
  description?: string;
  category_id?: string;
  base_price?: number;
  cost_price?: number;
  tax_rate?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  vendor_id?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'base_price' | 'quantity_in_stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const productService = {
  getProducts: async (query?: ProductListQuery): Promise<ProductListResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.category_id) params.append('category_id', query.category_id);
    if (query?.is_active !== undefined) params.append('is_active', query.is_active.toString());
    if (query?.sort_by) params.append('sort_by', query.sort_by);
    if (query?.sort_order) params.append('sort_order', query.sort_order);

    const response = await apiClient.get(`/products?${params.toString()}`);
    return response.data.data;
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },

  searchProducts: async (query: string, limit?: number): Promise<Product[]> => {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    const response = await apiClient.get(`/products/search?${params.toString()}`);
    return response.data.data;
  },

  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await apiClient.post('/products', data);
    return response.data.data;
  },

  updateProduct: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/categories');
    return response.data.data;
  },
};
