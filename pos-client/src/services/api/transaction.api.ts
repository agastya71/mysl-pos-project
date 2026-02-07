import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  Transaction,
  TransactionWithDetails,
  CreateTransactionRequest,
} from '../../types/transaction.types';

export const transactionApi = {
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
