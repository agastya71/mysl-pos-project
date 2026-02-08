/**
 * Inventory Types
 *
 * Frontend types for inventory adjustments
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
  adjustment_date: string;
  created_at: string;
  // Joined fields
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

export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InventoryAdjustmentsResponse {
  data: InventoryAdjustment[];
  pagination: InventoryPagination;
}
