/**
 * Inventory API Service
 *
 * API methods for inventory adjustments
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  InventoryAdjustment,
  CreateAdjustmentRequest,
  GetAdjustmentsQuery,
  InventoryAdjustmentsResponse,
} from '../../types/inventory.types';

const BASE_URL = '/inventory';

export const inventoryApi = {
  /**
   * Create a new inventory adjustment
   */
  createAdjustment: async (
    data: CreateAdjustmentRequest
  ): Promise<InventoryAdjustment> => {
    const response = await apiClient.post<ApiResponse<InventoryAdjustment>>(
      `${BASE_URL}/adjustments`,
      data
    );
    return response.data.data!;
  },

  /**
   * Get all adjustments with filters and pagination
   */
  getAdjustments: async (
    query?: GetAdjustmentsQuery
  ): Promise<InventoryAdjustmentsResponse> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustmentsResponse>>(
      `${BASE_URL}/adjustments`,
      { params: query }
    );
    return response.data.data!;
  },

  /**
   * Get adjustment by ID
   */
  getAdjustmentById: async (id: string): Promise<InventoryAdjustment> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustment>>(
      `${BASE_URL}/adjustments/${id}`
    );
    return response.data.data!;
  },

  /**
   * Get adjustment history for a product
   */
  getProductHistory: async (productId: string): Promise<InventoryAdjustment[]> => {
    const response = await apiClient.get<ApiResponse<InventoryAdjustment[]>>(
      `${BASE_URL}/products/${productId}/history`
    );
    return response.data.data || [];
  },
};
