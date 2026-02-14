import { pool } from '../../../config/database';
import * as roleService from '../../../services/role.service';
import { CreateRoleDTO, UpdateRoleDTO } from '../../../types/employee.types';

// Mock the database pool
jest.mock('../../../config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

describe('Role Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      const createDTO: CreateRoleDTO = {
        role_name: 'supervisor',
        description: 'Supervisor role for team leads',
      };

      const mockRole = {
        id: 5,
        ...createDTO,
        is_active: true,
        created_at: '2026-02-14T10:00:00Z',
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole], rowCount: 1 } as any);

      const result = await roleService.createRole(createDTO);

      expect(result).toEqual(mockRole);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        [createDTO.role_name, createDTO.description]
      );
    });

    it('should create role without description', async () => {
      const createDTO: CreateRoleDTO = {
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

      mockQuery.mockResolvedValueOnce({ rows: [mockRole], rowCount: 1 } as any);

      const result = await roleService.createRole(createDTO);

      expect(result.description).toBeNull();
    });
  });

  describe('getRoles', () => {
    it('should return all active roles', async () => {
      const mockRoles = [
        { id: 1, role_name: 'admin', is_active: true },
        { id: 2, role_name: 'manager', is_active: true },
        { id: 3, role_name: 'cashier', is_active: true },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRoles, rowCount: 3 } as any);

      const result = await roleService.getRoles();

      expect(result).toEqual(mockRoles);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no roles exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await roleService.getRoles();

      expect(result).toEqual([]);
    });
  });

  describe('getRoleById', () => {
    it('should return role by id', async () => {
      const mockRole = {
        id: 1,
        role_name: 'admin',
        description: 'Administrator role',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole], rowCount: 1 } as any);

      const result = await roleService.getRoleById(1);

      expect(result).toEqual(mockRole);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM roles WHERE id ='),
        [1]
      );
    });

    it('should return null if role not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await roleService.getRoleById(999);

      expect(result).toBeNull();
    });
  });

  describe('getRoleWithPermissions', () => {
    it('should return role with assigned permissions', async () => {
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
      } as any);

      const result = await roleService.getRoleWithPermissions(1);

      expect(result).toEqual(mockRoleWithPermissions);
      expect(result?.permissions).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('json_agg'),
        [1]
      );
    });

    it('should return role with empty permissions array if no permissions assigned', async () => {
      const mockRoleNoPermissions = {
        id: 5,
        role_name: 'trainee',
        description: 'Trainee role',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        permissions: [],
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRoleNoPermissions],
        rowCount: 1,
      } as any);

      const result = await roleService.getRoleWithPermissions(5);

      expect(result?.permissions).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const updateDTO: UpdateRoleDTO = {
        description: 'Updated description',
      };

      const mockUpdatedRole = {
        id: 1,
        role_name: 'admin',
        description: 'Updated description',
        is_active: true,
        updated_at: '2026-02-14T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRole], rowCount: 1 } as any);

      const result = await roleService.updateRole(1, updateDTO);

      expect(result).toEqual(mockUpdatedRole);
    });

    it('should return null if role not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await roleService.updateRole(999, { description: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('assignPermission', () => {
    it('should assign permission to role successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await expect(roleService.assignPermission(1, 5)).resolves.not.toThrow();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO role_permissions'),
        [1, 5]
      );
    });

    it('should handle duplicate assignment gracefully (ON CONFLICT)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(roleService.assignPermission(1, 5)).resolves.not.toThrow();
    });
  });

  describe('revokePermission', () => {
    it('should revoke permission from role successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await roleService.revokePermission(1, 5);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM role_permissions'),
        [1, 5]
      );
    });

    it('should return false if permission assignment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any);

      const result = await roleService.revokePermission(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('getPermissions', () => {
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

      mockQuery.mockResolvedValueOnce({ rows: mockPermissions, rowCount: 2 } as any);

      const result = await roleService.getPermissions();

      expect(result).toEqual(mockPermissions);
      expect(result).toHaveLength(2);
    });
  });

  describe('checkPermission', () => {
    it('should return true if user has permission', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ has_permission: true }], rowCount: 1 } as any);

      const result = await roleService.checkPermission(
        'user-uuid-123',
        'transactions',
        'create'
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM employees'),
        ['user-uuid-123', 'transactions', 'create']
      );
    });

    it('should return false if user does not have permission', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await roleService.checkPermission(
        'user-uuid-123',
        'employees',
        'delete'
      );

      expect(result).toBe(false);
    });

    it('should return false if user has no employee record', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await roleService.checkPermission(
        'nonexistent-user',
        'transactions',
        'create'
      );

      expect(result).toBe(false);
    });
  });
});
