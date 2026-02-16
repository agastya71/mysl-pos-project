/**
 * Transaction Payment Processing Unit Tests (Phase 3)
 * Tests for individual payment processors
 */

import { TransactionService } from '../../../services/transaction.service';
import { GiftCardService } from '../../../services/gift-card.service';
import { PaymentProcessorService } from '../../../services/payment-processor.service';
import { pool } from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

// Mock dependencies
jest.mock('../../../config/database');
jest.mock('../../../utils/logger');
jest.mock('../../../services/gift-card.service');
jest.mock('../../../services/payment-processor.service');

describe('TransactionService - Payment Processors (Phase 3)', () => {
  let service: TransactionService;
  let mockQuery: jest.Mock;
  let mockGiftCardService: jest.Mocked<GiftCardService>;
  let mockPaymentProcessorService: jest.Mocked<PaymentProcessorService>;

  beforeEach(() => {
    service = new TransactionService();
    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;

    // Mock GiftCardService
    mockGiftCardService = new GiftCardService() as jest.Mocked<GiftCardService>;
    (GiftCardService as jest.Mock) = jest.fn(() => mockGiftCardService);

    // Mock PaymentProcessorService
    mockPaymentProcessorService = new PaymentProcessorService() as jest.Mocked<PaymentProcessorService>;
    (PaymentProcessorService as jest.Mock) = jest.fn(() => mockPaymentProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processCashPayment', () => {
    it('should process cash payment with change calculation', async () => {
      const paymentRequest = {
        payment_method: 'cash' as const,
        amount: 45.50,
        payment_details: {
          cash_received: 50.00,
        },
      };

      const result = await service.processCashPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.cash_received).toBe(50.00);
      expect(result.cash_change).toBe(4.50);
    });

    it('should process cash payment with exact amount (no change)', async () => {
      const paymentRequest = {
        payment_method: 'cash' as const,
        amount: 50.00,
        payment_details: {
          cash_received: 50.00,
        },
      };

      const result = await service.processCashPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.cash_change).toBe(0);
    });

    it('should throw error if cash received is less than amount', async () => {
      const paymentRequest = {
        payment_method: 'cash' as const,
        amount: 50.00,
        payment_details: {
          cash_received: 45.00,
        },
      };

      await expect(service.processCashPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processCashPayment(paymentRequest)).rejects.toThrow('Insufficient cash received');
    });

    it('should throw error if cash_received is missing', async () => {
      const paymentRequest = {
        payment_method: 'cash' as const,
        amount: 50.00,
        payment_details: {},
      };

      await expect(service.processCashPayment(paymentRequest)).rejects.toThrow(AppError);
    });
  });

  describe('processCardPayment', () => {
    it('should process credit card payment successfully', async () => {
      const paymentRequest = {
        payment_method: 'credit_card' as const,
        amount: 99.99,
        payment_details: {
          card_token: 'tok_visa1234',
        },
      };

      const mockAuthResponse = {
        success: true,
        authorizationId: 'auth_123456',
        authorizationCode: 'ABC123',
        amount: 99.99,
        cardLast4: '1234',
        cardBrand: 'visa',
        status: 'authorized',
      };

      mockPaymentProcessorService.authorizePayment = jest.fn().mockResolvedValue(mockAuthResponse);

      const result = await service.processCardPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.authorization_id).toBe('auth_123456');
      expect(result.authorization_code).toBe('ABC123');
      expect(result.card_last_four).toBe('1234');
      expect(result.card_brand).toBe('visa');
      expect(mockPaymentProcessorService.authorizePayment).toHaveBeenCalledWith({
        amount: 99.99,
        cardToken: 'tok_visa1234',
        idempotencyKey: expect.any(String),
      });
    });

    it('should throw error if card authorization fails', async () => {
      const paymentRequest = {
        payment_method: 'credit_card' as const,
        amount: 99.99,
        payment_details: {
          card_token: 'tok_invalid',
        },
      };

      mockPaymentProcessorService.authorizePayment = jest.fn().mockResolvedValue({
        success: false,
        status: 'declined',
        message: 'Card declined',
      });

      await expect(service.processCardPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processCardPayment(paymentRequest)).rejects.toThrow('Card payment declined');
    });

    it('should throw error if card_token is missing', async () => {
      const paymentRequest = {
        payment_method: 'credit_card' as const,
        amount: 99.99,
        payment_details: {},
      };

      await expect(service.processCardPayment(paymentRequest)).rejects.toThrow(AppError);
    });
  });

  describe('processGiftCardPayment', () => {
    it('should process gift card payment successfully', async () => {
      const paymentRequest = {
        payment_method: 'gift_card' as const,
        amount: 25.00,
        payment_details: {
          gift_card_number: 'GC-0000000001',
        },
      };

      const mockGiftCard = {
        id: 'gc-uuid-1',
        gift_card_number: 'GC-0000000001',
        current_balance: 50.00,
        is_active: true,
      };

      const mockRedemptionResult = {
        success: true,
        previous_balance: 50.00,
        amount_redeemed: 25.00,
        new_balance: 25.00,
        gift_card: mockGiftCard,
      };

      mockGiftCardService.validateRedemption = jest.fn().mockResolvedValue(mockRedemptionResult);

      const result = await service.processGiftCardPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.gift_card_id).toBe('gc-uuid-1');
      expect(result.gift_card_number).toBe('GC-0000000001');
      expect(result.previous_balance).toBe(50.00);
      expect(result.new_balance).toBe(25.00);
      expect(mockGiftCardService.validateRedemption).toHaveBeenCalledWith('GC-0000000001', 25.00);
    });

    it('should throw error if gift card has insufficient balance', async () => {
      const paymentRequest = {
        payment_method: 'gift_card' as const,
        amount: 100.00,
        payment_details: {
          gift_card_number: 'GC-0000000001',
        },
      };

      mockGiftCardService.validateRedemption = jest.fn().mockRejectedValue(
        new AppError(400, 'INSUFFICIENT_BALANCE', 'Gift card balance insufficient')
      );

      await expect(service.processGiftCardPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processGiftCardPayment(paymentRequest)).rejects.toThrow('Gift card balance insufficient');
    });

    it('should throw error if gift card is inactive', async () => {
      const paymentRequest = {
        payment_method: 'gift_card' as const,
        amount: 25.00,
        payment_details: {
          gift_card_number: 'GC-0000000001',
        },
      };

      mockGiftCardService.validateRedemption = jest.fn().mockRejectedValue(
        new AppError(400, 'GIFT_CARD_INACTIVE', 'Gift card is inactive')
      );

      await expect(service.processGiftCardPayment(paymentRequest)).rejects.toThrow('Gift card is inactive');
    });

    it('should throw error if gift_card_number is missing', async () => {
      const paymentRequest = {
        payment_method: 'gift_card' as const,
        amount: 25.00,
        payment_details: {},
      };

      await expect(service.processGiftCardPayment(paymentRequest)).rejects.toThrow(AppError);
    });
  });

  describe('processCheckPayment', () => {
    it('should process check payment successfully', async () => {
      const paymentRequest = {
        payment_method: 'check' as const,
        amount: 150.00,
        payment_details: {
          check_number: '1234',
          bank_name: 'Chase Bank',
        },
      };

      const result = await service.processCheckPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.check_number).toBe('1234');
    });

    it('should throw error if check_number is missing', async () => {
      const paymentRequest = {
        payment_method: 'check' as const,
        amount: 150.00,
        payment_details: {},
      };

      await expect(service.processCheckPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processCheckPayment(paymentRequest)).rejects.toThrow('Check number is required');
    });

    it('should validate check number format', async () => {
      const paymentRequest = {
        payment_method: 'check' as const,
        amount: 150.00,
        payment_details: {
          check_number: '', // Empty string
        },
      };

      await expect(service.processCheckPayment(paymentRequest)).rejects.toThrow(AppError);
    });
  });

  describe('processStoreCreditPayment', () => {
    it('should process store credit payment successfully', async () => {
      const paymentRequest = {
        payment_method: 'store_credit' as const,
        amount: 30.00,
        payment_details: {
          store_credit_account_id: 'credit-uuid-1',
        },
      };

      // Mock store credit account check
      mockQuery.mockResolvedValue({
        rows: [{
          id: 'credit-uuid-1',
          customer_id: 'customer-uuid-1',
          balance: 50.00,
        }],
        rowCount: 1,
      });

      const result = await service.processStoreCreditPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.store_credit_account_id).toBe('credit-uuid-1');
      expect(result.previous_balance).toBe(50.00);
      expect(result.new_balance).toBe(20.00);
    });

    it('should throw error if store credit account not found', async () => {
      const paymentRequest = {
        payment_method: 'store_credit' as const,
        amount: 30.00,
        payment_details: {
          store_credit_account_id: 'invalid-uuid',
        },
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.processStoreCreditPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processStoreCreditPayment(paymentRequest)).rejects.toThrow('Store credit account not found');
    });

    it('should throw error if insufficient store credit balance', async () => {
      const paymentRequest = {
        payment_method: 'store_credit' as const,
        amount: 60.00,
        payment_details: {
          store_credit_account_id: 'credit-uuid-1',
        },
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 'credit-uuid-1',
          balance: 50.00,
        }],
        rowCount: 1,
      });

      await expect(service.processStoreCreditPayment(paymentRequest)).rejects.toThrow(AppError);
      await expect(service.processStoreCreditPayment(paymentRequest)).rejects.toThrow('Insufficient store credit balance');
    });
  });

  describe('validatePayments', () => {
    it('should validate payments match transaction total', () => {
      const payments = [
        { payment_method: 'cash' as const, amount: 30.00, payment_details: { cash_received: 30.00 } },
        { payment_method: 'gift_card' as const, amount: 20.00, payment_details: { gift_card_number: 'GC-123' } },
      ];
      const totalAmount = 50.00;

      expect(() => service.validatePayments(payments, totalAmount)).not.toThrow();
    });

    it('should throw error if payments sum is less than total', () => {
      const payments = [
        { payment_method: 'cash' as const, amount: 30.00, payment_details: { cash_received: 30.00 } },
      ];
      const totalAmount = 50.00;

      expect(() => service.validatePayments(payments, totalAmount)).toThrow(AppError);
      expect(() => service.validatePayments(payments, totalAmount)).toThrow('does not match transaction total');
    });

    it('should throw error if payments sum is greater than total', () => {
      const payments = [
        { payment_method: 'cash' as const, amount: 60.00, payment_details: { cash_received: 60.00 } },
      ];
      const totalAmount = 50.00;

      expect(() => service.validatePayments(payments, totalAmount)).toThrow(AppError);
    });

    it('should allow payments within $0.01 tolerance', () => {
      const payments = [
        { payment_method: 'cash' as const, amount: 50.01, payment_details: { cash_received: 51.00 } },
      ];
      const totalAmount = 50.00;

      expect(() => service.validatePayments(payments, totalAmount)).not.toThrow();
    });
  });
});
