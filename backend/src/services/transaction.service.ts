/**
 * @fileoverview Transaction Service - Manages point-of-sale transactions
 *
 * This service handles the complete transaction lifecycle including:
 * - Transaction creation with items and payments (atomic operation)
 * - Transaction retrieval with full details (items, payments, relationships)
 * - Transaction voiding with automatic inventory restoration
 * - Product snapshots for historical accuracy
 * - Tax and discount calculations
 *
 * All transaction operations are transactional (ACID compliant) and include
 * automatic inventory management via database triggers. The service follows
 * the MVP approach where transactions are created and completed in a single
 * atomic operation (no draft → complete workflow).
 *
 * @module services/transaction
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-15 (Phase 1B)
 */

import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  Transaction,
  TransactionItem,
  TransactionWithDetails,
  CreateTransactionRequest,
  TransactionListQuery,
  TransactionListResponse,
  ProductSnapshot,
  VoidTransactionRequest,
} from '../types/transaction.types';
import { Product } from '../types/product.types';
import logger from '../utils/logger';

/**
 * TransactionService - Handles all transaction-related business logic
 *
 * This class provides methods for creating, retrieving, and voiding transactions.
 * All operations use database transactions to ensure ACID compliance. Inventory
 * is automatically managed via database triggers.
 *
 * @class TransactionService
 */
export class TransactionService {
  /**
   * Creates and completes a transaction in one atomic operation
   *
   * This method implements the MVP transaction flow where transactions are
   * created and completed in a single operation (no draft state). The method:
   *
   * 1. Validates transaction data (items, payments, terminal)
   * 2. Generates unique transaction number based on terminal
   * 3. Creates transaction record with status='draft'
   * 4. For each item:
   *    - Validates product exists and has sufficient stock
   *    - Creates product snapshot for historical accuracy
   *    - Calculates line totals with tax and discounts
   *    - Inserts transaction item
   * 5. Validates payment sum matches total amount
   * 6. Inserts payment records with optional payment details
   * 7. Updates transaction with totals and status='completed'
   * 8. Commits transaction (triggers inventory deduction)
   *
   * The entire operation is wrapped in a database transaction. If any step fails,
   * all changes are rolled back and inventory is not affected.
   *
   * **Database Triggers:**
   * - `update_inventory_on_transaction` automatically deducts inventory when
   *   transaction is committed
   *
   * **Important:** Payment sum must exactly match total_amount (within $0.01 tolerance)
   *
   * @async
   * @param {string} cashier_id - UUID of the cashier creating the transaction
   * @param {CreateTransactionRequest} data - Transaction details
   * @param {string} data.terminal_id - UUID of the terminal
   * @param {string} [data.customer_id] - Optional UUID of the customer
   * @param {Array} data.items - Array of items being purchased
   * @param {string} data.items[].product_id - UUID of the product
   * @param {number} data.items[].quantity - Quantity being purchased
   * @param {number} [data.items[].discount_amount=0] - Line item discount
   * @param {Array} data.payments - Array of payment records
   * @param {string} data.payments[].payment_method - Payment method (cash, card, check)
   * @param {number} data.payments[].amount - Payment amount
   * @param {Object} [data.payments[].payment_details] - Optional payment details (cash_received, card info, etc.)
   * @returns {Promise<TransactionWithDetails>} Complete transaction with items and payments
   * @throws {AppError} 400 - If validation fails (no items, insufficient stock, payment mismatch)
   * @throws {AppError} 404 - If terminal or product not found
   *
   * @example
   * // Create a simple cash transaction
   * const transaction = await transactionService.createTransaction(
   *   'cashier-uuid',
   *   {
   *     terminal_id: 'terminal-uuid',
   *     items: [
   *       { product_id: 'product-1-uuid', quantity: 2 },
   *       { product_id: 'product-2-uuid', quantity: 1, discount_amount: 5.00 }
   *     ],
   *     payments: [
   *       {
   *         payment_method: 'cash',
   *         amount: 47.50,
   *         payment_details: {
   *           cash_received: 50.00
   *           // cash_change will be calculated automatically
   *         }
   *       }
   *     ]
   *   }
   * );
   *
   * @example
   * // Create a transaction with customer and multiple payments
   * const transaction = await transactionService.createTransaction(
   *   'cashier-uuid',
   *   {
   *     terminal_id: 'terminal-uuid',
   *     customer_id: 'customer-uuid',
   *     items: [
   *       { product_id: 'product-uuid', quantity: 10 }
   *     ],
   *     payments: [
   *       { payment_method: 'card', amount: 80.00 },
   *       { payment_method: 'cash', amount: 20.00 }
   *     ]
   *   }
   * );
   */
  async createTransaction(
    cashier_id: string,
    data: CreateTransactionRequest
  ): Promise<TransactionWithDetails> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate items exist
      if (!data.items || data.items.length === 0) {
        throw new AppError(400, 'INVALID_TRANSACTION', 'Transaction must have at least one item');
      }

