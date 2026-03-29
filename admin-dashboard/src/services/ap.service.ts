import { apiClient } from './api.client';
import type {
  APListQuery, APListResult, APInvoice, APInvoiceWithDetails,
  CreateAPInput, UpdateAPInput, SimpleVendor,
} from '../types/accountsPayable.types';

export async function fetchAPEntries(query: APListQuery = {}): Promise<APListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/accounts-payable', { params });
  return response.data.data;
}

export async function fetchAPEntry(id: string): Promise<APInvoiceWithDetails> {
  const response = await apiClient.get(`/accounts-payable/${id}`);
  return response.data.data;
}

export async function createAPEntry(data: CreateAPInput): Promise<APInvoice> {
  const response = await apiClient.post('/accounts-payable', data);
  return response.data.data;
}

export async function updateAPEntry(id: string, data: UpdateAPInput): Promise<APInvoice> {
  const response = await apiClient.put(`/accounts-payable/${id}`, data);
  return response.data.data;
}

export async function fetchAPServiceVendors(): Promise<SimpleVendor[]> {
  const response = await apiClient.get('/vendors', { params: { limit: 500 } });
  return response.data.data as SimpleVendor[];
}
