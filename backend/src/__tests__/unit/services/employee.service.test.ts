import { pool } from '../../../config/database';
import * as employeeService from '../../../services/employee.service';
import {
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeFilters,
  EmployeePagination,
} from '../../../types/employee.types';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

describe('Employee Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create a new employee successfully', async () => {
      const createDTO: CreateEmployeeDTO = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
        hire_date: '2026-02-14',
        role_id: 2,
        assigned_terminal_id: null,
      };

      const mockEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        user_id: null,
        ...createDTO,
        termination_date: null,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as any);

      const result = await employeeService.createEmployee(createDTO);

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO employees'),
        expect.arrayContaining([
          createDTO.first_name,
          createDTO.last_name,
          createDTO.email,
          createDTO.phone,
          createDTO.hire_date,
          createDTO.role_id,
          createDTO.assigned_terminal_id,
        ])
      );
    });

    it('should create employee without optional fields', async () => {
      const createDTO: CreateEmployeeDTO = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        hire_date: '2026-02-14',
        role_id: 3,
      };

      const mockEmployee = {
        id: 2,
        employee_number: 'EMP-000002',
        user_id: null,
        phone: null,
        assigned_terminal_id: null,
        ...createDTO,
        termination_date: null,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as any);

      const result = await employeeService.createEmployee(createDTO);

      expect(result).toEqual(mockEmployee);
      expect(result.phone).toBeNull();
      expect(result.assigned_terminal_id).toBeNull();
    });

    it('should throw error if employee creation fails', async () => {
      const createDTO: CreateEmployeeDTO = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        hire_date: '2026-02-14',
        role_id: 2,
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(employeeService.createEmployee(createDTO)).rejects.toThrow(
        'Failed to create employee'
      );
    });
  });

  describe('getEmployees', () => {
    it('should return paginated list of employees', async () => {
      const filters: EmployeeFilters = { is_active: true };
      const pagination: EmployeePagination = { page: 1, limit: 10 };

      const mockEmployees = [
        {
          id: 1,
          employee_number: 'EMP-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          role_name: 'manager',
        },
        {
          id: 2,
          employee_number: 'EMP-000002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          role_name: 'cashier',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEmployees, rowCount: 2 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 } as any);

      const result = await employeeService.getEmployees(filters, pagination);

      expect(result.employees).toEqual(mockEmployees);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role_id', async () => {
      const filters: EmployeeFilters = { role_id: 2 };
      const pagination: EmployeePagination = { page: 1, limit: 10 };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      await employeeService.getEmployees(filters, pagination);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.role_id = $'),
        expect.any(Array)
      );
    });

    it('should search by name, email, or employee number', async () => {
      const filters: EmployeeFilters = { search: 'john' };
      const pagination: EmployeePagination = { page: 1, limit: 10 };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);

      await employeeService.getEmployees(filters, pagination);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });

    it('should apply pagination correctly', async () => {
      const filters: EmployeeFilters = {};
      const pagination: EmployeePagination = { page: 2, limit: 5 };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1 } as any);

      const result = await employeeService.getEmployees(filters, pagination);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([5, 5]) // limit, offset
      );
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee by id with role name', async () => {
      const mockEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        user_id: null,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
        hire_date: '2026-02-14',
        termination_date: null,
        role_id: 2,
        role_name: 'manager',
        assigned_terminal_id: null,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as any);

      const result = await employeeService.getEmployeeById(1);

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN roles'),
        [1]
      );
    });

    it('should return null if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await employeeService.getEmployeeById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateEmployee', () => {
    it('should update employee fields successfully', async () => {
      const updateDTO: UpdateEmployeeDTO = {
        first_name: 'John Updated',
        phone: '555-9999',
      };

      const mockUpdatedEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        first_name: 'John Updated',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-9999',
        role_id: 2,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedEmployee], rowCount: 1 } as any);

      const result = await employeeService.updateEmployee(1, updateDTO);

      expect(result).toEqual(mockUpdatedEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        expect.any(Array)
      );
    });

    it('should handle updating multiple fields', async () => {
      const updateDTO: UpdateEmployeeDTO = {
        first_name: 'Jane',
        last_name: 'Updated',
        email: 'jane.updated@example.com',
        role_id: 3,
      };

      const mockUpdatedEmployee = {
        id: 2,
        ...updateDTO,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedEmployee], rowCount: 1 } as any);

      const result = await employeeService.updateEmployee(2, updateDTO);

      expect(result?.first_name).toBe('Jane');
      expect(result?.last_name).toBe('Updated');
      expect(result?.role_id).toBe(3);
    });

    it('should return null if employee not found', async () => {
      const updateDTO: UpdateEmployeeDTO = { first_name: 'Test' };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await employeeService.updateEmployee(999, updateDTO);

      expect(result).toBeNull();
    });
  });

  describe('deactivateEmployee', () => {
    it('should deactivate employee successfully', async () => {
      const mockDeactivatedEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        first_name: 'John',
        last_name: 'Doe',
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDeactivatedEmployee], rowCount: 1 } as any);

      const result = await employeeService.deactivateEmployee(1);

      expect(result).toEqual(mockDeactivatedEmployee);
      expect(result?.is_active).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees'),
        [1]
      );
    });

    it('should return null if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await employeeService.deactivateEmployee(999);

      expect(result).toBeNull();
    });
  });

  describe('getEmployeeByEmail', () => {
    it('should return employee by email', async () => {
      const mockEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as any);

      const result = await employeeService.getEmployeeByEmail('john@example.com');

      expect(result).toEqual(mockEmployee);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.email ='),
        ['john@example.com']
      );
    });

    it('should return null if email not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await employeeService.getEmployeeByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });
});
