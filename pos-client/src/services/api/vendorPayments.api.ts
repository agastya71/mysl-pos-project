import { apiClient } from './api.client';
import type { VPListQuery, VPListResult, VendorPayment } from '../../types/vendorPayments.types';
import type { SimpleVendor } from '../../types/accountsPayable.types';

export async function getVendorPayments(query: VPListQuery = {}): Promise<VPListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/vendor-payments', { params });
  return response.data.data;
}

export async function approvePayment(id: string): Promise<VendorPayment> {
  const response = await apiClient.post(`/vendor-payments/${id}/approve`);
  return response.data.data;
}

export async function voidPayment(id: string, reason: string): Promise<VendorPayment> {
  const response = await apiClient.post(`/vendor-payments/${id}/void`, { reason });
  return response.data.data;
}

export async function getVPVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  return response.data.data as SimpleVendor[];
}
