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

const voidTransactionSchema = z.object({
  reason: z.string().min(1, 'Void reason is required').max(500),
});

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

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

export default new TransactionController();
