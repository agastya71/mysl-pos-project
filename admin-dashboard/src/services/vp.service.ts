import { apiClient } from './api.client';
import type {
  VPListQuery, VPListResult, VendorPayment, VendorPaymentWithAllocations,
  CreatePaymentInput, UpdatePaymentInput, BatchPaymentInput,
} from '../types/vendorPayments.types';

export async function fetchVendorPayments(query: VPListQuery = {}): Promise<VPListResult> {
  const params = new URLSearchParams();
  if (query.vendor_id) params.set('vendor_id', query.vendor_id);
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const response = await apiClient.get('/vendor-payments', { params });
  return response.data.data;
}

export async function fetchVendorPayment(id: string): Promise<VendorPaymentWithAllocations> {
  const response = await apiClient.get(`/vendor-payments/${id}`);
  return response.data.data;
}

export async function createPayment(data: CreatePaymentInput): Promise<VendorPayment> {
  const response = await apiClient.post('/vendor-payments', data);
  return response.data.data;
}

export async function createBatchPayment(data: BatchPaymentInput): Promise<VendorPayment[]> {
  const response = await apiClient.post('/vendor-payments/batch', data);
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

export async function updatePayment(id: string, data: UpdatePaymentInput): Promise<VendorPayment> {
  const response = await apiClient.put(`/vendor-payments/${id}`, data);
  return response.data.data;
}
