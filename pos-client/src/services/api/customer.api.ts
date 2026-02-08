import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
  CustomerListResponse,
  CustomerSearchResult,
} from '../../types/customer.types';

export const customerApi = {
  getCustomers: async (query: CustomerListQuery = {}): Promise<CustomerListResponse> => {
    const params = new URLSearchParams();

    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.is_active !== undefined) params.append('is_active', query.is_active.toString());

    const queryString = params.toString();
    const url = queryString ? `/customers?${queryString}` : '/customers';

    const response = await apiClient.get<ApiResponse<CustomerListResponse>>(url);
    return response.data.data!;
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data!;
  },

  createCustomer: async (data: CreateCustomerInput): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer>>('/customers', data);
    return response.data.data!;
  },

  updateCustomer: async (id: string, data: UpdateCustomerInput): Promise<Customer> => {
    const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return response.data.data!;
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  searchCustomers: async (query: string, limit?: number): Promise<CustomerSearchResult[]> => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<ApiResponse<CustomerSearchResult[]>>(
      `/customers/search?${params.toString()}`
    );
    return response.data.data!;
  },
};
