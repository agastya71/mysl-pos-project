import { TransactionService } from '../../../services/transaction.service';
import { pool } from '../../../config/database';

// Mock the database pool
jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockClient: any;

  beforeEach(() => {
    transactionService = new TransactionService();

    // Create a mock client with query method
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock pool.connect to return our mock client
    (pool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    const mockCashierId = 'cashier-123';
    const mockTerminalId = 'terminal-123';
    const mockProductId = 'product-123';
    const mockCustomerId = 'customer-123';

    it('should create a transaction successfully with valid data', async () => {
      const transactionData = {
        terminal_id: mockTerminalId,
        customer_id: mockCustomerId,
        items: [
          {
            product_id: mockProductId,
            quantity: 2,
            unit_price: 10.99,
          },
        ],
        payments: [
          {
            payment_method: 'cash' as const,
            amount: 25.00,
            payment_details: {
              cash_received: 30.00,
              cash_change: 5.00,
            },
          },
        ],
      };

      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }] }) // Generate transaction number
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'draft' }], rowCount: 1 }) // Insert transaction
        .mockResolvedValueOnce({ rows: [{ id: mockProductId, name: 'Test Product', price: 10.99, quantity_in_stock: 10, tax_rate: 0.08 }], rowCount: 1 }) // Get product
        .mockResolvedValueOnce({ rows: [{ id: 'item-123' }], rowCount: 1 }) // Insert item
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', subtotal: 21.98, total_amount: 23.74 }], rowCount: 1 }) // Update transaction totals
        .mockResolvedValueOnce({ rows: [{ id: 'payment-123' }], rowCount: 1 }) // Insert payment
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', status: 'completed' }], rowCount: 1 }) // Update status to completed
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'completed', total_amount: 23.74 }], rowCount: 1 }) // Get transaction with details
        .mockResolvedValueOnce({ rows: [{ id: 'item-123', quantity: 2, unit_price: 10.99 }] }) // Get items
        .mockResolvedValueOnce({ rows: [{ id: 'payment-123', method: 'cash', amount: 25.00, received_amount: 30.00 }] }) // Get payments
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await transactionService.createTransaction(mockCashierId, transactionData);

      expect(result).toBeDefined();
      expect(result.transaction_number).toBe('T001-000001');
      expect(result.status).toBe('completed');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if no items provided', async () => {
      const transactionData = {
        terminal_id: mockTerminalId,
        items: [],
        payments: [{ payment_method: 'cash' as const, amount: 10.00 }],
      };

      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // BEGIN

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow('Transaction must have at least one item');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if terminal not found', async () => {
      const transactionData = {
        terminal_id: 'invalid-terminal',
        items: [{ product_id: mockProductId, quantity: 1 }],
        payments: [{ payment_method: 'cash' as const, amount: 10.00 }],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get terminal (not found)

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow('Terminal not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if product not found', async () => {
      const transactionData = {
        terminal_id: mockTerminalId,
        items: [{ product_id: 'invalid-product', quantity: 1 }],
        payments: [{ payment_method: 'cash' as const, amount: 10.00 }],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }] }) // Generate transaction number
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'draft' }], rowCount: 1 }) // Insert transaction
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get product (not found)

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow('Product invalid-product not found or inactive');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if insufficient stock', async () => {
      const transactionData = {
        terminal_id: mockTerminalId,
        items: [{ product_id: mockProductId, quantity: 100 }],
        payments: [{ payment_method: 'cash' as const, amount: 1000.00 }],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }] }) // Generate transaction number
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', transaction_number: 'T001-000001', status: 'draft' }], rowCount: 1 }) // Insert transaction
        .mockResolvedValueOnce({ rows: [{ id: mockProductId, name: 'Test Product', price: 10.00, quantity_in_stock: 5 }], rowCount: 1 }); // Get product with low stock

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow(/Insufficient stock/);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction with details', async () => {
      const mockTransactionId = 'txn-123';
      const mockTransaction = {
        id: mockTransactionId,
        transaction_number: 'T001-000001',
        subtotal: 21.98,
        total_amount: 23.74,
        status: 'completed',
      };
      const mockItems = [
        { id: 'item-1', product_id: 'prod-1', quantity: 2, unit_price: 10.99 },
      ];
      const mockPayments = [
        { id: 'payment-1', method: 'cash', amount: 25.00, received_amount: 30.00 },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // Get transaction
        .mockResolvedValueOnce({ rows: mockItems }) // Get items
        .mockResolvedValueOnce({ rows: mockPayments }); // Get payments

      const result = await transactionService.getTransactionById(mockTransactionId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTransactionId);
      expect(result.transaction_number).toBe('T001-000001');
      expect(result.items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if transaction not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(transactionService.getTransactionById('invalid-id'))
        .rejects.toThrow('Transaction not found');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('voidTransaction', () => {
    const mockUserId = 'user-123';

    it('should void a completed transaction successfully', async () => {
      const mockTransactionId = 'txn-123';
      const voidRequest = { reason: 'Customer requested refund' };
      const mockTransaction = {
        id: mockTransactionId,
        transaction_number: 'T001-000001',
        status: 'completed',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // Get transaction
        .mockResolvedValueOnce({ rows: [{ ...mockTransaction, status: 'voided' }], rowCount: 1 }) // Update status
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await transactionService.voidTransaction(mockTransactionId, mockUserId, voidRequest);

      expect(result.status).toBe('voided');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if transaction not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get transaction (not found)

      await expect(transactionService.voidTransaction('invalid-id', mockUserId, { reason: 'test' }))
        .rejects.toThrow('Transaction not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if transaction already voided', async () => {
      const mockTransaction = {
        id: 'txn-123',
        transaction_number: 'T001-000001',
        status: 'voided',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }); // Get transaction

      await expect(transactionService.voidTransaction('txn-123', mockUserId, { reason: 'test' }))
        .rejects.toThrow('Transaction is already voided');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTransactions', () => {
    it('should return paginated list of transactions', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', total_amount: 23.74, status: 'completed' },
        { id: 'txn-2', transaction_number: 'T001-000002', total_amount: 15.50, status: 'completed' },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockTransactions }); // Transactions query

      const result = await transactionService.getTransactions({
        page: 1,
        limit: 20,
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', status: 'voided' },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockTransactions });

      const result = await transactionService.getTransactions({
        page: 1,
        limit: 20,
        status: 'voided',
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].status).toBe('voided');
    });

    it('should filter transactions by date range', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await transactionService.getTransactions({
        page: 1,
        limit: 20,
        start_date: '2026-02-01',
        end_date: '2026-02-07',
      });

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalled();
    });
  });
});
