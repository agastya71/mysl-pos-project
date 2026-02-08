/**
 * @fileoverview Transaction Controller - HTTP request handlers for transaction management
 *
 * This controller handles all transaction-related API endpoints:
 * - POST /api/v1/transactions - Create new transaction (checkout)
 * - GET /api/v1/transactions - List transactions with filters and pagination
 * - GET /api/v1/transactions/:id - Get transaction details by ID
 * - PUT /api/v1/transactions/:id/void - Void transaction with reason
 *
 * Features:
 * - Multi-item transaction support with product snapshots
 * - Split payment (multiple payment methods per transaction)
 * - Automatic inventory deduction via database trigger
 * - Transaction number auto-generation (TXN-XXXXXX)
 * - Complete transaction history with filters (date range, status, cashier, customer, terminal)
 * - Void transaction with reason tracking and inventory restoration
 *
 * Transaction Flow:
 * 1. User adds items to cart (frontend state)
 * 2. User initiates checkout with payment(s)
 * 3. Frontend calls POST /api/v1/transactions with items and payments
 * 4. Backend validates, creates transaction atomically
 * 5. Database trigger `update_inventory_on_transaction` deducts inventory
 * 6. Frontend displays receipt with transaction_number
 *
 * Validation:
 * - All requests validated with Zod schemas
 * - Transaction must have at least 1 item and 1 payment
 * - Payment total must equal transaction total (validated in service layer)
 * - Product snapshots stored in JSONB for historical accuracy
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - Cashier ID extracted from req.user.userId (JWT payload)
 * - User must have 'cashier' or 'manager' role
 *
 * @module controllers/transaction
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/transaction.service - Transaction business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { ApiResponse } from '../types/api.types';
import {
  Transaction,
  TransactionWithDetails,
  TransactionListResponse,
  CreateTransactionRequest,
  TransactionListQuery,
  VoidTransactionRequest,
} from '../types/transaction.types';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

/**
 * Zod validation schema for transaction creation
 *
 * Validates request body for POST /api/v1/transactions.
 * Ensures transaction has required structure with items and payments.
 *
 * Required fields:
 * - terminal_id: UUID of POS terminal
 * - items: Array of at least 1 item (product_id, quantity, optional discount)
 * - payments: Array of at least 1 payment (method, amount, optional details)
 *
 * Optional fields:
 * - customer_id: UUID if transaction linked to customer
 *
 * Payment methods: 'cash', 'credit_card', 'debit_card', 'check'
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Valid request body
 * {
 *   terminal_id: 'terminal-uuid',
 *   customer_id: 'customer-uuid',
 *   items: [
 *     {
 *       product_id: 'product-uuid',
 *       quantity: 2,
 *       discount_amount: 5.00
 *     }
 *   ],
 *   payments: [
 *     {
 *       payment_method: 'cash',
 *       amount: 45.00,
 *       payment_details: {
 *         cash_received: 50.00
 *       }
 *     }
 *   ]
 * }
 */
const createTransactionSchema = z.object({
  terminal_id: z.string().uuid('Invalid terminal ID'),
  customer_id: z.string().uuid('Invalid customer ID').optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        discount_amount: z.number().min(0, 'Discount amount must be positive').optional(),
      })
    )
    .min(1, 'Transaction must have at least one item'),
  payments: z
    .array(
      z.object({
        payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'check'], {
          errorMap: () => ({ message: 'Invalid payment method' }),
        }),
        amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
        payment_details: z
          .object({
            cash_received: z.number().min(0).optional(),
            card_last_four: z.string().length(4).optional(),
            card_type: z.string().optional(),
            card_holder_name: z.string().optional(),
            check_number: z.string().optional(),
          })
          .optional(),
      })
    )
    .min(1, 'Transaction must have at least one payment'),
});

/**
 * Zod validation schema for transaction list query parameters
 *
 * Validates query parameters for GET /api/v1/transactions.
 * All parameters are optional (defaults applied in service layer).
 *
 * Filtering:
 * - status: Filter by transaction status (draft, completed, voided, refunded)
 * - terminal_id: Filter by POS terminal
 * - cashier_id: Filter by cashier user
 * - customer_id: Filter by customer
 * - start_date: Date range start (YYYY-MM-DD format)
 * - end_date: Date range end (YYYY-MM-DD format)
 *
 * Pagination:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 *
 * Sorting:
 * - sort_by: Field to sort by (transaction_date, total_amount, transaction_number)
 * - sort_order: Sort direction (asc, desc) - default: desc
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Filter completed transactions for specific cashier in date range
 * GET /api/v1/transactions?status=completed&cashier_id=user-uuid&start_date=2026-02-01&end_date=2026-02-08&page=1&limit=20
 */
const listTransactionsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  status: z.enum(['draft', 'completed', 'voided', 'refunded']).optional(),
  terminal_id: z.string().uuid().optional(),
  cashier_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort_by: z.enum(['transaction_date', 'total_amount', 'transaction_number']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

/**
 * Zod validation schema for void transaction request
 *
 * Validates request body for PUT /api/v1/transactions/:id/void.
 * Requires reason for audit trail.
 *
 * Required fields:
 * - reason: Explanation for voiding (1-500 characters)
 *
 * Common reasons: "Customer request", "Pricing error", "Wrong items", "Payment issue"
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Valid void request
 * {
 *   reason: "Customer requested refund - wrong product scanned"
 * }
 */
const voidTransactionSchema = z.object({
  reason: z.string().min(1, 'Void reason is required').max(500),
});

/**
 * Transaction Controller Class
 *
 * Handles HTTP requests for transaction management with 4 endpoints:
 * - createTransaction: Create new transaction (checkout flow)
 * - getTransactionById: Retrieve transaction details by ID
 * - getTransactions: List transactions with filters and pagination
 * - voidTransaction: Void transaction with reason
 *
 * All methods are async and throw AppError on validation/business logic failures.
 * Errors are caught by global error middleware.
 *
 * @class TransactionController
 */
export class TransactionController {
  private transactionService: TransactionService;

  /**
   * Initialize TransactionController with TransactionService instance
   *
   * @constructor
   */
  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Create new transaction (checkout flow)
   *
   * HTTP: POST /api/v1/transactions
   *
   * Creates complete transaction with items and payments in single atomic operation.
   * Validates payment total equals transaction total, deducts inventory via database
   * trigger, generates transaction_number (TXN-XXXXXX), stores product snapshots.
   *
   * Transaction creation flow:
   * 1. Validate request body (items, payments, IDs)
   * 2. Extract cashier_id from JWT token (req.user.userId)
   * 3. Calculate line totals (qty × price - discount + tax)
   * 4. Validate payment total matches transaction total
   * 5. Insert transaction, items, payments atomically (ACID)
   * 6. Database trigger deducts inventory for each item
   * 7. Return full transaction with details (items, payments, totals)
   *
   * @async
   * @param {Request<{}, {}, CreateTransactionRequest>} req - Express request with transaction data in body
   * @param {Response<ApiResponse<TransactionWithDetails>>} res - Express response with created transaction
   * @returns {Promise<void>} Sends 201 Created with transaction details
   * @throws {AppError} 400 if validation fails (invalid UUIDs, missing items/payments, negative values)
   * @throws {AppError} 400 if payment total doesn't match transaction total
   * @throws {AppError} 404 if product, terminal, or customer not found
   * @throws {AppError} 409 if insufficient inventory for any item
   *
   * @example
   * // Request body
   * POST /api/v1/transactions
   * {
   *   terminal_id: 'terminal-uuid',
   *   customer_id: 'customer-uuid',
   *   items: [
   *     { product_id: 'prod-1', quantity: 2, discount_amount: 5.00 },
   *     { product_id: 'prod-2', quantity: 1 }
   *   ],
   *   payments: [
   *     {
   *       payment_method: 'cash',
   *       amount: 50.00,
   *       payment_details: { cash_received: 60.00 }
   *     }
   *   ]
   * }
   *
   * @example
   * // Response (201 Created)
   * {
   *   success: true,
   *   message: "Transaction created successfully",
   *   data: {
   *     id: "txn-uuid",
   *     transaction_number: "TXN-000123",
   *     transaction_date: "2026-02-08T10:30:00Z",
   *     status: "completed",
   *     subtotal: "45.00",
   *     tax_amount: "4.50",
   *     discount_amount: "5.00",
   *     total_amount: "44.50",
   *     items: [...],
   *     payments: [...],
   *     cashier_name: "John Doe",
   *     customer_name: "Jane Smith"
   *   }
   * }
   *
   * @see TransactionService.createTransaction for business logic implementation
   * @see database trigger `update_inventory_on_transaction` for automatic inventory deduction
   */
  async createTransaction(
    req: Request<{}, {}, CreateTransactionRequest>,
    res: Response<ApiResponse<TransactionWithDetails>>
  ) {
    const validation = createTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    // Get cashier_id from authenticated user
    const cashier_id = req.user!.userId;

    const transaction = await this.transactionService.createTransaction(cashier_id, validation.data as any);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  }

  /**
   * Get transaction details by ID
   *
   * HTTP: GET /api/v1/transactions/:id
   *
   * Retrieves complete transaction details including items with product snapshots,
   * payments with details, cashier name, customer name, and all calculated totals.
   *
   * Returns full transaction history including:
   * - Transaction metadata (number, date, status, cashier, customer, terminal)
   * - Line items with product snapshots (name, price at time of sale, quantity, discount, tax)
   * - Payments with method and details (cash received, card info, check number)
   * - Calculated totals (subtotal, tax_amount, discount_amount, total_amount)
   * - Void information if voided (voided_by, void_reason, void_date)
   *
   * @async
   * @param {Request<{ id: string }>} req - Express request with transaction ID in params
   * @param {Response<ApiResponse<TransactionWithDetails>>} res - Express response with transaction details
   * @returns {Promise<void>} Sends 200 OK with transaction details
   * @throws {AppError} 400 if transaction ID is not a valid UUID
   * @throws {AppError} 404 if transaction not found
   *
   * @example
   * // Request
   * GET /api/v1/transactions/txn-uuid
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     id: "txn-uuid",
   *     transaction_number: "TXN-000123",
   *     transaction_date: "2026-02-08T10:30:00Z",
   *     status: "completed",
   *     cashier_id: "user-uuid",
   *     cashier_name: "John Doe",
   *     customer_id: "cust-uuid",
   *     customer_name: "Jane Smith",
   *     terminal_id: "term-uuid",
   *     subtotal: "45.00",
   *     tax_amount: "4.50",
   *     discount_amount: "5.00",
   *     total_amount: "44.50",
   *     items: [
   *       {
   *         id: "item-uuid",
   *         product_id: "prod-uuid",
   *         product_snapshot: {
   *           name: "Widget",
   *           sku: "WDG-001",
   *           base_price: "25.00"
   *         },
   *         quantity: 2,
   *         unit_price: "25.00",
   *         discount_amount: "5.00",
   *         tax_amount: "4.50",
   *         line_total: "44.50"
   *       }
   *     ],
   *     payments: [
   *       {
   *         id: "pay-uuid",
   *         payment_method: "cash",
   *         amount: "50.00",
   *         payment_details: { cash_received: "60.00" }
   *       }
   *     ],
   *     created_at: "2026-02-08T10:30:00Z",
   *     updated_at: "2026-02-08T10:30:00Z"
   *   }
   * }
   *
   * @see TransactionService.getTransactionById for implementation
   */
  async getTransactionById(
    req: Request<{ id: string }>,
    res: Response<ApiResponse<TransactionWithDetails>>
  ) {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid transaction ID');
    }

    const transaction = await this.transactionService.getTransactionById(id);

    res.status(200).json({
      success: true,
      data: transaction,
    });
  }

  /**
   * List transactions with filters and pagination
   *
   * HTTP: GET /api/v1/transactions
   *
   * Retrieves paginated list of transactions with optional filtering and sorting.
   * Used for transaction history page with search and filter controls.
   *
   * Available filters:
   * - status: Filter by status (draft, completed, voided, refunded)
   * - terminal_id: Filter by POS terminal
   * - cashier_id: Filter by cashier user
   * - customer_id: Filter by customer
   * - start_date: Date range start (YYYY-MM-DD)
   * - end_date: Date range end (YYYY-MM-DD)
   *
   * Pagination:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   *
   * Sorting:
   * - sort_by: Field to sort by (transaction_date, total_amount, transaction_number)
   * - sort_order: Sort direction (asc, desc) - default: desc (newest first)
   *
   * Returns summary information for each transaction (not full details).
   * Use GET /api/v1/transactions/:id to get full details for specific transaction.
   *
   * @async
   * @param {Request<{}, {}, {}, TransactionListQuery>} req - Express request with query parameters
   * @param {Response<ApiResponse<TransactionListResponse>>} res - Express response with transaction list and pagination
   * @returns {Promise<void>} Sends 200 OK with transaction list and pagination metadata
   * @throws {AppError} 400 if query parameters invalid (invalid UUIDs, dates, or enum values)
   *
   * @example
   * // Request with filters
   * GET /api/v1/transactions?status=completed&start_date=2026-02-01&end_date=2026-02-08&page=1&limit=20&sort_by=transaction_date&sort_order=desc
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     transactions: [
   *       {
   *         id: "txn-uuid",
   *         transaction_number: "TXN-000123",
   *         transaction_date: "2026-02-08T10:30:00Z",
   *         status: "completed",
   *         cashier_name: "John Doe",
   *         customer_name: "Jane Smith",
   *         total_amount: "44.50",
   *         item_count: 2
   *       }
   *     ],
   *     pagination: {
   *       page: 1,
   *       limit: 20,
   *       total: 156,
   *       totalPages: 8
   *     }
   *   }
   * }
   *
   * @see TransactionService.getTransactions for implementation with SQL query building
   */
  async getTransactions(
    req: Request<{}, {}, {}, TransactionListQuery>,
    res: Response<ApiResponse<TransactionListResponse>>
  ) {
    const validation = listTransactionsSchema.safeParse(req.query);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', validation.error.errors);
    }

    const result = await this.transactionService.getTransactions(validation.data);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  /**
   * Void transaction with reason
   *
   * HTTP: PUT /api/v1/transactions/:id/void
   *
   * Voids completed transaction by setting status to 'voided' and recording
   * void reason, void_date, and voided_by user. Automatically restores inventory
   * via database trigger `restore_inventory_on_void`.
   *
   * Validation rules:
   * - Transaction must exist and have status 'completed'
   * - Cannot void already voided or refunded transactions
   * - Void reason required for audit trail (1-500 characters)
   *
   * Void process:
   * 1. Validate transaction exists and is 'completed'
   * 2. Update transaction: status='voided', void_reason, voided_by, void_date
   * 3. Database trigger restores inventory for all items
   * 4. Return updated transaction
   *
   * Common void reasons:
   * - "Customer request" - Customer changed mind
   * - "Pricing error" - Incorrect price charged
   * - "Wrong items" - Wrong products scanned
   * - "Payment issue" - Payment failed or reversed
   * - "Duplicate transaction" - Transaction created twice
   *
   * @async
   * @param {Request<{ id: string }, {}, VoidTransactionRequest>} req - Express request with transaction ID in params and reason in body
   * @param {Response<ApiResponse<Transaction>>} res - Express response with voided transaction
   * @returns {Promise<void>} Sends 200 OK with voided transaction
   * @throws {AppError} 400 if transaction ID invalid or reason missing/too long
   * @throws {AppError} 404 if transaction not found
   * @throws {AppError} 409 if transaction already voided or refunded
   *
   * @example
   * // Request
   * PUT /api/v1/transactions/txn-uuid/void
   * {
   *   reason: "Customer requested refund - wrong product scanned"
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   message: "Transaction voided successfully",
   *   data: {
   *     id: "txn-uuid",
   *     transaction_number: "TXN-000123",
   *     status: "voided",
   *     void_reason: "Customer requested refund - wrong product scanned",
   *     voided_by: "user-uuid",
   *     void_date: "2026-02-08T11:00:00Z",
   *     total_amount: "44.50"
   *   }
   * }
   *
   * @see TransactionService.voidTransaction for business logic implementation
   * @see database trigger `restore_inventory_on_void` for automatic inventory restoration
   */
  async voidTransaction(
    req: Request<{ id: string }, {}, VoidTransactionRequest>,
    res: Response<ApiResponse<Transaction>>
  ) {
    const { id } = req.params;

    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid transaction ID');
    }

    const validation = voidTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const user_id = req.user!.userId;
    const transaction = await this.transactionService.voidTransaction(id, user_id, validation.data as any);

    res.status(200).json({
      success: true,
      message: 'Transaction voided successfully',
      data: transaction,
    });
  }
}

/**
 * Export singleton instance for use in routes
 *
 * Routes import this default export and call methods directly:
 * - router.post('/', controller.createTransaction.bind(controller))
 * - router.get('/', controller.getTransactions.bind(controller))
 * - router.get('/:id', controller.getTransactionById.bind(controller))
 * - router.put('/:id/void', controller.voidTransaction.bind(controller))
 *
 * @constant
 * @type {TransactionController}
 *
 * @see ../routes/transaction.routes.ts for route definitions
 */
export default new TransactionController();
