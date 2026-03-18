/**
 * SquarePaymentProcessor Unit Tests
 *
 * Mocks the 'square' module to test processor logic without hitting Square API.
 */

import { SquarePaymentProcessor } from '../../../services/payment-processor/SquarePaymentProcessor';

jest.mock('../../../utils/logger');

// Mock the entire 'square' module
const mockPaymentsCreate = jest.fn();
const mockPaymentsComplete = jest.fn();
const mockPaymentsCancel = jest.fn();
const mockRefundsRefundPayment = jest.fn();

jest.mock('square', () => {
  return {
    SquareClient: jest.fn().mockImplementation(() => ({
      payments: {
        create: mockPaymentsCreate,
        complete: mockPaymentsComplete,
        cancel: mockPaymentsCancel,
      },
      refunds: {
        refundPayment: mockRefundsRefundPayment,
      },
    })),
    SquareEnvironment: {
      Sandbox: 'sandbox',
      Production: 'production',
    },
    SquareError: class SquareError extends Error {
      errors: any[];
      constructor(message: string, errors: any[] = []) {
        super(message);
        this.name = 'SquareError';
        this.errors = errors;
      }
    },
    Currency: {
      Usd: 'USD',
    },
  };
});

describe('SquarePaymentProcessor', () => {
  let processor: SquarePaymentProcessor;

  beforeEach(() => {
    process.env.SQUARE_ACCESS_TOKEN = 'test-token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    process.env.SQUARE_LOCATION_ID = 'test-location-id';
    jest.clearAllMocks();
    processor = new SquarePaymentProcessor();
  });

  afterEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_ENVIRONMENT;
    delete process.env.SQUARE_LOCATION_ID;
  });

  describe('authorizePayment()', () => {
    const params = {
      amount: 25.00,
      cardToken: 'cnon:test-token-123',
      currency: 'USD',
      idempotencyKey: 'test-key-123',
    };

    it('should return success response with correct shape on success', async () => {
      mockPaymentsCreate.mockResolvedValue({
        payment: {
          id: 'sq-payment-id-123',
          cardDetails: {
            authResultCode: 'AUTH123',
            card: { last4: '1234', cardBrand: 'VISA' },
          },
        },
      });

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(true);
      expect(result.authorizationId).toBe('sq-payment-id-123');
      expect(result.status).toBe('authorized');
      expect(result.cardLast4).toBe('1234');
      expect(result.cardBrand).toBe('visa');
      expect(result.amount).toBe(25.00);
    });

    it('should convert amount to BigInt cents (amount × 100)', async () => {
      mockPaymentsCreate.mockResolvedValue({
        payment: {
          id: 'sq-id',
          cardDetails: { card: { last4: '0000' } },
        },
      });

      await processor.authorizePayment({ ...params, amount: 12.34 });

      const callArgs = mockPaymentsCreate.mock.calls[0][0];
      expect(callArgs.amountMoney.amount).toBe(BigInt(1234));
    });

    it('should return success: false when SquareError is thrown', async () => {
      const { SquareError: MockSquareError } = jest.requireMock('square');
      const sqErr = new MockSquareError('Card declined', [
        { detail: 'Card declined by issuer', category: 'PAYMENT_METHOD_ERROR' },
      ]);
      mockPaymentsCreate.mockRejectedValue(sqErr);

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Card declined by issuer');
    });

    it('should extract error message from SquareError.errors array', async () => {
      const { SquareError: MockSquareError } = jest.requireMock('square');
      const sqErr = new MockSquareError('Multiple errors', [
        { detail: 'First error' },
        { detail: 'Second error' },
      ]);
      mockPaymentsCreate.mockRejectedValue(sqErr);

      const result = await processor.authorizePayment(params);

      expect(result.message).toBe('First error; Second error');
    });

    it('should handle generic Error (non-SquareError)', async () => {
      mockPaymentsCreate.mockRejectedValue(new Error('Network error'));

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  describe('capturePayment()', () => {
    it('should return success on capture', async () => {
      mockPaymentsComplete.mockResolvedValue({
        payment: { id: 'sq-payment-id-123' },
      });

      const result = await processor.capturePayment('sq-payment-id-123', 25.00);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('sq-payment-id-123');
      expect(result.status).toBe('captured');
    });

    it('should return success: false on SquareError', async () => {
      const { SquareError: MockSquareError } = jest.requireMock('square');
      mockPaymentsComplete.mockRejectedValue(
        new MockSquareError('Payment not found', [{ detail: 'Payment not found' }])
      );

      const result = await processor.capturePayment('bad-id', 25.00);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });
  });

  describe('voidPayment()', () => {
    it('should return success on void', async () => {
      mockPaymentsCancel.mockResolvedValue({
        payment: { id: 'sq-payment-id-123' },
      });

      const result = await processor.voidPayment('sq-payment-id-123');

      expect(result.success).toBe(true);
      expect(result.voidId).toBe('sq-payment-id-123');
      expect(result.status).toBe('voided');
    });

    it('should return success: false on failure', async () => {
      mockPaymentsCancel.mockRejectedValue(new Error('Cannot void'));

      const result = await processor.voidPayment('sq-id');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });
  });

  describe('refundPayment()', () => {
    it('should return success and convert amount × 100 to BigInt', async () => {
      mockRefundsRefundPayment.mockResolvedValue({
        refund: { id: 'sq-refund-id-123' },
      });

      const result = await processor.refundPayment('sq-payment-id-123', 10.50);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('sq-refund-id-123');
      expect(result.status).toBe('refunded');
      expect(result.amount).toBe(10.50);

      const callArgs = mockRefundsRefundPayment.mock.calls[0][0];
      expect(callArgs.amountMoney.amount).toBe(BigInt(1050));
    });

    it('should return success: false on SquareError', async () => {
      const { SquareError: MockSquareError } = jest.requireMock('square');
      mockRefundsRefundPayment.mockRejectedValue(
        new MockSquareError('Refund failed', [{ detail: 'Cannot refund' }])
      );

      const result = await processor.refundPayment('sq-id', 5.00);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });
  });

  describe('validateCard()', () => {
    it('should return true for valid Luhn card number', () => {
      expect(processor.validateCard('4532015112830366')).toBe(true); // Valid Visa
      expect(processor.validateCard('5425233430109903')).toBe(true); // Valid Mastercard
    });

    it('should return false for invalid Luhn card number', () => {
      expect(processor.validateCard('4532015112830367')).toBe(false); // Off by 1
      expect(processor.validateCard('1234567890123456')).toBe(false);
    });

    it('should return false for non-numeric input', () => {
      expect(processor.validateCard('4532-abcd-efgh-1234')).toBe(false);
    });

    it('should accept formatted numbers with spaces and dashes', () => {
      expect(processor.validateCard('4532 0151 1283 0366')).toBe(true);
      expect(processor.validateCard('4532-0151-1283-0366')).toBe(true);
    });
  });

  describe('getCardBrand()', () => {
    it('should return visa for cards starting with 4', () => {
      expect(processor.getCardBrand('4532015112830366')).toBe('visa');
    });

    it('should return mastercard for cards starting with 51-55', () => {
      expect(processor.getCardBrand('5425233430109903')).toBe('mastercard');
    });

    it('should return amex for cards starting with 34 or 37', () => {
      expect(processor.getCardBrand('371449635398431')).toBe('amex');
      expect(processor.getCardBrand('341234567890123')).toBe('amex');
    });

    it('should return discover for cards starting with 6011 or 65', () => {
      expect(processor.getCardBrand('6011111111111117')).toBe('discover');
      expect(processor.getCardBrand('6500000000000002')).toBe('discover');
    });

    it('should return unknown for unrecognized prefix', () => {
      expect(processor.getCardBrand('9999999999999995')).toBe('unknown');
    });
  });
});
