/**
 * WebhookService Unit Tests
 */

import crypto from 'crypto';
import { WebhookService } from '../../../services/webhook.service';
import { pool } from '../../../config/database';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

const WEBHOOK_URL = 'https://pos.example.com/api/v1/webhooks/square';
const SIGNATURE_KEY = 'test-webhook-signature-key';

function computeValidSignature(body: string, url: string, key: string): string {
  const message = url + body;
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('base64');
}

describe('WebhookService', () => {
  let service: WebhookService;
  const mockPoolQuery = pool.query as jest.Mock;

  beforeEach(() => {
    service = new WebhookService();
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = SIGNATURE_KEY;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  });

  describe('verifySquareSignature()', () => {
    const rawBody = JSON.stringify({ type: 'payment.completed', data: { id: 'abc' } });

    it('should return true for a valid signature', () => {
      const sig = computeValidSignature(rawBody, WEBHOOK_URL, SIGNATURE_KEY);
      expect(service.verifySquareSignature(rawBody, sig, WEBHOOK_URL)).toBe(true);
    });

    it('should return false when body is tampered', () => {
      const sig = computeValidSignature(rawBody, WEBHOOK_URL, SIGNATURE_KEY);
      const tamperedBody = JSON.stringify({ type: 'payment.completed', data: { id: 'xyz' } });
      expect(service.verifySquareSignature(tamperedBody, sig, WEBHOOK_URL)).toBe(false);
    });

    it('should return false when webhook URL is tampered', () => {
      const sig = computeValidSignature(rawBody, WEBHOOK_URL, SIGNATURE_KEY);
      expect(service.verifySquareSignature(rawBody, sig, 'https://attacker.com/evil')).toBe(false);
    });

    it('should return false when SQUARE_WEBHOOK_SIGNATURE_KEY is not set', () => {
      delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      const sig = computeValidSignature(rawBody, WEBHOOK_URL, SIGNATURE_KEY);
      expect(service.verifySquareSignature(rawBody, sig, WEBHOOK_URL)).toBe(false);
    });
  });

  describe('handleEvent()', () => {
    describe('payment.completed', () => {
      it('should UPDATE payment_authorizations SET status=captured', async () => {
        mockPoolQuery.mockResolvedValue({ rowCount: 1 });

        await service.handleEvent('payment.completed', {
          object: { payment: { id: 'sq-pay-001' } },
        });

        expect(mockPoolQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockPoolQuery.mock.calls[0];
        expect(sql).toContain('UPDATE payment_authorizations');
        expect(sql).toContain("status = 'captured'");
        expect(params).toContain('sq-pay-001');
      });

      it('should not throw when DB update fails', async () => {
        mockPoolQuery.mockRejectedValue(new Error('DB connection lost'));
        await expect(
          service.handleEvent('payment.completed', { object: { payment: { id: 'sq-pay-002' } } })
        ).resolves.not.toThrow();
      });

      it('should no-op when payment id is missing', async () => {
        await service.handleEvent('payment.completed', { object: {} });
        expect(mockPoolQuery).not.toHaveBeenCalled();
      });
    });

    describe('payment.failed', () => {
      it('should UPDATE payment_authorizations SET status=failed', async () => {
        mockPoolQuery.mockResolvedValue({ rowCount: 1 });

        await service.handleEvent('payment.failed', {
          object: { payment: { id: 'sq-pay-003' } },
        });

        expect(mockPoolQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockPoolQuery.mock.calls[0];
        expect(sql).toContain('UPDATE payment_authorizations');
        expect(sql).toContain("status = 'failed'");
        expect(params).toContain('sq-pay-003');
      });
    });

    describe('refund.completed', () => {
      it('should UPDATE refunds SET status=completed', async () => {
        mockPoolQuery.mockResolvedValue({ rowCount: 1 });

        await service.handleEvent('refund.completed', {
          object: { refund: { id: 'sq-refund-001' } },
        });

        expect(mockPoolQuery).toHaveBeenCalledTimes(1);
        const [sql, params] = mockPoolQuery.mock.calls[0];
        expect(sql).toContain('UPDATE refunds');
        expect(sql).toContain("status = 'completed'");
        expect(params).toContain('sq-refund-001');
      });

      it('should no-op when refund id is missing', async () => {
        await service.handleEvent('refund.completed', { object: {} });
        expect(mockPoolQuery).not.toHaveBeenCalled();
      });
    });

    describe('unknown event type', () => {
      it('should not call pool.query for unknown event types', async () => {
        await service.handleEvent('inventory.updated', { object: {} });
        expect(mockPoolQuery).not.toHaveBeenCalled();
      });
    });
  });
});
