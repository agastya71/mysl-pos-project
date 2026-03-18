/**
 * TerminalService Unit Tests
 */

import { TerminalService } from '../../../services/terminal.service';
import { AppError } from '../../../middleware/error.middleware';

jest.mock('../../../utils/logger');

const mockCheckoutsCreate = jest.fn();
const mockCheckoutsGet = jest.fn();
const mockCheckoutsCancel = jest.fn();

jest.mock('square', () => ({
  SquareClient: jest.fn().mockImplementation(() => ({
    terminal: {
      checkouts: {
        create: mockCheckoutsCreate,
        get: mockCheckoutsGet,
        cancel: mockCheckoutsCancel,
      },
    },
  })),
  SquareEnvironment: { Sandbox: 'sandbox', Production: 'production' },
  Currency: { Usd: 'USD' },
}));

describe('TerminalService', () => {
  let service: TerminalService;

  beforeEach(() => {
    process.env.SQUARE_ACCESS_TOKEN = 'test-token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    process.env.SQUARE_DEVICE_ID = 'device-abc123';
    jest.clearAllMocks();
    service = new TerminalService();
  });

  afterEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_ENVIRONMENT;
    delete process.env.SQUARE_DEVICE_ID;
  });

  describe('createCheckout()', () => {
    it('should return checkoutId on success', async () => {
      mockCheckoutsCreate.mockResolvedValue({ checkout: { id: 'chk-001' } });

      const result = await service.createCheckout(25.00, 'uuid-idempotency-key-001');

      expect(result.checkoutId).toBe('chk-001');
    });

    it('should send amountMoney as cents (amount × 100)', async () => {
      mockCheckoutsCreate.mockResolvedValue({ checkout: { id: 'chk-002' } });

      await service.createCheckout(12.34, 'uuid-key');

      const callArgs = mockCheckoutsCreate.mock.calls[0][0];
      expect(callArgs.checkout.amountMoney.amount).toBe(BigInt(1234));
    });

    it('should include the SQUARE_DEVICE_ID in deviceOptions', async () => {
      mockCheckoutsCreate.mockResolvedValue({ checkout: { id: 'chk-003' } });

      await service.createCheckout(10.00, 'uuid-key');

      const callArgs = mockCheckoutsCreate.mock.calls[0][0];
      expect(callArgs.checkout.deviceOptions.deviceId).toBe('device-abc123');
    });

    it('should throw 503 AppError when SQUARE_ACCESS_TOKEN is not set', async () => {
      delete process.env.SQUARE_ACCESS_TOKEN;

      await expect(service.createCheckout(10.00, 'uuid-key')).rejects.toMatchObject({
        statusCode: 503,
        code: 'SQUARE_NOT_CONFIGURED',
      });
    });

    it('should throw 503 AppError when SQUARE_DEVICE_ID is not set', async () => {
      delete process.env.SQUARE_DEVICE_ID;

      await expect(service.createCheckout(10.00, 'uuid-key')).rejects.toMatchObject({
        statusCode: 503,
        code: 'SQUARE_DEVICE_NOT_CONFIGURED',
      });
    });

    it('should throw 502 AppError when Square returns no checkout ID', async () => {
      mockCheckoutsCreate.mockResolvedValue({ checkout: {} }); // no id

      await expect(service.createCheckout(10.00, 'uuid-key')).rejects.toMatchObject({
        statusCode: 502,
        code: 'TERMINAL_CHECKOUT_FAILED',
      });
    });
  });

  describe('getCheckoutStatus()', () => {
    it('should return PENDING status', async () => {
      mockCheckoutsGet.mockResolvedValue({ checkout: { id: 'chk-001', status: 'PENDING' } });

      const result = await service.getCheckoutStatus('chk-001');

      expect(result.status).toBe('PENDING');
      expect(result.paymentId).toBeUndefined();
    });

    it('should return COMPLETED status with paymentId and card details', async () => {
      mockCheckoutsGet.mockResolvedValue({
        checkout: {
          id: 'chk-001',
          status: 'COMPLETED',
          paymentIds: ['sq-pay-001'],
          cardDetails: { card: { last4: '1234', cardBrand: 'VISA' } },
        },
      });

      const result = await service.getCheckoutStatus('chk-001');

      expect(result.status).toBe('COMPLETED');
      expect(result.paymentId).toBe('sq-pay-001');
      expect(result.cardLast4).toBe('1234');
      expect(result.cardBrand).toBe('Visa');
    });

    it('should return CANCELED status', async () => {
      mockCheckoutsGet.mockResolvedValue({ checkout: { id: 'chk-001', status: 'CANCELED' } });

      const result = await service.getCheckoutStatus('chk-001');
      expect(result.status).toBe('CANCELED');
    });

    it('should throw 404 AppError when checkout not found', async () => {
      mockCheckoutsGet.mockResolvedValue({ checkout: null });

      await expect(service.getCheckoutStatus('bad-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'TERMINAL_CHECKOUT_NOT_FOUND',
      });
    });
  });

  describe('cancelCheckout()', () => {
    it('should call Square cancel endpoint', async () => {
      mockCheckoutsCancel.mockResolvedValue({});

      await service.cancelCheckout('chk-001');

      expect(mockCheckoutsCancel).toHaveBeenCalledWith({ checkoutId: 'chk-001' });
    });
  });
});
