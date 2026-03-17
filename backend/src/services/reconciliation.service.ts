/**
 * Reconciliation Service
 *
 * Compares local payment records against Square's records for a given date.
 * Flags mismatches:
 *   - local_only   — payment recorded locally but not found in Square
 *   - square_only  — payment found in Square but not recorded locally
 *   - amount_mismatch — same ID found in both but amounts differ
 */

import { SquareClient, SquareEnvironment } from 'square';
import { pool } from '../config/database';
import logger from '../utils/logger';

export interface ReconciliationMatch {
  processor_transaction_id: string;
  status: 'matched' | 'local_only' | 'square_only' | 'amount_mismatch';
  local_amount?: number;
  square_amount?: number;
  local_payment_id?: string;
  transaction_number?: string;
}

export interface ReconciliationReport {
  date: string;
  run_at: string;
  summary: {
    total_local: number;
    total_square: number;
    matched: number;
    local_only: number;
    square_only: number;
    amount_mismatches: number;
  };
  mismatches: ReconciliationMatch[];
}

export class ReconciliationService {
  private squareClient: SquareClient | null = null;

  private getSquareClient(): SquareClient {
    if (!this.squareClient) {
      const environment =
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox;
      this.squareClient = new SquareClient({
        token: process.env.SQUARE_ACCESS_TOKEN!,
        environment,
      });
    }
    return this.squareClient;
  }

  /**
   * Run daily reconciliation for a given date (YYYY-MM-DD).
   * Fetches local payments and Square payments, compares them, returns report.
   */
  async runDailyReconciliation(date: string): Promise<ReconciliationReport> {
    logger.info('Running reconciliation', { date });

    // 1. Fetch local card payments for the date
    const localResult = await pool.query(
      `SELECT p.id, p.processor_transaction_id, p.amount, t.transaction_number
       FROM payments p
       JOIN transactions t ON t.id = p.transaction_id
       WHERE p.payment_processor = 'square'
         AND DATE(p.payment_date) = $1
         AND p.processor_transaction_id IS NOT NULL`,
      [date]
    );

    const localByProcessorId = new Map<string, { id: string; amount: number; txnNumber: string }>();
    for (const row of localResult.rows) {
      localByProcessorId.set(row.processor_transaction_id, {
        id: row.id,
        amount: parseFloat(row.amount),
        txnNumber: row.transaction_number,
      });
    }

    // 2. Fetch Square payments for the date (skip if Square not configured)
    const squareByProcessorId = new Map<string, number>();

    if (process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID) {
      try {
        const beginTime = new Date(`${date}T00:00:00Z`).toISOString();
        const endTime = new Date(`${date}T23:59:59Z`).toISOString();

        const client = this.getSquareClient();
        const page = await client.payments.list({
          beginTime,
          endTime,
          locationId: process.env.SQUARE_LOCATION_ID,
          limit: 500,
        });

        for await (const payment of page) {
          if (payment.id && payment.amountMoney?.amount != null) {
            squareByProcessorId.set(payment.id, Number(payment.amountMoney.amount) / 100);
          }
        }
      } catch (err) {
        logger.warn('Could not fetch Square payments for reconciliation', { err });
      }
    } else {
      logger.warn('Square not configured — reconciliation will only check local records');
    }

    // 3. Compare
    const mismatches: ReconciliationMatch[] = [];
    let matched = 0;

    for (const [processorId, local] of localByProcessorId) {
      if (!squareByProcessorId.has(processorId)) {
        mismatches.push({
          processor_transaction_id: processorId,
          status: 'local_only',
          local_amount: local.amount,
          local_payment_id: local.id,
          transaction_number: local.txnNumber,
        });
      } else {
        const squareAmount = squareByProcessorId.get(processorId)!;
        if (Math.abs(squareAmount - local.amount) > 0.01) {
          mismatches.push({
            processor_transaction_id: processorId,
            status: 'amount_mismatch',
            local_amount: local.amount,
            square_amount: squareAmount,
            local_payment_id: local.id,
            transaction_number: local.txnNumber,
          });
        } else {
          matched++;
        }
      }
    }

    for (const [processorId, squareAmount] of squareByProcessorId) {
      if (!localByProcessorId.has(processorId)) {
        mismatches.push({
          processor_transaction_id: processorId,
          status: 'square_only',
          square_amount: squareAmount,
        });
      }
    }

    const report: ReconciliationReport = {
      date,
      run_at: new Date().toISOString(),
      summary: {
        total_local: localByProcessorId.size,
        total_square: squareByProcessorId.size,
        matched,
        local_only: mismatches.filter((m) => m.status === 'local_only').length,
        square_only: mismatches.filter((m) => m.status === 'square_only').length,
        amount_mismatches: mismatches.filter((m) => m.status === 'amount_mismatch').length,
      },
      mismatches,
    };

    logger.info('Reconciliation complete', { date, summary: report.summary });
    return report;
  }
}

export default new ReconciliationService();
