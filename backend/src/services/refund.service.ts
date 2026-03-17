/**
 * Refund Service
 *
 * Handles post-settlement refunds for completed transactions.
 * Distinct from same-day voids: refunds go through the Square Refunds API
 * and take 2-7 business days to settle.
 *
 * All DB writes are wrapped in a single BEGIN/COMMIT/ROLLBACK.
 */

import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { PaymentProcessorService } from './payment-processor.service';
import logger from '../utils/logger';

const paymentProcessorService = new PaymentProcessorService();

export interface RefundResult {
  refund_id: string;
  transaction_id: string;
  amount: number;
  reason: string;
  status: string;
  refunded_at: string;
}

export class RefundService {
  /**
   * Refund a completed transaction (full or partial).
   *
   * Steps:
   *  1. Fetch transaction; validate status = 'completed'
   *  2. Validate refund_amount ≤ original total
   *  3. For each card payment, call processor.refundPayment()
   *  4. Insert row into `refunds`
   *  5. Update `payments.status` → 'refunded'
   *  6. Update `transactions.status` → 'refunded' | 'partially_refunded'
   *  7. Restore inventory quantities
   *  8. Commit — all in one DB transaction
   */
  async refundTransaction(
    transactionId: string,
    refundAmount: number,
    reason: string,
    userId: string
  ): Promise<RefundResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch transaction
      const txnResult = await client.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transactionId]
      );
      if (txnResult.rowCount === 0) {
        throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
      }
      const txn = txnResult.rows[0];

      if (txn.status !== 'completed') {
        throw new AppError(
          400,
          'INVALID_TRANSACTION_STATUS',
          `Cannot refund transaction with status: ${txn.status}`
        );
      }

      // 2. Validate amount
      const originalTotal = parseFloat(txn.total_amount);
      if (refundAmount > originalTotal + 0.01) {
        throw new AppError(
          400,
          'REFUND_AMOUNT_EXCEEDED',
          `Refund amount ($${refundAmount.toFixed(2)}) exceeds transaction total ($${originalTotal.toFixed(2)})`
        );
      }

      // 3. For each card payment, call processor refund
      const paymentsResult = await client.query(
        `SELECT * FROM payments WHERE transaction_id = $1 AND payment_method IN ('credit_card', 'debit_card')`,
        [transactionId]
      );

      for (const payment of paymentsResult.rows) {
        if (payment.processor_transaction_id && payment.payment_processor) {
          const refundResult = await paymentProcessorService.refundPayment(
            payment.processor_transaction_id,
            refundAmount,
            payment.payment_processor
          );
          if (!refundResult.success) {
            logger.warn('Processor refund failed, continuing with DB refund record', {
              paymentId: payment.id,
              error: refundResult.error,
            });
          }
        }
      }

      // 4. Insert refund record
      const refundResult = await client.query(
        `INSERT INTO refunds (
          transaction_id, refunded_by, amount, reason, status, refunded_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *`,
        [transactionId, userId, refundAmount, reason, 'completed']
      );
      const refund = refundResult.rows[0];

      // 5. Update payments status
      await client.query(
        `UPDATE payments SET status = 'refunded' WHERE transaction_id = $1`,
        [transactionId]
      );

      // 6. Update transaction status
      const isPartial = refundAmount < originalTotal - 0.01;
      const newStatus = isPartial ? 'partially_refunded' : 'refunded';
      await client.query(
        `UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, transactionId]
      );

      // 7. Restore inventory
      const itemsResult = await client.query(
        'SELECT * FROM transaction_items WHERE transaction_id = $1',
        [transactionId]
      );
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');

      logger.info('Transaction refunded', {
        transactionId,
        refundId: refund.id,
        refundAmount,
        userId,
      });

      return {
        refund_id: refund.id,
        transaction_id: transactionId,
        amount: refundAmount,
        reason,
        status: 'completed',
        refunded_at: refund.refunded_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Refund failed', { error, transactionId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Fetch all refunds for a transaction.
   */
  async getRefundsForTransaction(transactionId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT r.*, u.username as refunded_by_name
       FROM refunds r
       LEFT JOIN users u ON u.id = r.refunded_by
       WHERE r.transaction_id = $1
       ORDER BY r.refunded_at DESC`,
      [transactionId]
    );
    return result.rows;
  }
}

export default new RefundService();
