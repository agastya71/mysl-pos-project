/**
 * Gift Card Service Unit Tests
 */

import { GiftCardService } from '../../../services/gift-card.service';
import { pool } from '../../../config/database';
import { AppError } from '../../../middleware/error.middleware';

// Mock dependencies
jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('GiftCardService', () => {
  let service: GiftCardService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new GiftCardService();
    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGiftCard', () => {
    it('should create gift card successfully', async () => {
      const params = {
        initial_balance: 50.00,
        recipient_name: 'Jane Doe',
        recipient_email: 'jane@example.com',
      };

      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        initial_balance: 50.00,
        current_balance: 50.00,
        is_active: true,
        recipient_name: 'Jane Doe',
        recipient_email: 'jane@example.com',
        created_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const result = await service.createGiftCard(params);

      expect(result).toEqual(mockGiftCard);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO gift_cards'),
        expect.arrayContaining([50.00, 50.00, 'Jane Doe', 'jane@example.com'])
      );
    });

    it('should throw error for negative initial balance', async () => {
      const params = {
        initial_balance: -10.00,
      };

      await expect(service.createGiftCard(params)).rejects.toThrow(AppError);
      await expect(service.createGiftCard(params)).rejects.toThrow('Initial balance must be greater than zero');
    });

    it('should throw error for zero initial balance', async () => {
      const params = {
        initial_balance: 0,
      };

      await expect(service.createGiftCard(params)).rejects.toThrow(AppError);
      await expect(service.createGiftCard(params)).rejects.toThrow('Initial balance must be greater than zero');
    });
  });

  describe('getGiftCardById', () => {
    it('should return gift card by ID', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        current_balance: 35.50,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const result = await service.getGiftCardById('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockGiftCard);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM gift_cards WHERE id = $1',
        ['550e8400-e29b-41d4-a716-446655440001']
      );
    });

    it('should return null if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getGiftCardById('550e8400-e29b-41d4-a716-446655440999');

      expect(result).toBeNull();
    });
  });

  describe('getGiftCardByNumber', () => {
    it('should return gift card by number', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        current_balance: 25.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const result = await service.getGiftCardByNumber('GC-0000000001');

      expect(result).toEqual(mockGiftCard);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM gift_cards WHERE gift_card_number = $1',
        ['GC-0000000001']
      );
    });

    it('should return null if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getGiftCardByNumber('GC-9999999999');

      expect(result).toBeNull();
    });
  });

  describe('checkBalance', () => {
    it('should return balance for active gift card', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 42.50,
        is_active: true,
        expires_at: new Date('2027-12-31'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const result = await service.checkBalance('GC-0000000001');

      expect(result).toEqual({
        gift_card_number: 'GC-0000000001',
        current_balance: 42.50,
        is_active: true,
        expires_at: mockGiftCard.expires_at,
      });
    });

    it('should throw error if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.checkBalance('GC-9999999999')).rejects.toThrow(AppError);
      await expect(service.checkBalance('GC-9999999999')).rejects.toThrow('Gift card not found');
    });

    it('should throw error if gift card is inactive', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 10.00,
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      await expect(service.checkBalance('GC-0000000001')).rejects.toThrow(AppError);
      await expect(service.checkBalance('GC-0000000001')).rejects.toThrow('Gift card is inactive');
    });
  });

  describe('validateRedemption', () => {
    it('should validate redemption with sufficient balance', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        gift_card_number: 'GC-0000000001',
        current_balance: 50.00,
        is_active: true,
        expires_at: new Date('2027-12-31'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      const result = await service.validateRedemption('GC-0000000001', 25.00);

      expect(result.success).toBe(true);
      expect(result.previous_balance).toBe(50.00);
      expect(result.amount_redeemed).toBe(25.00);
      expect(result.new_balance).toBe(25.00);
      expect(result.gift_card).toEqual(mockGiftCard);
    });

    it('should throw error for insufficient balance', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 10.00,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      await expect(service.validateRedemption('GC-0000000001', 25.00)).rejects.toThrow(AppError);
      await expect(service.validateRedemption('GC-0000000001', 25.00)).rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('should throw error for expired gift card', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 50.00,
        is_active: true,
        expires_at: new Date('2020-01-01'), // Expired
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      await expect(service.validateRedemption('GC-0000000001', 10.00)).rejects.toThrow(AppError);
      await expect(service.validateRedemption('GC-0000000001', 10.00)).rejects.toThrow('Gift card has expired');
    });

    it('should throw error if gift card inactive', async () => {
      const mockGiftCard = {
        gift_card_number: 'GC-0000000001',
        current_balance: 50.00,
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      await expect(service.validateRedemption('GC-0000000001', 10.00)).rejects.toThrow(AppError);
      await expect(service.validateRedemption('GC-0000000001', 10.00)).rejects.toThrow('Gift card is inactive');
    });
  });

  describe('adjustBalance', () => {
    it('should increase balance successfully', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 25.00,
      };

      const mockUpdatedGiftCard = {
        ...mockGiftCard,
        current_balance: 35.00,
      };

      // Mock getGiftCardById
      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });
      // Mock UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedGiftCard], rowCount: 1 });
      // Mock INSERT into gift_card_transactions
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await service.adjustBalance({
        gift_card_id: '550e8400-e29b-41d4-a716-446655440001',
        amount: 10.00,
        reason: 'Customer compensation',
        user_id: 'user-123',
      });

      expect(result.current_balance).toBe(35.00);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should decrease balance successfully', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 50.00,
      };

      const mockUpdatedGiftCard = {
        ...mockGiftCard,
        current_balance: 40.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedGiftCard], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await service.adjustBalance({
        gift_card_id: '550e8400-e29b-41d4-a716-446655440001',
        amount: -10.00,
        reason: 'Correction',
        user_id: 'user-123',
      });

      expect(result.current_balance).toBe(40.00);
    });

    it('should throw error if adjustment causes negative balance', async () => {
      const mockGiftCard = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        current_balance: 5.00,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockGiftCard], rowCount: 1 });

      await expect(
        service.adjustBalance({
          gift_card_id: '550e8400-e29b-41d4-a716-446655440001',
          amount: -10.00,
          reason: 'Test',
          user_id: 'user-123',
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.adjustBalance({
          gift_card_id: '550e8400-e29b-41d4-a716-446655440001',
          amount: -10.00,
          reason: 'Test',
          user_id: 'user-123',
        })
      ).rejects.toThrow('negative balance');
    });

    it('should throw error if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.adjustBalance({
          gift_card_id: '550e8400-e29b-41d4-a716-446655440999',
          amount: 10.00,
          reason: 'Test',
          user_id: 'user-123',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deactivateGiftCard', () => {
    it('should deactivate gift card successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '550e8400-e29b-41d4-a716-446655440001' }], rowCount: 1 });

      await service.deactivateGiftCard('550e8400-e29b-41d4-a716-446655440001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE gift_cards'),
        ['550e8400-e29b-41d4-a716-446655440001']
      );
    });

    it('should throw error if gift card not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.deactivateGiftCard('550e8400-e29b-41d4-a716-446655440999')).rejects.toThrow(AppError);
    });
  });

  describe('getGiftCardHistory', () => {
    it('should return transaction history', async () => {
      const mockHistory = [
        {
          id: 'txn-1',
          transaction_type: 'purchase',
          amount: 50.00,
          balance_before: 0,
          balance_after: 50.00,
        },
        {
          id: 'txn-2',
          transaction_type: 'redemption',
          amount: -10.00,
          balance_before: 50.00,
          balance_after: 40.00,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockHistory, rowCount: 2 });

      const result = await service.getGiftCardHistory('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no history', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getGiftCardHistory('550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual([]);
    });
  });

  describe('listGiftCards', () => {
    it('should return paginated list', async () => {
      const mockGiftCards = [
        { id: 'gc-1', gift_card_number: 'GC-0000000001', current_balance: 50.00 },
        { id: 'gc-2', gift_card_number: 'GC-0000000002', current_balance: 25.00 },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: mockGiftCards, rowCount: 2 });

      const result = await service.listGiftCards({ page: 1, limit: 20 });

      expect(result.gift_cards).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by is_active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.listGiftCards({ is_active: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $1'),
        expect.arrayContaining([true])
      );
    });

    it('should filter by customer ID', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440100';

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.listGiftCards({ purchased_by_customer_id: customerId });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('purchased_by_customer_id'),
        expect.arrayContaining([customerId])
      );
    });

    it('should filter by balance range', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.listGiftCards({ min_balance: 10, max_balance: 50 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('current_balance >='),
        expect.arrayContaining([10, 50])
      );
    });
  });
});
