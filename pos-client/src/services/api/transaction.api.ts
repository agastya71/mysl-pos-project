/**
 * @fileoverview Transaction API Service - Frontend API client for transaction operations
 *
 * This service provides API methods for transaction operations:
 * - getTransactions: List transactions with filters and pagination
 * - createTransaction: Create new transaction (checkout)
 * - getTransactionById: Get complete transaction details
 * - voidTransaction: Void transaction with reason
 *
 * Transaction Flow (Checkout):
 * 1. User adds items to cart (local Redux state)
 * 2. User initiates checkout and provides payment
 * 3. Frontend calls createTransaction with items and payments
 * 4. Backend creates transaction atomically (items, payments, totals)
 * 5. Database trigger deducts inventory automatically
 * 6. Frontend displays receipt with transaction_number
 * 7. Cart cleared for next transaction
 *
 * @module services/api/transaction
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/api.types - API response types
 * @requires ../../types/transaction.types - Transaction types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  Transaction,
  TransactionWithDetails,
  CreateTransactionRequest,
  TransactionListQuery,
  TransactionListResponse,
} from '../../types/transaction.types';

/**
 * Transaction API Service
 *
 * Provides methods for transaction operations (create, list, void).
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - getTransactions: List transactions with filters and pagination
 * - createTransaction: Create new transaction (POS checkout)
 * - getTransactionById: Get complete transaction details
 * - voidTransaction: Void transaction with reason
 *
 * Usage in Redux:
 * - Called from checkout.slice.ts and transactions.slice.ts
 * - Responses stored in Redux state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const transactionApi = {
  /**
   * List transactions with filters and pagination
   *
   * HTTP: GET /api/v1/transactions (with query parameters)
   *
   * Retrieves paginated transaction list with optional filtering.
   * Used for transaction history page.
   *
   * Available filters (TransactionListQuery):
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   * - status: Filter by status (draft, completed, voided, refunded)
   * - start_date: Date range start (YYYY-MM-DD)
   * - end_date: Date range end (YYYY-MM-DD)
   * - cashier_id: Filter by cashier user
   * - terminal_id: Filter by POS terminal
   * - transaction_number: Search by transaction number
   *
   * Returns:
   * - transactions: Array of transaction summary objects
   * - pagination: Page metadata (page, limit, total, totalPages)
   *
   * @async
   * @function getTransactions
   * @param {TransactionListQuery} [query={}] - Filter and pagination parameters
   * @returns {Promise<TransactionListResponse>} Transaction list with pagination
   * @throws {Error} If request fails
   *
   * @example
   * // Get all transactions
   * const result = await transactionApi.getTransactions();
   *
   * @example
   * // Filter by date range and status
   * const result = await transactionApi.getTransactions({
   *   start_date: '2026-02-01',
   *   end_date: '2026-02-08',
   *   status: 'completed',
   *   page: 1,
   *   limit: 20
   * });
   *
   * @see TransactionListQuery type for available filters
   * @see transactions.slice.ts for Redux integration
   */
  getTransactions: async (query: TransactionListQuery = {}): Promise<TransactionListResponse> => {
    // Build query string manually for better control
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

  /**
   * Create new transaction (checkout)
   *
   * HTTP: POST /api/v1/transactions
   *
   * Creates complete transaction with items and payments atomically.
   * This is the core checkout operation in the POS system.
   *
   * Request data (CreateTransactionRequest):
   * - terminal_id: POS terminal UUID (required)
   * - customer_id: Customer UUID (optional, for customer transactions)
   * - items: Array of transaction items (product_id, quantity, discount)
   * - payments: Array of payments (method, amount, details)
   *
   * Backend processing:
   * 1. Validates payment total equals transaction total
   * 2. Creates transaction record (generates TXN-XXXXXX number)
   * 3. Creates transaction_items records with product snapshots
   * 4. Creates transaction_payments records
   * 5. Database trigger deducts inventory automatically
   * 6. Returns complete transaction with all details
   *
   * @async
   * @function createTransaction
   * @param {CreateTransactionRequest} data - Transaction data (items, payments, etc.)
   * @returns {Promise<TransactionWithDetails>} Created transaction with full details
   * @throws {Error} If validation fails or insufficient inventory
   *
   * @example
   * // Create transaction with cash payment
   * const transaction = await transactionApi.createTransaction({
   *   terminal_id: 'terminal-uuid',
   *   customer_id: 'customer-uuid',
   *   items: [
   *     { product_id: 'prod-uuid', quantity: 2, discount_amount: 5.00 }
   *   ],
   *   payments: [
   *     {
   *       payment_method: 'cash',
   *       amount: 50.00,
   *       payment_details: { cash_received: 60.00 }
   *     }
   *   ]
   * });
   * console.log('Transaction:', transaction.transaction_number);
   *
   * @see CreateTransactionRequest type for request structure
   * @see checkout.slice.ts for Redux integration
   */
  createTransaction: async (data: CreateTransactionRequest): Promise<TransactionWithDetails> => {
    const response = await apiClient.post<ApiResponse<TransactionWithDetails>>('/transactions', data);
    return response.data.data!;
  },

  /**
   * Get transaction details by ID
   *
   * HTTP: GET /api/v1/transactions/:id
   *
   * Retrieves complete transaction details including items, payments, and totals.
   * Used for transaction history detail view and receipt display.
   *
   * Returns (TransactionWithDetails):
   * - Transaction metadata (id, transaction_number, date, status, cashier, customer)
   * - Items array with product snapshots (name, price at time of sale, qty, discount, tax)
   * - Payments array with method and details
   * - Calculated totals (subtotal, tax_amount, discount_amount, total_amount)
   * - Void information if voided (voided_by, void_reason, void_date)
   *
   * @async
   * @function getTransactionById
   * @param {string} id - Transaction UUID
   * @returns {Promise<TransactionWithDetails>} Complete transaction details
   * @throws {Error} If transaction not found (404)
   *
   * @example
   * // Get transaction details
   * const transaction = await transactionApi.getTransactionById('txn-uuid');
   * console.log('Total:', transaction.total_amount);
   * console.log('Items:', transaction.items.length);
   *
   * @see TransactionWithDetails type for response structure
   * @see transactions.slice.ts for Redux integration
   */
  getTransactionById: async (id: string): Promise<TransactionWithDetails> => {
    const response = await apiClient.get<ApiResponse<TransactionWithDetails>>(`/transactions/${id}`);
    return response.data.data!;
  },

  /**
   * Void transaction with reason
   *
   * HTTP: PUT /api/v1/transactions/:id/void
   *
   * Voids completed transaction and automatically restores inventory.
   * Requires reason for audit trail.
   *
   * Void process:
   * 1. Validates transaction exists and is 'completed'
   * 2. Updates transaction status to 'voided'
   * 3. Records void reason, voided_by user, and void_date
   * 4. Database trigger restores inventory for all items
   * 5. Returns updated transaction
   *
   * Validation rules:
   * - Transaction must have status 'completed'
   * - Cannot void already voided or refunded transactions
   * - Void reason required (1-500 characters)
   *
   * @async
   * @function voidTransaction
   * @param {string} id - Transaction UUID to void
   * @param {string} reason - Void reason for audit trail
   * @returns {Promise<Transaction>} Voided transaction
   * @throws {Error} If transaction not found or already voided
   *
   * @example
   * // Void transaction
   * const voided = await transactionApi.voidTransaction(
   *   'txn-uuid',
   *   'Customer requested refund - wrong product'
   * );
   * console.log('Voided:', voided.void_reason);
   *
   * @see transactions.slice.ts for Redux integration
   */
  voidTransaction: async (id: string, reason: string): Promise<Transaction> => {
    const response = await apiClient.put<ApiResponse<Transaction>>(`/transactions/${id}/void`, {
      reason,
    });
    return response.data.data!;
  },
};
