/**
 * Purchase Order API Service
 * Frontend client methods for all PO endpoints
 */

import { apiClient } from './api.client';
import { ApiResponse, PaginatedResponse } from '../../types/api.types';
import {
  PurchaseOrderWithDetails,
  CreatePORequest,
  UpdatePORequest,
  ReceiveItemsRequest,
  POListQuery,
  ReorderSuggestionsByVendor,
  Vendor,
} from '../../types/purchaseOrder.types';

const BASE_URL = '/purchase-orders';

/**
 * Creates a new purchase order
 */
export async function createPO(
  data: CreatePORequest
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    BASE_URL,
    data
  );
  return response.data.data!;
}

/**
 * Retrieves paginated list of purchase orders with filters
 */
export async function getPOs(
  query: POListQuery = {}
): Promise<PaginatedResponse<PurchaseOrderWithDetails>> {
  const params = new URLSearchParams();

  if (query.vendor_id) params.append('vendor_id', query.vendor_id);
  if (query.status) params.append('status', query.status);
  if (query.order_type) params.append('order_type', query.order_type);
  if (query.start_date) params.append('start_date', query.start_date);
  if (query.end_date) params.append('end_date', query.end_date);
  if (query.search) params.append('search', query.search);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  const response = await apiClient.get<
    ApiResponse<PaginatedResponse<PurchaseOrderWithDetails>>
  >(url);

  return response.data.data!;
}

/**
 * Retrieves purchase order by ID with full details
 */
export async function getPOById(
  id: string
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.get<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}`
  );
  return response.data.data!;
}

/**
 * Updates a draft purchase order
 */
export async function updatePO(
  id: string,
  data: UpdatePORequest
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.put<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}`,
    data
  );
  return response.data.data!;
}

/**
 * Deletes a draft purchase order
 */
export async function deletePO(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}

/**
 * Submits draft PO for approval
 */
export async function submitPO(
  id: string
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}/submit`
  );
  return response.data.data!;
}

/**
 * Approves submitted PO
 */
export async function approvePO(
  id: string
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}/approve`
  );
  return response.data.data!;
}

/**
 * Records received quantities for items
 */
export async function receiveItems(
  id: string,
  data: ReceiveItemsRequest
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}/receive`,
    data
  );
  return response.data.data!;
}

/**
 * Cancels purchase order with reason
 */
export async function cancelPO(
  id: string,
  reason: string
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}/cancel`,
    { reason }
  );
  return response.data.data!;
}

/**
 * Closes a received purchase order
 */
export async function closePO(
  id: string
): Promise<PurchaseOrderWithDetails> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderWithDetails>>(
    `${BASE_URL}/${id}/close`
  );
  return response.data.data!;
}

/**
 * Retrieves reorder suggestions grouped by vendor
 */
export async function getReorderSuggestions(): Promise<
  ReorderSuggestionsByVendor[]
> {
  const response = await apiClient.get<
    ApiResponse<ReorderSuggestionsByVendor[]>
  >(`${BASE_URL}/reorder-suggestions`);
  return response.data.data!;
}

/**
 * Retrieves list of active vendors
 */
export async function getVendors(): Promise<Vendor[]> {
  const response = await apiClient.get<ApiResponse<Vendor[]>>('/vendors');
  return response.data.data!;
}
