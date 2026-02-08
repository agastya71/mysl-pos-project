/**
 * Inventory Management Types
 *
 * Types for inventory adjustments and tracking
 */

export type AdjustmentType = 'damage' | 'theft' | 'found' | 'correction' | 'initial';

export interface InventoryAdjustment {
  id: string;
  adjustment_number: string;
  product_id: string;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  old_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string;
  adjusted_by: string;
  adjustment_date: Date;
  created_at: Date;
  // Joined fields from queries
  product_name?: string;
  product_sku?: string;
  adjuster_name?: string;
}

export interface CreateAdjustmentRequest {
  product_id: string;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  reason: string;
  notes?: string;
}

export interface GetAdjustmentsQuery {
  product_id?: string;
  adjustment_type?: AdjustmentType;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// Report Types

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
  last_sale_date?: Date;
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

export interface AdjustmentWithProduct extends InventoryAdjustment {
  product: {
    id: string;
    name: string;
    sku: string;
    current_quantity: number;
  };
}
