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
            amount: 23.74, // Must match calculated total: (2 × 10.99) + 8% tax
            payment_details: {
              cash_received: 30.00,
              cash_change: 6.26,
            },
          },
        ],
      };

      const mockTransactionId = 'txn-123';
      const mockTransactionNumber = 'T001-000001';
      const mockItemId = 'item-123';
      const mockPaymentId = 'payment-123';

      // Mock database responses in the correct order
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: mockTerminalId, terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: mockTransactionNumber }], rowCount: 1 }) // Generate transaction number
        .mockResolvedValueOnce({
          rows: [{
            id: mockTransactionId,
            transaction_number: mockTransactionNumber,
            status: 'draft'
          }],
          rowCount: 1
        }) // Insert transaction
        .mockResolvedValueOnce({
          rows: [{
            id: mockProductId,
            name: 'Test Product',
            base_price: 10.99,
            quantity_in_stock: 10,
            tax_rate: 8
          }],
          rowCount: 1
        }) // Get product
        .mockResolvedValueOnce({ rows: [{ id: mockItemId }], rowCount: 1 }) // Insert item
        .mockResolvedValueOnce({
          rows: [{
            id: mockPaymentId
          }],
          rowCount: 1
        }) // Insert payment
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Insert payment_details
        .mockResolvedValueOnce({
          rows: [{
            id: mockTransactionId,
            status: 'completed'
          }],
          rowCount: 1
        }) // Update transaction status
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      // Mock the getTransactionById call (uses pool.query, not mockClient.query)
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: mockTransactionId,
          transaction_number: mockTransactionNumber,
          status: 'completed',
          subtotal: 21.98,
          tax_amount: 1.76,
          total_amount: 23.74,
          items: [{
            id: mockItemId,
            product_id: mockProductId,
            quantity: 2,
            unit_price: 10.99,
            subtotal: 21.98,
            tax_amount: 1.76,
            line_total: 23.74
          }],
          payments: [{
            id: mockPaymentId,
            payment_method: 'cash',
            amount: 23.74,
            details: {
              cash_received: 30.00,
              cash_change: 6.26
            }
          }],
          cashier_name: 'Test Cashier',
          customer_name: null,
          terminal_name: 'Terminal 1'
        }],
        rowCount: 1
      });

      const result = await transactionService.createTransaction(mockCashierId, transactionData);

      expect(result).toBeDefined();
      expect(result.transaction_number).toBe(mockTransactionNumber);
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
        items: [{ product_id: mockProductId, quantity: 1, unit_price: 10.99 }],
        payments: [{ payment_method: 'cash' as const, amount: 10.99 }],
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
        items: [{ product_id: 'invalid-product', quantity: 1, unit_price: 10.99 }],
        payments: [{ payment_method: 'cash' as const, amount: 10.99 }],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }], rowCount: 1 }) // Generate number
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', status: 'draft' }], rowCount: 1 }) // Insert transaction
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get product (not found)

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow('Product invalid-product not found or inactive');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if insufficient stock', async () => {
      const transactionData = {
        terminal_id: mockTerminalId,
        items: [{ product_id: mockProductId, quantity: 100, unit_price: 10.99 }],
        payments: [{ payment_method: 'cash' as const, amount: 1099.00 }],
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ terminal_number: 'T001' }], rowCount: 1 }) // Get terminal
        .mockResolvedValueOnce({ rows: [{ transaction_number: 'T001-000001' }], rowCount: 1 }) // Generate number
        .mockResolvedValueOnce({ rows: [{ id: 'txn-123', status: 'draft' }], rowCount: 1 }) // Insert transaction
        .mockResolvedValueOnce({
          rows: [{
            id: mockProductId,
            name: 'Test Product',
            quantity_in_stock: 5
          }],
          rowCount: 1
        }); // Get product with low stock

      await expect(transactionService.createTransaction(mockCashierId, transactionData))
        .rejects.toThrow('Insufficient stock');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTransactionById', () => {
    const mockTransactionId = 'txn-123';

    it('should return transaction with details', async () => {
      const mockTransaction = {
        id: mockTransactionId,
        transaction_number: 'T001-000001',
        status: 'completed',
        subtotal: 21.98,
        tax_amount: 1.76,
        total_amount: 23.74,
        items: [
          {
            id: 'item-1',
            product_id: 'product-123',
            quantity: 2,
            unit_price: 10.99,
          },
        ],
        payments: [
          { id: 'payment-1', payment_method: 'cash', amount: 25.00 },
        ],
        cashier_name: 'Test Cashier',
        customer_name: null,
        terminal_name: 'Terminal 1',
      };

      // getTransactionById uses pool.query() directly with ONE complex query with json_agg
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockTransaction],
        rowCount: 1
      });

      const result = await transactionService.getTransactionById(mockTransactionId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTransactionId);
      expect(result.transaction_number).toBe('T001-000001');
    });

    it('should throw error if transaction not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(transactionService.getTransactionById('invalid-id'))
        .rejects.toThrow('Transaction not found');
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
      const mockItems = [
        { id: 'item-1', transaction_id: mockTransactionId, product_id: 'product-123', quantity: 2 },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // Get transaction
        .mockResolvedValueOnce({ rows: mockItems, rowCount: 1 }) // Get transaction items
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update product inventory (for each item)
        .mockResolvedValueOnce({
          rows: [{ ...mockTransaction, status: 'voided' }],
          rowCount: 1
        }) // Update transaction status
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
        .rejects.toThrow('Cannot void transaction with status: voided');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTransactions', () => {
    it('should return paginated list of transactions', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', status: 'completed', total_amount: 23.74 },
        { id: 'txn-2', transaction_number: 'T001-000002', status: 'completed', total_amount: 45.50 },
      ];

      // getTransactions uses pool.query() directly
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 }) // COUNT query
        .mockResolvedValueOnce({ rows: mockTransactions, rowCount: 2 }); // SELECT query

      const result = await transactionService.getTransactions({ page: 1, limit: 20 });

      expect(result.transactions).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter transactions by status', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', status: 'voided', total_amount: 23.74 },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockTransactions, rowCount: 1 }); // SELECT

      const result = await transactionService.getTransactions({ status: 'voided', page: 1, limit: 20 });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].status).toBe('voided');
    });

    it('should filter transactions by date range', async () => {
      const mockTransactions = [
        { id: 'txn-1', transaction_number: 'T001-000001', status: 'completed', total_amount: 23.74 },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 }) // COUNT
        .mockResolvedValueOnce({ rows: mockTransactions, rowCount: 1 }); // SELECT

      const result = await transactionService.getTransactions({
        start_date: '2026-02-01',
        end_date: '2026-02-07',
        page: 1,
        limit: 20,
      });

      expect(result.transactions).toHaveLength(1);
    });
  });
});
