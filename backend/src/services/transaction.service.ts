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

export class TransactionService {
  /**
   * Create and complete a transaction in one operation (MVP approach)
   * This method handles the entire transaction flow atomically
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

      // Generate transaction number
      const transactionNumberResult = await client.query(
        'SELECT generate_transaction_number($1) as transaction_number',
        [terminal_number]
      );
      const transaction_number = transactionNumberResult.rows[0].transaction_number;

      // Initialize transaction totals
      let subtotal = 0;
      let tax_amount = 0;
      let discount_amount = 0;

      // Create transaction record with status='draft'
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

      // Process each item
      for (const itemRequest of data.items) {
        // Fetch product
        const productResult = await client.query<Product>(
          'SELECT * FROM products WHERE id = $1 AND is_active = true',
          [itemRequest.product_id]
        );

        if (productResult.rowCount === 0) {
          throw new AppError(404, 'PRODUCT_NOT_FOUND', `Product ${itemRequest.product_id} not found or inactive`);
        }

        const product = productResult.rows[0];

        // Check stock availability
        if (product.quantity_in_stock < itemRequest.quantity) {
          throw new AppError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for product ${product.name}. Available: ${product.quantity_in_stock}, Requested: ${itemRequest.quantity}`
          );
        }

        // Create product snapshot
        const snapshot = await this.createProductSnapshot(product);

        // Calculate line totals
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

        // Accumulate totals
        subtotal += unit_price * itemRequest.quantity;
        tax_amount += lineTotals.tax_amount;
        discount_amount += item_discount;
      }

      const total_amount = subtotal + tax_amount - discount_amount;

      // Validate payments sum to total
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

        // Insert payment details if provided
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

      // Update transaction with totals and mark as completed
      await client.query(
        `UPDATE transactions
        SET subtotal = $1, tax_amount = $2, discount_amount = $3, total_amount = $4,
            status = $5, completed_at = NOW()
        WHERE id = $6
        RETURNING *`,
        [subtotal, tax_amount, discount_amount, total_amount, 'completed', transaction.id]
      );

      // Commit transaction (this triggers update_inventory_on_transaction)
      await client.query('COMMIT');

      logger.info('Transaction completed', {
        transactionId: transaction.id,
        transactionNumber: transaction_number,
        totalAmount: total_amount,
      });

      // Fetch and return complete transaction with details
      return await this.getTransactionById(transaction.id);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction creation failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction by ID with all items and payments
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
   * Get transactions with filtering and pagination
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

    // Build WHERE clause
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

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const total_pages = Math.ceil(total / limit);

    // Get transactions
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
   * Void a transaction and restore inventory
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
      if (transaction.status !== 'completed') {
        throw new AppError(
          400,
          'INVALID_TRANSACTION_STATUS',
          `Cannot void transaction with status: ${transaction.status}`
        );
      }

      // Get transaction items
      const itemsResult = await client.query(
        'SELECT * FROM transaction_items WHERE transaction_id = $1',
        [transaction_id]
      );

      // Restore inventory for each item
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update transaction status
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
      await client.query('ROLLBACK');
      logger.error('Transaction void failed', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a product snapshot from current product data
   */
  private async createProductSnapshot(product: Product): Promise<ProductSnapshot> {
    // Get category name if category_id exists
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
   * Calculate line totals with tax
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

    return {
      tax_amount: Math.round(tax_amount * 100) / 100,
      line_total: Math.round(line_total * 100) / 100,
    };
  }
}

export default new TransactionService();
