import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  Transaction,
  TransactionWithDetails,
  CreateTransactionRequest,
  TransactionListQuery,
  TransactionListResponse,
} from '../../types/transaction.types';

export const transactionApi = {
  getTransactions: async (query: TransactionListQuery = {}): Promise<TransactionListResponse> => {
    const params = new URLSearchParams();

    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.status) params.append('status', query.status);
    if (query.start_date) params.append('start_date', query.start_date);
    if (query.end_date) params.append('end_date', query.end_date);
    if (query.cashier_id) params.append('cashier_id', query.cashier_id);
    if (query.terminal_id) params.append('terminal_id', query.terminal_id);
    if (query.transaction_number) params.append('transaction_number', query.transaction_number);

    const queryString = params.toString();
    const url = queryString ? `/transactions?${queryString}` : '/transactions';

    const response = await apiClient.get<ApiResponse<TransactionListResponse>>(url);
    return response.data.data!;
  },

  createTransaction: async (data: CreateTransactionRequest): Promise<TransactionWithDetails> => {
    const response = await apiClient.post<ApiResponse<TransactionWithDetails>>('/transactions', data);
    return response.data.data!;
  },

  getTransactionById: async (id: string): Promise<TransactionWithDetails> => {
    const response = await apiClient.get<ApiResponse<TransactionWithDetails>>(`/transactions/${id}`);
    return response.data.data!;
  },

  voidTransaction: async (id: string, reason: string): Promise<Transaction> => {
    const response = await apiClient.put<ApiResponse<Transaction>>(`/transactions/${id}/void`, {
      reason,
    });
    return response.data.data!;
  },
};
