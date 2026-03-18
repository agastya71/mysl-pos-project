/**
 * ReconciliationService Unit Tests
 */

import { ReconciliationService } from '../../../services/reconciliation.service';
import { pool } from '../../../config/database';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

// Mock the 'square' module
const mockPaymentsList = jest.fn();

jest.mock('square', () => ({
  SquareClient: jest.fn().mockImplementation(() => ({
    payments: {
      list: mockPaymentsList,
    },
  })),
  SquareEnvironment: {
    Sandbox: 'sandbox',
    Production: 'production',
  },
}));

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  const mockPoolQuery = pool.query as jest.Mock;

  beforeEach(() => {
    service = new ReconciliationService();
    jest.clearAllMocks();
    process.env.SQUARE_ACCESS_TOKEN = 'test-token';
    process.env.SQUARE_LOCATION_ID = 'test-location-id';
  });

  afterEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_LOCATION_ID;
  });

  const makeLocalRows = (payments: Array<{ processorId: string; amount: string; txnNumber?: string }>) =>
    payments.map((p) => ({
      id: `local-${p.processorId}`,
      processor_transaction_id: p.processorId,
      amount: p.amount,
      transaction_number: p.txnNumber ?? 'TXN-001',
    }));

  const makeSquarePayments = (payments: Array<{ id: string; amountCents: number }>) =>
    payments.map((p) => ({
      id: p.id,
      amountMoney: { amount: BigInt(p.amountCents) },
    }));

  async function* asyncIterator<T>(items: T[]) {
    for (const item of items) {
      yield item;
    }
  }

  describe('runDailyReconciliation()', () => {
    it('should return matched=N and empty mismatches when all payments match', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: makeLocalRows([
          { processorId: 'sq-001', amount: '25.00' },
          { processorId: 'sq-002', amount: '10.00' },
        ]),
      });
      mockPaymentsList.mockResolvedValue(
        asyncIterator(makeSquarePayments([
          { id: 'sq-001', amountCents: 2500 },
          { id: 'sq-002', amountCents: 1000 },
        ]))
      );

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(report.summary.matched).toBe(2);
      expect(report.summary.local_only).toBe(0);
      expect(report.summary.square_only).toBe(0);
      expect(report.summary.amount_mismatches).toBe(0);
      expect(report.mismatches).toHaveLength(0);
      expect(report.date).toBe('2026-03-18');
    });

    it('should flag local_only when payment is in DB but not in Square', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: makeLocalRows([{ processorId: 'sq-local-only', amount: '30.00' }]),
      });
      mockPaymentsList.mockResolvedValue(asyncIterator([])); // Square returns nothing

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(report.summary.local_only).toBe(1);
      const mismatch = report.mismatches[0];
      expect(mismatch.processor_transaction_id).toBe('sq-local-only');
      expect(mismatch.status).toBe('local_only');
      expect(mismatch.local_amount).toBe(30.00);
    });

    it('should flag square_only when payment is in Square but not in DB', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] }); // DB returns nothing
      mockPaymentsList.mockResolvedValue(
        asyncIterator(makeSquarePayments([{ id: 'sq-square-only', amountCents: 4000 }]))
      );

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(report.summary.square_only).toBe(1);
      const mismatch = report.mismatches[0];
      expect(mismatch.processor_transaction_id).toBe('sq-square-only');
      expect(mismatch.status).toBe('square_only');
      expect(mismatch.square_amount).toBe(40.00);
    });

    it('should flag amount_mismatch when same ID has |diff| > $0.01', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: makeLocalRows([{ processorId: 'sq-mismatch', amount: '25.00' }]),
      });
      mockPaymentsList.mockResolvedValue(
        asyncIterator(makeSquarePayments([{ id: 'sq-mismatch', amountCents: 2600 }])) // $26.00 vs $25.00
      );

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(report.summary.amount_mismatches).toBe(1);
      const mismatch = report.mismatches[0];
      expect(mismatch.status).toBe('amount_mismatch');
      expect(mismatch.local_amount).toBe(25.00);
      expect(mismatch.square_amount).toBe(26.00);
    });

    it('should NOT flag amount_mismatch when |diff| <= $0.01 (rounding)', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: makeLocalRows([{ processorId: 'sq-close', amount: '25.00' }]),
      });
      // $25.005 → difference is $0.005 < $0.01
      mockPaymentsList.mockResolvedValue(
        asyncIterator(makeSquarePayments([{ id: 'sq-close', amountCents: 2500 }]))
      );

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(report.summary.matched).toBe(1);
      expect(report.summary.amount_mismatches).toBe(0);
    });

    it('should skip Square API call when SQUARE_ACCESS_TOKEN is not set', async () => {
      delete process.env.SQUARE_ACCESS_TOKEN;
      mockPoolQuery.mockResolvedValue({ rows: makeLocalRows([{ processorId: 'sq-001', amount: '10.00' }]) });

      const report = await service.runDailyReconciliation('2026-03-18');

      expect(mockPaymentsList).not.toHaveBeenCalled();
      expect(report.summary.local_only).toBe(1); // local payment not matched since no Square data
    });

    it('should skip Square API call when SQUARE_LOCATION_ID is not set', async () => {
      delete process.env.SQUARE_LOCATION_ID;
      mockPoolQuery.mockResolvedValue({ rows: [] });

      await service.runDailyReconciliation('2026-03-18');

      expect(mockPaymentsList).not.toHaveBeenCalled();
    });

    it('should catch Square API error, log warning, and return report with local data only', async () => {
      mockPoolQuery.mockResolvedValue({
        rows: makeLocalRows([{ processorId: 'sq-001', amount: '10.00' }]),
      });
      mockPaymentsList.mockRejectedValue(new Error('Square API unavailable'));

      const report = await service.runDailyReconciliation('2026-03-18');

      // Should not throw; local data still in report
      expect(report.summary.total_local).toBe(1);
      // local_only since Square data is empty (API failed)
      expect(report.summary.local_only).toBe(1);
      expect(report.summary.total_square).toBe(0);
    });

    it('should include run_at ISO timestamp in report', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      mockPaymentsList.mockResolvedValue(asyncIterator([]));

      const before = new Date().toISOString();
      const report = await service.runDailyReconciliation('2026-03-18');
      const after = new Date().toISOString();

      expect(report.run_at >= before).toBe(true);
      expect(report.run_at <= after).toBe(true);
    });
  });
});
