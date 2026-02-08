import { CustomerService} from '../../../services/customer.service';
import { pool } from '../../../config/database';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockClient: any;

  beforeEach(() => {
    customerService = new CustomerService();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pool.connect as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const customerData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        address_line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
      };

      const mockCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        ...customerData,
        loyalty_points: 0,
        total_spent: 0,
        total_transactions: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
      });

      const result = await customerService.createCustomer(customerData);

      expect(result).toBeDefined();
      expect(result.customer_number).toBe('CUST-000001');
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create customer without optional fields', async () => {
      const customerData = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const mockCustomer = {
        id: 'customer-456',
        customer_number: 'CUST-000002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: null,
        phone: null,
        address_line1: null,
        city: null,
        state: null,
        postal_code: null,
        country: 'USA',
        loyalty_points: 0,
        total_spent: 0,
        total_transactions: 0,
        is_active: true,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
      });

      const result = await customerService.createCustomer(customerData);

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Jane');
      expect(result.email).toBeNull();
    });

    it('should handle duplicate email error', async () => {
      const customerData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'existing@example.com',
      };

      mockClient.query.mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation
        constraint: 'customers_email_key',
      });

      await expect(customerService.createCustomer(customerData))
        .rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getCustomerById', () => {
    it('should return customer by ID', async () => {
      const mockCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        loyalty_points: 100,
        total_spent: 250.50,
        is_active: true,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
      });

      const result = await customerService.getCustomerById('customer-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('customer-123');
      expect(result.customer_number).toBe('CUST-000001');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(customerService.getCustomerById('invalid-id'))
        .rejects.toThrow('Customer not found');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer fields', async () => {
      const updates = {
        first_name: 'Jane',
        email: 'jane.updated@example.com',
        phone: '555-9999',
      };

      const mockUpdatedCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.updated@example.com',
        phone: '555-9999',
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockUpdatedCustomer],
        rowCount: 1,
      });

      const result = await customerService.updateCustomer('customer-123', updates);

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Jane');
      expect(result.email).toBe('jane.updated@example.com');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update address fields', async () => {
      const updates = {
        address_line1: '456 Oak Ave',
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
      };

      const mockUpdatedCustomer = {
        id: 'customer-123',
        ...updates,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockUpdatedCustomer],
        rowCount: 1,
      });

      const result = await customerService.updateCustomer('customer-123', updates);

      expect(result.address_line1).toBe('456 Oak Ave');
      expect(result.city).toBe('Boston');
    });

    it('should throw error if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(customerService.updateCustomer('invalid-id', { first_name: 'Test' }))
        .rejects.toThrow('Customer not found');
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'customer-123', is_active: false }],
        rowCount: 1,
      });

      await customerService.deleteCustomer('customer-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers SET is_active = false'),
        ['customer-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if customer not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(customerService.deleteCustomer('invalid-id'))
        .rejects.toThrow('Customer not found');
    });
  });

  describe('getCustomers', () => {
    it('should return paginated list of customers', async () => {
      const mockCustomers = [
        { id: 'c1', customer_number: 'CUST-000001', first_name: 'John', last_name: 'Doe' },
        { id: 'c2', customer_number: 'CUST-000002', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count
        .mockResolvedValueOnce({ rows: mockCustomers }); // Customers

      const result = await customerService.getCustomers({ page: 1, limit: 20 });

      expect(result.customers).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should filter customers by search query', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'c1', first_name: 'John' }] });

      const result = await customerService.getCustomers({ page: 1, limit: 20, search: 'John' });

      expect(result.customers).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });

    it('should filter by is_active status', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await customerService.getCustomers({ page: 1, limit: 20, is_active: false });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = $'),
        expect.any(Array)
      );
    });
  });

  describe('searchCustomers', () => {
    it('should search customers by query', async () => {
      const mockResults = [
        {
          id: 'c1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockResults });

      const result = await customerService.searchCustomers('John');

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('John Doe');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should search by email', async () => {
      const mockResults = [
        {
          id: 'c1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: null,
        },
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockResults });

      const result = await customerService.searchCustomers('john@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
    });

    it('should return empty array if no matches', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await customerService.searchCustomers('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
