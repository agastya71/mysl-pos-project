/**
 * Inventory Report Types
 *
 * Types for Phase 3C inventory reporting features
 */

export interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  category_name?: string;
  stock_value: number;
}

export interface OutOfStockProduct {
  id: string;
  sku: string;
  name: string;
  reorder_quantity: number;
  category_name?: string;
  last_sale_date?: string;
}

export interface CategoryValuation {
  category_id: string;
  category_name: string;
  product_count: number;
  total_quantity: number;
  total_value: number;
}

export interface InventoryValuation {
  total_value: number;
  total_items: number;
  by_category: CategoryValuation[];
}

export interface MovementReportItem {
  product_id: string;
  sku: string;
  product_name: string;
  category_name?: string;
  opening_stock: number;
  sales_quantity: number;
  adjustment_quantity: number;
  closing_stock: number;
  net_change: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  product_count: number;
  total_quantity: number;
  total_value: number;
  average_value_per_item: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface MovementReportFilters {
  start_date: string;
  end_date: string;
}
