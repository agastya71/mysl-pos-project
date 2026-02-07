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
