/**
 * RefundService Unit Tests
 */

import { RefundService } from '../../../services/refund.service';
import { pool } from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

// Use var so the factory closure can write to it before the let initializer runs
// (jest.mock is hoisted above const/let declarations).
var mockProcessorInstance: { refundPayment: jest.Mock };

jest.mock('../../../services/payment-processor.service', () => {
  const instance = { refundPayment: jest.fn() };
  mockProcessorInstance = instance;
  return {
    PaymentProcessorService: jest.fn(() => instance),
  };
});

describe('RefundService', () => {
  let service: RefundService;
  let mockClient: any;

  const TXN_ID = 'txn-uuid-001';
  const USER_ID = 'user-uuid-001';

  beforeEach(() => {
    mockProcessorInstance.refundPayment.mockReset();
    service = new RefundService();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
    (pool.query as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refundTransaction()', () => {
    function setupHappyPath(opts: {
      total?: string;
      status?: string;
      cardPayments?: any[];
      items?: any[];
    } = {}) {
      const txnRow = {
        id: TXN_ID,
        status: opts.status ?? 'completed',
        total_amount: opts.total ?? '50.00',
      };
      const payments = opts.cardPayments ?? [];
      const items = opts.items ?? [{ product_id: 'prod-1', quantity: 2 }];
      const refundRow = { id: 'refund-uuid-001', refunded_at: '2026-03-18T10:00:00Z' };

      mockClient.query
        .mockResolvedValueOnce(undefined)                         // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [txnRow] }) // SELECT txn
        .mockResolvedValueOnce({ rows: payments })              // SELECT payments
        .mockResolvedValueOnce({ rows: [refundRow] })          // INSERT refund
        .mockResolvedValueOnce({ rowCount: 1 })                // UPDATE payments
        .mockResolvedValueOnce({ rowCount: 1 })                // UPDATE txn status
        .mockResolvedValueOnce({ rows: items });               // SELECT items

      for (let i = 0; i < items.length; i++) {
        mockClient.query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE products
      }
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT
    }

    it('should execute full happy-path: BEGIN → fetch → insert → update → COMMIT', async () => {
      setupHappyPath();

      const result = await service.refundTransaction(TXN_ID, 50.00, 'Damaged item', USER_ID);

      expect(result.refund_id).toBe('refund-uuid-001');
      expect(result.transaction_id).toBe(TXN_ID);
      expect(result.amount).toBe(50.00);
      expect(result.status).toBe('completed');

      const queryTexts = mockClient.query.mock.calls.map((c: any) =>
        typeof c[0] === 'string' ? c[0].trim() : ''
      );
      expect(queryTexts[0]).toBe('BEGIN');
      expect(queryTexts[queryTexts.length - 1]).toBe('COMMIT');
    });

    it('should throw 404 AppError when transaction not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      let caughtError: any;
      try {
        await service.refundTransaction('nonexistent-id', 10.00, 'reason', USER_ID);
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeInstanceOf(AppError);
      expect(caughtError.statusCode).toBe(404);
    });

    it('should throw 400 AppError when transaction status is not completed', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: TXN_ID, status: 'voided', total_amount: '50.00' }],
        });

      await expect(
        service.refundTransaction(TXN_ID, 50.00, 'reason', USER_ID)
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_TRANSACTION_STATUS' });
    });

    it('should throw 400 AppError when refund amount exceeds total', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: TXN_ID, status: 'completed', total_amount: '50.00' }],
        });

      await expect(
        service.refundTransaction(TXN_ID, 60.00, 'reason', USER_ID)
      ).rejects.toMatchObject({ statusCode: 400, code: 'REFUND_AMOUNT_EXCEEDED' });
    });

    it('should call processor refundPayment for card payments', async () => {
      const cardPayments = [
        { id: 'pay-1', processor_transaction_id: 'sq-id-1', payment_processor: 'square' },
      ];
      mockProcessorInstance.refundPayment.mockResolvedValue({ success: true, refundId: 'sq-refund-1' });
      setupHappyPath({ cardPayments });

      await service.refundTransaction(TXN_ID, 50.00, 'reason', USER_ID);

      expect(mockProcessorInstance.refundPayment).toHaveBeenCalledWith('sq-id-1', 50.00, 'square');
    });

    it('should log warning and continue when processor refund fails (non-fatal)', async () => {
      const cardPayments = [
        { id: 'pay-1', processor_transaction_id: 'sq-id-1', payment_processor: 'square' },
      ];
      mockProcessorInstance.refundPayment.mockResolvedValue({ success: false, error: 'Square error' });
      setupHappyPath({ cardPayments });

      await expect(
        service.refundTransaction(TXN_ID, 50.00, 'reason', USER_ID)
      ).resolves.toBeDefined();
    });

    it('should set status to partially_refunded for partial refunds', async () => {
      setupHappyPath();

      await service.refundTransaction(TXN_ID, 25.00, 'partial refund', USER_ID);

      // The UPDATE transactions call receives 'partially_refunded' as parameter
      const allParams = mockClient.query.mock.calls.flatMap((c: any) => c[1] ?? []);
      expect(allParams).toContain('partially_refunded');
    });

    it('should ROLLBACK and release client on unexpected error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined)        // BEGIN
        .mockRejectedValueOnce(new Error('DB exploded')); // SELECT txn throws

      await expect(
        service.refundTransaction(TXN_ID, 10.00, 'reason', USER_ID)
      ).rejects.toThrow('DB exploded');

      const queryTexts = mockClient.query.mock.calls.map((c: any) => c[0]);
      expect(queryTexts).toContain('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getRefundsForTransaction()', () => {
    it('should return refunds ordered by refunded_at DESC', async () => {
      const rows = [
        { id: 'r2', amount: '25.00', refunded_by_name: 'Alice', refunded_at: '2026-03-18T12:00:00Z' },
        { id: 'r1', amount: '25.00', refunded_by_name: 'Alice', refunded_at: '2026-03-17T10:00:00Z' },
      ];
      (pool.query as jest.Mock).mockResolvedValue({ rows });

      const result = await service.getRefundsForTransaction(TXN_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('r2');

      const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('ORDER BY r.refunded_at DESC');
      expect(params).toContain(TXN_ID);
    });
  });
});
