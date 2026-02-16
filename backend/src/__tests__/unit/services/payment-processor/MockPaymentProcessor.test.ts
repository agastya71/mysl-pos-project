/**
 * Mock Payment Processor Unit Tests
 * Tests the mock implementation of card payment processing
 */

import { MockPaymentProcessor } from '../../../../services/payment-processor/MockPaymentProcessor';
import { AuthorizePaymentParams, CardData } from '../../../../types/payment-processor.types';

describe('MockPaymentProcessor', () => {
  let processor: MockPaymentProcessor;

  beforeEach(() => {
    processor = new MockPaymentProcessor();
  });

  describe('authorizePayment', () => {
    it('should authorize payment successfully', async () => {
      const params: AuthorizePaymentParams = {
        amount: 50.00,
        cardToken: 'mock_tok_visa_1234_abcd1234',
        currency: 'USD',
      };

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(true);
      expect(result.status).toBe('authorized');
      expect(result.authorizationId).toBeDefined();
      expect(result.authorizationId).toMatch(/^mock_auth_/);
      expect(result.authorizationCode).toBeDefined();
      expect(result.authorizationCode).toHaveLength(6);
      expect(result.processorResponse).toBeDefined();
      expect(result.processorResponse.amount).toBe(50.00);
    });

    it('should decline payment when configured to fail', async () => {
      processor = new MockPaymentProcessor({
        shouldSucceed: false,
        declineReason: 'Insufficient funds',
      });

      const params: AuthorizePaymentParams = {
        amount: 100.00,
        cardToken: 'mock_tok_visa_1234_abcd1234',
      };

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(false);
      expect(result.status).toBe('declined');
      expect(result.message).toBe('Insufficient funds');
      expect(result.processorResponse.error).toBe('Insufficient funds');
    });

    it('should extract card brand from token', async () => {
      const params: AuthorizePaymentParams = {
        amount: 25.00,
        cardToken: 'mock_tok_mastercard_5678_xyz789',
      };

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(true);
      expect(result.processorResponse.cardBrand).toBe('mastercard');
    });

    it('should extract last 4 digits from token', async () => {
      const params: AuthorizePaymentParams = {
        amount: 75.00,
        cardToken: 'mock_tok_visa_9876_test456',
      };

      const result = await processor.authorizePayment(params);

      expect(result.success).toBe(true);
      expect(result.processorResponse.cardLast4).toBe('9876');
    });
  });

  describe('capturePayment', () => {
    it('should capture payment successfully', async () => {
      const result = await processor.capturePayment('mock_auth_abc123', 50.00);

      expect(result.success).toBe(true);
      expect(result.status).toBe('captured');
      expect(result.paymentId).toBeDefined();
      expect(result.paymentId).toMatch(/^mock_payment_/);
      expect(result.captureId).toBeDefined();
      expect(result.captureId).toMatch(/^mock_capture_/);
      expect(result.amount).toBe(50.00);
    });

    it('should fail capture when configured to fail', async () => {
      processor = new MockPaymentProcessor({ shouldSucceed: false });

      const result = await processor.capturePayment('mock_auth_abc123', 50.00);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Capture failed');
    });
  });

  describe('voidPayment', () => {
    it('should void payment successfully', async () => {
      const result = await processor.voidPayment('mock_auth_xyz789');

      expect(result.success).toBe(true);
      expect(result.status).toBe('voided');
      expect(result.voidId).toBeDefined();
      expect(result.voidId).toMatch(/^mock_void_/);
      expect(result.processorResponse.authorizationId).toBe('mock_auth_xyz789');
    });

    it('should fail void when configured to fail', async () => {
      processor = new MockPaymentProcessor({ shouldSucceed: false });

      const result = await processor.voidPayment('mock_auth_xyz789');

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Void failed');
    });
  });

  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      const result = await processor.refundPayment('mock_payment_123', 30.00);

      expect(result.success).toBe(true);
      expect(result.status).toBe('refunded');
      expect(result.refundId).toBeDefined();
      expect(result.refundId).toMatch(/^mock_refund_/);
      expect(result.amount).toBe(30.00);
      expect(result.processorResponse.paymentId).toBe('mock_payment_123');
    });

    it('should fail refund when configured to fail', async () => {
      processor = new MockPaymentProcessor({ shouldSucceed: false });

      const result = await processor.refundPayment('mock_payment_123', 30.00);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Refund failed');
    });
  });

  describe('createCardToken', () => {
    it('should create card token for valid card', async () => {
      const cardData: CardData = {
        number: '4111111111111111', // Valid Visa test card
        exp_month: 12,
        exp_year: 2027,
        cvv: '123',
        cardholder_name: 'Test User',
      };

      const token = await processor.createCardToken(cardData);

      expect(token).toBeDefined();
      expect(token).toMatch(/^mock_tok_/);
      expect(token).toContain('visa');
      expect(token).toContain('1111');
    });

    it('should throw error for invalid card number', async () => {
      const cardData: CardData = {
        number: '1234567890123456', // Invalid card
        exp_month: 12,
        exp_year: 2027,
        cvv: '123',
      };

      await expect(processor.createCardToken(cardData)).rejects.toThrow('Invalid card number');
    });
  });

  describe('validateCard', () => {
    it('should validate valid Visa card', () => {
      expect(processor.validateCard('4111111111111111')).toBe(true);
    });

    it('should validate valid Mastercard', () => {
      expect(processor.validateCard('5555555555554444')).toBe(true);
    });

    it('should validate valid Amex card', () => {
      expect(processor.validateCard('378282246310005')).toBe(true);
    });

    it('should validate valid Discover card', () => {
      expect(processor.validateCard('6011111111111117')).toBe(true);
    });

    it('should reject invalid card number (wrong checksum)', () => {
      expect(processor.validateCard('4111111111111112')).toBe(false);
    });

    it('should reject non-numeric card number', () => {
      expect(processor.validateCard('abcd1234efgh5678')).toBe(false);
    });

    it('should validate card with spaces', () => {
      expect(processor.validateCard('4111 1111 1111 1111')).toBe(true);
    });

    it('should validate card with dashes', () => {
      expect(processor.validateCard('4111-1111-1111-1111')).toBe(true);
    });
  });

  describe('getCardBrand', () => {
    it('should detect Visa', () => {
      expect(processor.getCardBrand('4111111111111111')).toBe('visa');
    });

    it('should detect Mastercard', () => {
      expect(processor.getCardBrand('5555555555554444')).toBe('mastercard');
    });

    it('should detect Amex', () => {
      expect(processor.getCardBrand('378282246310005')).toBe('amex');
      expect(processor.getCardBrand('371449635398431')).toBe('amex');
    });

    it('should detect Discover', () => {
      expect(processor.getCardBrand('6011111111111117')).toBe('discover');
      expect(processor.getCardBrand('6500000000000002')).toBe('discover');
    });

    it('should return unknown for unrecognized card', () => {
      expect(processor.getCardBrand('1234567890123456')).toBe('unknown');
    });

    it('should detect brand with spaces and dashes', () => {
      expect(processor.getCardBrand('4111 1111 1111 1111')).toBe('visa');
      expect(processor.getCardBrand('5555-5555-5555-4444')).toBe('mastercard');
    });
  });

  describe('processing delay', () => {
    it('should respect custom delay configuration', async () => {
      processor = new MockPaymentProcessor({ delay: 200 });

      const startTime = Date.now();
      await processor.authorizePayment({
        amount: 10.00,
        cardToken: 'mock_tok_visa_1234_test',
      });
      const endTime = Date.now();

      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(180); // Allow some margin
      expect(elapsed).toBeLessThan(250);
    });

    it('should have minimal delay with 0ms configuration', async () => {
      processor = new MockPaymentProcessor({ delay: 0 });

      const startTime = Date.now();
      await processor.authorizePayment({
        amount: 10.00,
        cardToken: 'mock_tok_visa_1234_test',
      });
      const endTime = Date.now();

      const elapsed = endTime - startTime;
      expect(elapsed).toBeLessThan(50); // Should be very fast
    });
  });

  describe('end-to-end payment flow', () => {
    it('should successfully authorize, then capture', async () => {
      // Step 1: Authorize
      const authResult = await processor.authorizePayment({
        amount: 100.00,
        cardToken: 'mock_tok_visa_4242_test123',
      });

      expect(authResult.success).toBe(true);
      expect(authResult.status).toBe('authorized');

      // Step 2: Capture
      const captureResult = await processor.capturePayment(
        authResult.authorizationId,
        100.00
      );

      expect(captureResult.success).toBe(true);
      expect(captureResult.status).toBe('captured');
      expect(captureResult.amount).toBe(100.00);
    });

    it('should successfully authorize, then void', async () => {
      // Step 1: Authorize
      const authResult = await processor.authorizePayment({
        amount: 75.00,
        cardToken: 'mock_tok_mastercard_5678_test456',
      });

      expect(authResult.success).toBe(true);

      // Step 2: Void
      const voidResult = await processor.voidPayment(authResult.authorizationId);

      expect(voidResult.success).toBe(true);
      expect(voidResult.status).toBe('voided');
    });

    it('should successfully capture, then refund', async () => {
      // Step 1: Authorize
      const authResult = await processor.authorizePayment({
        amount: 50.00,
        cardToken: 'mock_tok_amex_0005_test789',
      });

      expect(authResult.success).toBe(true);

      // Step 2: Capture
      const captureResult = await processor.capturePayment(
        authResult.authorizationId,
        50.00
      );

      expect(captureResult.success).toBe(true);

      // Step 3: Refund
      const refundResult = await processor.refundPayment(captureResult.paymentId, 50.00);

      expect(refundResult.success).toBe(true);
      expect(refundResult.status).toBe('refunded');
      expect(refundResult.amount).toBe(50.00);
    });
  });
});
