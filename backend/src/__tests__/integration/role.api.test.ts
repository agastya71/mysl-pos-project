import request from 'supertest';
import express from 'express';
import roleRoutes from '../../routes/role.routes';
import { authenticateToken } from '../../middleware/auth.middleware';
import { pool } from '../../config/database';

jest.mock('../../config/database');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../utils/logger');

describe('Role API Integration Tests', () => {
  let app: express.Application;
  let mockQuery: jest.Mock;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock) = jest.fn((req, _res, next) => {
      req.user = { userId: 'user-123', username: 'admin', role: 'admin' };
      next();
    });

    app.use('/api/v1/roles', roleRoutes);

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
    mockQuery = jest.fn();
    (pool.query as jest.Mock) = mockQuery;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/roles', () => {
    it('should create role successfully', async () => {
      const requestBody = {
        role_name: 'supervisor',
        description: 'Supervisor role for team leads',
      };

      const mockRole = {
        id: 5,
        ...requestBody,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/roles')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role_name).toBe('supervisor');
      expect(response.body.message).toBe('Role created successfully');
    });

    it('should create role without description', async () => {
      const requestBody = {
        role_name: 'trainee',
      };

      const mockRole = {
        id: 6,
        role_name: 'trainee',
        description: null,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/roles')
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBeNull();
    });

    it('should return 400 for missing role_name', async () => {
      const requestBody = {
        description: 'Test role',
      };

      const response = await request(app)
        .post('/api/v1/roles')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/roles', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        { id: 1, role_name: 'admin', description: 'Administrator', is_active: true },
        { id: 2, role_name: 'manager', description: 'Manager', is_active: true },
        { id: 3, role_name: 'cashier', description: 'Cashier', is_active: true },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRoles, rowCount: 3 });

      const response = await request(app)
        .get('/api/v1/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].role_name).toBe('admin');
    });

    it('should return empty array if no roles exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should return role with permissions', async () => {
      const mockRoleWithPermissions = {
        id: 1,
        role_name: 'admin',
        description: 'Administrator',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        permissions: [
          {
            id: 1,
            permission_name: 'transactions.create',
            resource: 'transactions',
            action: 'create',
            description: 'Create transactions',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 2,
            permission_name: 'products.update',
            resource: 'products',
            action: 'update',
            description: 'Update products',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRoleWithPermissions],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/api/v1/roles/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role_name).toBe('admin');
      expect(response.body.data.permissions).toHaveLength(2);
    });

    it('should return 404 if role not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/roles/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app)
        .get('/api/v1/roles/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/roles/:id', () => {
    it('should update role successfully', async () => {
      const updateData = {
        description: 'Updated description',
      };

      const mockUpdatedRole = {
        id: 1,
        role_name: 'admin',
        description: 'Updated description',
        is_active: true,
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRole], rowCount: 1 });

      const response = await request(app)
        .put('/api/v1/roles/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.message).toBe('Role updated successfully');
    });

    it('should return 404 if role not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .put('/api/v1/roles/999')
        .send({ description: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/roles/:id/permissions', () => {
    it('should assign permission to role successfully', async () => {
      const requestBody = {
        permission_id: 5,
      };

      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const response = await request(app)
        .post('/api/v1/roles/1/permissions')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission assigned successfully');
    });

    it('should return 400 for missing permission_id', async () => {
      const response = await request(app)
        .post('/api/v1/roles/1/permissions')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid role id', async () => {
      const response = await request(app)
        .post('/api/v1/roles/invalid/permissions')
        .send({ permission_id: 5 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/roles/:id/permissions/:permissionId', () => {
    it('should revoke permission from role successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/v1/roles/1/permissions/5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Permission revoked successfully');
    });

    it('should return 404 if permission assignment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const response = await request(app)
        .delete('/api/v1/roles/1/permissions/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid ids', async () => {
      const response = await request(app)
        .delete('/api/v1/roles/invalid/permissions/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/roles/permissions/all', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        {
          id: 1,
          permission_name: 'transactions.create',
          resource: 'transactions',
          action: 'create',
          description: 'Create transactions',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 2,
          permission_name: 'products.update',
          resource: 'products',
          action: 'update',
          description: 'Update products',
          created_at: '2026-01-01T00:00:00Z',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockPermissions, rowCount: 2 });

      const response = await request(app)
        .get('/api/v1/roles/permissions/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].permission_name).toBe('transactions.create');
    });

    it('should return empty array if no permissions exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const response = await request(app)
        .get('/api/v1/roles/permissions/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });
});
