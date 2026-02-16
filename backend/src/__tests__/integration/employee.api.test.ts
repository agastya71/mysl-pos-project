import request from 'supertest';
import express from 'express';
import employeeRoutes from '../../routes/employee.routes';
import { authenticateToken, requirePermission } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Employee API Integration Tests', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { userId: 'user-123', username: 'admin', role: 'admin' };
      next();
    });

    (requirePermission as jest.Mock).mockImplementation(() => (_req: any, _res: any, next: any) => {
      next();
    });

    app.use('/api/v1/employees', employeeRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Internal server error',
        },
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (pool.query as jest.Mock).mockImplementation(mockQuery);
  });

  describe('POST /api/v1/employees', () => {
    it('should create employee successfully', async () => {
      const requestBody = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        hire_date: '2026-02-14',
        role_id: 2,
      };

      const mockEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        ...requestBody,
        user_id: null,
        termination_date: null,
        assigned_terminal_id: null,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/employees')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.employee_number).toBe('EMP-000001');
      expect(response.body.message).toBe('Employee created successfully');
    });

    it('should return 400 for invalid email', async () => {
      const requestBody = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        hire_date: '2026-02-14',
        role_id: 2,
      };

      const response = await request(app)
        .post('/api/v1/employees')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        first_name: 'John',
        // Missing last_name, email, hire_date, role_id
      };

      const response = await request(app)
        .post('/api/v1/employees')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/employees', () => {
    it('should return paginated list of employees', async () => {
      const mockEmployees = [
        {
          id: 1,
          employee_number: 'EMP-000001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          role_name: 'manager',
          is_active: true,
        },
        {
          id: 2,
          employee_number: 'EMP-000002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          role_name: 'cashier',
          is_active: true,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEmployees, rowCount: 2 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/employees')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.employees).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
    });

    it('should filter by role_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/employees')
        .query({ role_id: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('role_id'),
        expect.any(Array)
      );
    });

    it('should filter by is_active', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/employees')
        .query({ is_active: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search by name/email/employee_number', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/employees')
        .query({ search: 'john' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });
  });

  describe('GET /api/v1/employees/:id', () => {
    it('should return employee by id', async () => {
      const mockEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role_name: 'manager',
        role_id: 2,
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 });

      const response = await request(app)
        .get('/api/v1/employees/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.employee_number).toBe('EMP-000001');
    });

    it('should return 404 if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/employees/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app)
        .get('/api/v1/employees/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/employees/:id', () => {
    it('should update employee successfully', async () => {
      const updateData = {
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

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedEmployee], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/employees/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe('John Updated');
      expect(response.body.message).toBe('Employee updated successfully');
    });

    it('should return 404 if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/employees/999')
        .send({ first_name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/api/v1/employees/1')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('should deactivate employee successfully', async () => {
      const mockDeactivatedEmployee = {
        id: 1,
        employee_number: 'EMP-000001',
        first_name: 'John',
        last_name: 'Doe',
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDeactivatedEmployee], rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/employees/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.message).toBe('Employee deactivated successfully');
    });

    it('should return 404 if employee not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/employees/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