      // Get terminal number for transaction number generation
      const terminalResult = await client.query(
        'SELECT terminal_number FROM terminals WHERE id = $1',
        [data.terminal_id]
      );

      if (terminalResult.rowCount === 0) {
        throw new AppError(404, 'TERMINAL_NOT_FOUND', 'Terminal not found');
      }

      const terminal_number = terminalResult.rows[0].terminal_number;

      // Generate transaction number using database function
      // Format: T{terminal_number}-{sequence} (e.g., T001-000123)
      const transactionNumberResult = await client.query(
        'SELECT generate_transaction_number($1) as transaction_number',
        [terminal_number]
      );
      const transaction_number = transactionNumberResult.rows[0].transaction_number;

      // Initialize transaction totals (will be calculated as items are added)
      let subtotal = 0;
      let tax_amount = 0;
      let discount_amount = 0;

      // Create transaction record with status='draft'
      // Will be updated to 'completed' after all items and payments are added
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          transaction_number, terminal_id, cashier_id, customer_id,
          subtotal, tax_amount, discount_amount, total_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          transaction_number,
          data.terminal_id,
          cashier_id,
          data.customer_id || null,
          0, // Will be updated after items are added
          0,
          0,
          0,
          'draft',
        ]
      );

      const transaction: Transaction = transactionResult.rows[0];
      const items: TransactionItem[] = [];

      // Process each item in the transaction
      for (const itemRequest of data.items) {
        // Fetch product to get current price, tax rate, and stock
        const productResult = await client.query<Product>(
          'SELECT * FROM products WHERE id = $1 AND is_active = true',
          [itemRequest.product_id]
        );

        if (productResult.rowCount === 0) {
          throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${itemRequest.product_id} not found or inactive`);
        }

        const product = productResult.rows[0];

        // Check stock availability - prevent overselling
        if (product.quantity_in_stock < itemRequest.quantity) {
          throw new AppError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for product ${product.name}. Available: ${product.quantity_in_stock}, Requested: ${itemRequest.quantity}`
          );
        }

        // Create product snapshot for historical accuracy
        // Stores product details at time of sale (price, name, etc.)
        const snapshot = await this.createProductSnapshot(product);

        // Calculate line totals including tax and discount
        const unit_price = product.base_price;
        const item_discount = itemRequest.discount_amount || 0;
        const lineTotals = this.calculateLineTotal(
          itemRequest.quantity,
          unit_price,
          item_discount,
          product.tax_rate
        );

        // Insert transaction item
        const itemResult = await client.query<TransactionItem>(
          `INSERT INTO transaction_items (
            transaction_id, product_id, product_snapshot, quantity,
            unit_price, discount_amount, tax_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            transaction.id,
            itemRequest.product_id,
            JSON.stringify(snapshot),
            itemRequest.quantity,
            unit_price,
            item_discount,
            lineTotals.tax_amount,
            lineTotals.line_total,
          ]
        );

        items.push(itemResult.rows[0]);

        // Accumulate transaction totals
        subtotal += unit_price * itemRequest.quantity;
        tax_amount += lineTotals.tax_amount;
        discount_amount += item_discount;
      }

      const total_amount = subtotal + tax_amount - discount_amount;

      // Validate payments sum to total (allow $0.01 tolerance for rounding)
      const payment_sum = data.payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(payment_sum - total_amount) > 0.01) {
        throw new AppError(
          400,
          'INVALID_PAYMENT_AMOUNT',
          `Payment amount ($${payment_sum.toFixed(2)}) does not match total ($${total_amount.toFixed(2)})`
        );
      }

      // Insert payment records
      const payments = [];
      for (const paymentRequest of data.payments) {
        const paymentResult = await client.query(
          `INSERT INTO payments (
            transaction_id, payment_method, amount, status, completed_at
          ) VALUES ($1, $2, $3, $4, NOW())
          RETURNING *`,
          [transaction.id, paymentRequest.payment_method, paymentRequest.amount, 'completed']
        );

        const payment = paymentResult.rows[0];

        // Insert payment details if provided (cash change, card info, etc.)
        if (paymentRequest.payment_details) {
          const details = paymentRequest.payment_details;
          await client.query(
            `INSERT INTO payment_details (
              payment_id, cash_received, cash_change, card_type, card_last_four, check_number
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              payment.id,
              details.cash_received || null,
              details.cash_received ? details.cash_received - paymentRequest.amount : null,
              details.card_type || null,
              details.card_last_four || null,
              details.check_number || null,
            ]
          );
        }

        payments.push(payment);
      }

      // Update transaction with final totals and mark as completed
      await client.query(
        `UPDATE transactions
        SET subtotal = $1, tax_amount = $2, discount_amount = $3, total_amount = $4,
            status = $5, completed_at = NOW()
        WHERE id = $6
        RETURNING *`,
        [subtotal, tax_amount, discount_amount, total_amount, 'completed', transaction.id]
      );

      // Commit transaction
      // This triggers 'update_inventory_on_transaction' which automatically
      // deducts inventory for all transaction items
      await client.query('COMMIT');

      logger.info('Transaction completed', {
        transactionId: transaction.id,
        transactionNumber: transaction_number,
        totalAmount: total_amount,
      });

      // Fetch and return complete transaction with all details
      return await this.getTransactionById(transaction.id);
    } catch (error) {
      // Rollback on any error - no inventory will be deducted
      await client.query('ROLLBACK');
      logger.error('Transaction creation failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a single transaction by ID with complete details
   *
   * Returns the transaction along with:
   * - All transaction items with product snapshots
   * - All payments with payment details (cash change, card info, etc.)
   * - Cashier name
   * - Customer name (if associated)
   * - Terminal name
   *
   * Uses JSON aggregation to combine related records into nested objects,
   * providing a complete view of the transaction in a single query.
   *
   * @async
   * @param {string} id - UUID of the transaction
   * @returns {Promise<TransactionWithDetails>} Complete transaction with all related data
   * @throws {AppError} 404 - If transaction is not found
   *
   * @example
   * const transaction = await transactionService.getTransactionById('transaction-uuid');
   * console.log(transaction.transaction_number); // "T001-000123"
   * console.log(transaction.items); // Array of transaction items
   * console.log(transaction.payments); // Array of payments
   * console.log(transaction.cashier_name); // "admin"
   */
  async getTransactionById(id: string): Promise<TransactionWithDetails> {
    const result = await pool.query(
      `SELECT
        t.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', ti.id,
          'transaction_id', ti.transaction_id,
          'product_id', ti.product_id,
          'product_snapshot', ti.product_snapshot,
          'quantity', ti.quantity,
          'unit_price', ti.unit_price,
          'discount_amount', ti.discount_amount,
          'tax_amount', ti.tax_amount,
          'line_total', ti.line_total,
          'created_at', ti.created_at
        )) FILTER (WHERE ti.id IS NOT NULL) as items,
        json_agg(DISTINCT jsonb_build_object(
          'id', p.id,
          'transaction_id', p.transaction_id,
          'payment_method', p.payment_method,
          'amount', p.amount,
          'status', p.status,
          'payment_processor', p.payment_processor,
          'processor_transaction_id', p.processor_transaction_id,
          'payment_date', p.payment_date,
          'completed_at', p.completed_at,
          'created_at', p.created_at,
          'details', jsonb_build_object(
            'id', pd.id,
            'payment_id', pd.payment_id,
            'cash_received', pd.cash_received,
            'cash_change', pd.cash_change,
            'card_type', pd.card_type,
            'card_last_four', pd.card_last_four,
            'check_number', pd.check_number,
            'authorization_code', pd.authorization_code,
            'created_at', pd.created_at
          )
        )) FILTER (WHERE p.id IS NOT NULL) as payments,
        u.username as cashier_name,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        ter.terminal_name as terminal_name
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      LEFT JOIN payments p ON p.transaction_id = t.id
      LEFT JOIN payment_details pd ON pd.payment_id = p.id
      LEFT JOIN users u ON u.id = t.cashier_id
      LEFT JOIN customers c ON c.id = t.customer_id
      LEFT JOIN terminals ter ON ter.id = t.terminal_id
      WHERE t.id = $1
      GROUP BY t.id, u.username, c.first_name, c.last_name, ter.terminal_name`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }

    return result.rows[0];
  }

  /**
   * Retrieves paginated list of transactions with optional filters
   *
   * Supports filtering by:
   * - Status (completed, voided, refunded, draft)
   * - Terminal ID
   * - Cashier ID
   * - Customer ID
   * - Date range (start_date and/or end_date)
   *
   * Supports sorting by any transaction field with ascending or descending order.
   * Results are paginated with configurable page size.
   *
   * @async
   * @param {TransactionListQuery} query - Filter and pagination parameters
   * @param {number} [query.page=1] - Page number (1-indexed)
   * @param {number} [query.limit=20] - Items per page
   * @param {string} [query.status] - Filter by transaction status
   * @param {string} [query.terminal_id] - Filter by terminal UUID
   * @param {string} [query.cashier_id] - Filter by cashier UUID
   * @param {string} [query.customer_id] - Filter by customer UUID
   * @param {string} [query.start_date] - Filter transactions on or after this date
   * @param {string} [query.end_date] - Filter transactions on or before this date
   * @param {string} [query.sort_by='transaction_date'] - Field to sort by
   * @param {string} [query.sort_order='desc'] - Sort order ('asc' or 'desc')
   * @returns {Promise<TransactionListResponse>} Paginated transactions with metadata
   *
   * @example
   * // Get first page of all transactions
   * const result = await transactionService.getTransactions({ page: 1, limit: 20 });
   *
   * @example
   * // Get completed transactions for a specific terminal today
   * const result = await transactionService.getTransactions({
   *   status: 'completed',
   *   terminal_id: 'terminal-uuid',
   *   start_date: '2026-02-08',
   *   end_date: '2026-02-08',
   *   sort_by: 'created_at',
   *   sort_order: 'desc'
   * });
   */
  async getTransactions(query: TransactionListQuery): Promise<TransactionListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = query.sort_by || 'transaction_date';
    const sortOrder = query.sort_order || 'desc';

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause based on provided filters
    if (query.status) {
      whereConditions.push(`t.status = $${paramIndex}`);
      queryParams.push(query.status);
      paramIndex++;
    }

    if (query.terminal_id) {
      whereConditions.push(`t.terminal_id = $${paramIndex}`);
      queryParams.push(query.terminal_id);
      paramIndex++;
    }

    if (query.cashier_id) {
      whereConditions.push(`t.cashier_id = $${paramIndex}`);
      queryParams.push(query.cashier_id);
      paramIndex++;
    }

    if (query.customer_id) {
      whereConditions.push(`t.customer_id = $${paramIndex}`);
      queryParams.push(query.customer_id);
      paramIndex++;
    }

    if (query.start_date) {
      whereConditions.push(`t.transaction_date >= $${paramIndex}`);
      queryParams.push(query.start_date);
      paramIndex++;
    }

    if (query.end_date) {
      whereConditions.push(`t.transaction_date <= $${paramIndex}`);
      queryParams.push(query.end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const total_pages = Math.ceil(total / limit);

    // Get paginated transactions
    queryParams.push(limit, offset);
    const result = await pool.query(
      `SELECT t.*
      FROM transactions t
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  /**
   * Voids a completed transaction and restores inventory
   *
   * Voiding a transaction:
   * 1. Validates transaction exists and status is 'completed'
   * 2. Restores inventory for all transaction items (adds quantities back)
   * 3. Updates transaction status to 'voided'
   * 4. Records void metadata (voided_by, voided_at, void_reason)
   *
   * The entire operation is transactional. If any step fails, no changes
   * are made and inventory remains unchanged.
   *
   * **Important:** Only transactions with status='completed' can be voided.
   * Draft, voided, or refunded transactions cannot be voided again.
   *
   * **Note:** This does NOT reverse payments. Payment reversal should be
   * handled separately through payment processor APIs if needed.
   *
   * @async
   * @param {string} transaction_id - UUID of the transaction to void
   * @param {string} user_id - UUID of the user voiding the transaction
   * @param {VoidTransactionRequest} request - Void details
   * @param {string} request.reason - Required reason for voiding
   * @returns {Promise<Transaction>} The voided transaction
   * @throws {AppError} 404 - If transaction is not found
   * @throws {AppError} 400 - If transaction status is not 'completed'
   *
   * @example
   * const voidedTransaction = await transactionService.voidTransaction(
   *   'transaction-uuid',
   *   'user-uuid',
   *   { reason: 'Customer requested refund - duplicate charge' }
   * );
   * console.log(voidedTransaction.status); // "voided"
   * console.log(voidedTransaction.void_reason); // "Customer requested refund..."
   */
  async voidTransaction(
    transaction_id: string,
    user_id: string,
    request: VoidTransactionRequest
  ): Promise<Transaction> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get transaction
      const transactionResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transaction_id]
      );

      if (transactionResult.rowCount === 0) {
        throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
      }

      const transaction = transactionResult.rows[0];

      // Validate transaction can be voided
      // Only completed transactions can be voided
      if (transaction.status !== 'completed') {
        throw new AppError(
          400,
          'INVALID_TRANSACTION_STATUS',
          `Cannot void transaction with status: ${transaction.status}`
        );
      }

      // Get all transaction items
      const itemsResult = await client.query(
        'SELECT * FROM transaction_items WHERE transaction_id = $1',
        [transaction_id]
      );

      // Restore inventory for each item
      // Adds back the quantities that were deducted during transaction
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update transaction status to voided and record metadata
      const voidedResult = await client.query(
        `UPDATE transactions
        SET status = $1, voided_at = NOW(), voided_by = $2, void_reason = $3
        WHERE id = $4
        RETURNING *`,
        ['voided', user_id, request.reason, transaction_id]
      );

      await client.query('COMMIT');

      logger.info('Transaction voided', {
        transactionId: transaction_id,
        voidedBy: user_id,
        reason: request.reason,
      });

      return voidedResult.rows[0];
    } catch (error) {
      // Rollback on error - inventory remains unchanged
      await client.query('ROLLBACK');
      logger.error('Transaction void failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates a product snapshot from current product data
   *
   * Captures the current state of a product at the time of sale for historical
   * accuracy. This ensures that even if product details change later (price,
   * name, category), the transaction record preserves what was sold.
   *
   * The snapshot includes:
   * - SKU (product identifier)
   * - Name (as displayed at time of sale)
   * - Base price (price at time of sale)
   * - Tax rate (tax rate at time of sale)
   * - Category name (if product has category)
   * - Description
   *
   * Stored as JSONB in transaction_items.product_snapshot.
   *
   * @private
   * @async
   * @param {Product} product - The product to snapshot
   * @returns {Promise<ProductSnapshot>} Product snapshot object
   *
   * @example
   * const snapshot = await this.createProductSnapshot(product);
   * // Returns: { sku: "PROD-001", name: "Product", base_price: 19.99, ... }
   */
  private async createProductSnapshot(product: Product): Promise<ProductSnapshot> {
    // Get category name if category_id exists
    // Uses separate query to avoid complex joins in main transaction flow
    let category_name: string | undefined;
    if (product.category_id) {
      const categoryResult = await pool.query(
        'SELECT name FROM categories WHERE id = $1',
        [product.category_id]
      );
      if (categoryResult.rowCount && categoryResult.rowCount > 0) {
        category_name = categoryResult.rows[0].name;
      }
    }

    return {
      sku: product.sku,
      name: product.name,
      base_price: product.base_price,
      tax_rate: product.tax_rate,
      category_name,
      description: product.description,
    };
  }

  /**
   * Calculates line item totals with tax and discount
   *
   * Formula:
   * 1. subtotal = (quantity * unit_price) - discount
   * 2. tax_amount = subtotal * (tax_rate / 100)
   * 3. line_total = subtotal + tax_amount
   *
   * All amounts are rounded to 2 decimal places for currency precision.
   *
   * @private
   * @param {number} quantity - Number of items
   * @param {number} unit_price - Price per item
   * @param {number} discount - Total discount for this line (not per item)
   * @param {number} tax_rate - Tax rate as percentage (e.g., 8.5 for 8.5%)
   * @returns {{ tax_amount: number; line_total: number }} Calculated tax and total
   *
   * @example
   * const totals = this.calculateLineTotal(3, 10.00, 5.00, 8.5);
   * // quantity: 3, price: $10.00, discount: $5.00, tax: 8.5%
   * // subtotal = 30.00 - 5.00 = 25.00
   * // tax = 25.00 * 0.085 = 2.13
   * // total = 25.00 + 2.13 = 27.13
   * // Returns: { tax_amount: 2.13, line_total: 27.13 }
   */
  private calculateLineTotal(
    quantity: number,
    unit_price: number,
    discount: number,
    tax_rate: number
  ): { tax_amount: number; line_total: number } {
    const subtotal = quantity * unit_price - discount;
    const tax_amount = subtotal * (tax_rate / 100);
    const line_total = subtotal + tax_amount;

    // Round to 2 decimal places for currency precision
    return {
      tax_amount: Math.round(tax_amount * 100) / 100,
      line_total: Math.round(line_total * 100) / 100,
    };
  }
}

/**
 * Singleton instance of TransactionService
 *
 * Import and use this instance rather than creating new instances:
 * @example
 * import transactionService from '../services/transaction.service';
 * const transaction = await transactionService.createTransaction(cashierId, data);
 */
export default new TransactionService();
