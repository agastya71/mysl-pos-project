import { apiClient } from './api.client';
import type { APListQuery, APListResult, SimpleVendor } from '../../types/accountsPayable.types';

export async function getAPInvoices(query: APListQuery = {}): Promise<APListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/accounts-payable', { params });
  return response.data.data;
}

export async function getAPVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  // GET /vendors returns { success: true, data: Vendor[] } — data is a plain array
  return response.data.data as SimpleVendor[];
}
