/**
 * Inventory Reports API Service
 *
 * API methods for fetching inventory reports (Phase 3C)
 */

import { apiClient } from './api.client';
import {
  LowStockProduct,
  OutOfStockProduct,
  InventoryValuation,
  MovementReportItem,
  CategorySummary,
  MovementReportFilters,
} from '../../types/inventory-reports.types';
import { ApiResponse } from '../../types/api.types';

/**
 * Get low stock products report
 */
export const getLowStockReport = async (): Promise<LowStockProduct[]> => {
  const response = await apiClient.get<ApiResponse<LowStockProduct[]>>(
    '/inventory/reports/low-stock'
  );
  return response.data.data || [];
};

/**
 * Get out of stock products report
 */
export const getOutOfStockReport = async (): Promise<OutOfStockProduct[]> => {
  const response = await apiClient.get<ApiResponse<OutOfStockProduct[]>>(
    '/inventory/reports/out-of-stock'
  );
  return response.data.data || [];
};

/**
 * Get inventory valuation report
 */
export const getValuationReport = async (): Promise<InventoryValuation> => {
  const response = await apiClient.get<ApiResponse<InventoryValuation>>(
    '/inventory/reports/valuation'
  );
  return response.data.data!;
};

/**
 * Get inventory movement report
 */
export const getMovementReport = async (
  filters: MovementReportFilters
): Promise<MovementReportItem[]> => {
  const response = await apiClient.get<ApiResponse<MovementReportItem[]>>(
    '/inventory/reports/movement',
    {
      params: {
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    }
  );
  return response.data.data || [];
};

/**
 * Get category summary report
 */
export const getCategorySummary = async (): Promise<CategorySummary[]> => {
  const response = await apiClient.get<ApiResponse<CategorySummary[]>>(
    '/inventory/reports/category-summary'
  );
  return response.data.data || [];
};
