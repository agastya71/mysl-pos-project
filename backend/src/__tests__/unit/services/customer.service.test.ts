import { CustomerService } from '../../../services/customer.service';
import { pool } from '../../../config/database';

jest.mock('../../../config/database');
jest.mock('../../../utils/logger');

describe('CustomerService', () => {
  let customerService: CustomerService;

  beforeEach(() => {
    customerService = new CustomerService();
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
        address_line2: null,
        loyalty_points: 0,
        total_spent: 0,
        total_transactions: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock email check (returns no existing customer)
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        // Mock insert customer
        .mockResolvedValueOnce({ rows: [mockCustomer], rowCount: 1 });

      const result = await customerService.createCustomer(customerData);

      expect(result).toBeDefined();
      expect(result.customer_number).toBe('CUST-000001');
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.email).toBe('john.doe@example.com');
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
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        country: 'USA',
        loyalty_points: 0,
        total_spent: 0,
        total_transactions: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // No email provided, so no email check needed
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
      });

      const result = await customerService.createCustomer(customerData);

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Jane');
      expect(result.email).toBeNull();
    });

    it('should throw error if duplicate email', async () => {
      const customerData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'existing@example.com',
      };

      // Mock email check returns existing customer
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'existing-customer' }],
        rowCount: 1,
      });

      await expect(customerService.createCustomer(customerData))
        .rejects.toThrow('Email already exists');
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
        phone: '555-1234',
        address_line1: '123 Main St',
        address_line2: null,
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'USA',
        loyalty_points: 100,
        total_spent: 250.50,
        total_transactions: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockCustomer],
        rowCount: 1,
      });

      const result = await customerService.getCustomerById('customer-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('customer-123');
      expect(result.customer_number).toBe('CUST-000001');
    });

    it('should throw error if customer not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(customerService.getCustomerById('invalid-id'))
        .rejects.toThrow('Customer not found');
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const updateData = {
        first_name: 'Johnny',
        phone: '555-5678',
      };

      const existingCustomer = {
        id: 'customer-123',
        customer_number: 'CUST-000001',
        first_name: 'John',
        email: 'john@example.com',
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateData,
      };

      // Mock getCustomerById (check customer exists)
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingCustomer], rowCount: 1 })
        // Mock update query
        .mockResolvedValueOnce({ rows: [updatedCustomer], rowCount: 1 });

      const result = await customerService.updateCustomer('customer-123', updateData);

      expect(result).toBeDefined();
      expect(result.first_name).toBe('Johnny');
      expect(result.phone).toBe('555-5678');
    });

    it('should throw error if customer not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(customerService.updateCustomer('invalid-id', { first_name: 'Test' }))
        .rejects.toThrow('Customer not found');
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer successfully', async () => {
      // Mock update query (soft delete) - returns rowCount > 0
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await expect(customerService.deleteCustomer('customer-123')).resolves.toBeUndefined();
    });

    it('should throw error if customer not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
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
        {
          id: 'customer-1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
        {
          id: 'customer-2',
          customer_number: 'CUST-000002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
        },
      ];

      // Mock COUNT query
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 })
        // Mock SELECT query
        .mockResolvedValueOnce({ rows: mockCustomers, rowCount: 2 });

      const result = await customerService.getCustomers({ page: 1, limit: 20 });

      expect(result.customers).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter customers by search query', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockCustomers, rowCount: 1 });

      const result = await customerService.getCustomers({ search: 'John', page: 1, limit: 20 });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].first_name).toBe('John');
    });

    it('should filter customers by active status', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          is_active: true,
        },
      ];

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockCustomers, rowCount: 1 });

      const result = await customerService.getCustomers({ is_active: true, page: 1, limit: 20 });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].is_active).toBe(true);
    });
  });

  describe('searchCustomers', () => {
    it('should search customers by query', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          customer_number: 'CUST-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockCustomers,
        rowCount: 1,
      });

      const result = await customerService.searchCustomers('John');

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe('John');
    });

    it('should return empty array if no matches', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await customerService.searchCustomers('NonExistent');

      expect(result).toHaveLength(0);
    });
  });
});
