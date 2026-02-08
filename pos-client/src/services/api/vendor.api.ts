/**
 * Vendor API Service
 * Frontend client methods for vendor CRUD operations
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';

export interface Vendor {
  id: string;
  vendor_number: string;
  vendor_type: 'supplier' | 'distributor' | 'manufacturer';
  business_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  payment_terms: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRequest {
  vendor_type: 'supplier' | 'distributor' | 'manufacturer';
  business_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  payment_terms?: string;
  tax_id?: string;
  notes?: string;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}

/**
 * Get all vendors (optionally filter by active status)
 */
export async function getVendors(activeOnly?: boolean): Promise<Vendor[]> {
  const url = activeOnly ? '/vendors?active_only=true' : '/vendors';
  const response = await apiClient.get<ApiResponse<Vendor[]>>(url);
  return response.data.data!;
}

/**
 * Get vendor by ID
 */
export async function getVendorById(id: string): Promise<Vendor> {
  const response = await apiClient.get<ApiResponse<Vendor>>(`/vendors/${id}`);
  return response.data.data!;
}

/**
 * Create new vendor
 */
export async function createVendor(data: CreateVendorRequest): Promise<Vendor> {
  const response = await apiClient.post<ApiResponse<Vendor>>('/vendors', data);
  return response.data.data!;
}

/**
 * Update vendor
 */
export async function updateVendor(
  id: string,
  data: UpdateVendorRequest
): Promise<Vendor> {
  const response = await apiClient.put<ApiResponse<Vendor>>(
    `/vendors/${id}`,
    data
  );
  return response.data.data!;
}

/**
 * Delete vendor (soft delete)
 */
export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete(`/vendors/${id}`);
}
