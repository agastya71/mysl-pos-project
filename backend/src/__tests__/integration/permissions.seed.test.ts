import { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { ROLE_PERMISSIONS, seedPermissions, seedRolePermissions } from '../../database/seed';

describe('Permission seed matrix', () => {
  let client: PoolClient;

  beforeAll(async () => {
    client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Ensure the three roles exist (idempotent — seed may not have run)
      for (const [roleName, description] of [
        ['Admin', 'Full system access'],
        ['Manager', 'Store operations and approvals'],
        ['Cashier', 'Sales transactions only'],
      ] as [string, string][]) {
        await client.query(
          `INSERT INTO roles (role_name, description, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (role_name) DO NOTHING`,
          [roleName, description],
        );
      }

      // Clear and re-seed so the test is isolated
      await client.query('DELETE FROM role_permissions');
      await client.query('DELETE FROM permissions');

      const permissionIds = await seedPermissions(client);
      await seedRolePermissions(client, permissionIds);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  it('seeds all unique permissions from the matrix', async () => {
    const allPerms = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    const result = await pool.query<{ permission_name: string }>(
      `SELECT permission_name FROM permissions WHERE permission_name = ANY($1)`,
      [allPerms],
    );
    expect(result.rows.map(r => r.permission_name).sort()).toEqual(allPerms.sort());
  });

  it('seeds no extra permissions beyond the matrix', async () => {
    const totalExpected = new Set(Object.values(ROLE_PERMISSIONS).flat()).size;
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM permissions`);
    expect(parseInt(result.rows[0].count, 10)).toBe(totalExpected);
  });

  it('assigns cashier exactly its permissions', async () => {
    const expected = ROLE_PERMISSIONS.cashier.length;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Cashier'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('assigns manager cumulative permissions (cashier + manager-additional)', async () => {
    const expected = ROLE_PERMISSIONS.cashier.length + ROLE_PERMISSIONS.manager.length;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Manager'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('assigns admin all permissions (full set)', async () => {
    const expected = new Set(Object.values(ROLE_PERMISSIONS).flat()).size;
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       WHERE r.role_name = 'Admin'`,
    );
    expect(parseInt(result.rows[0].count, 10)).toBe(expected);
  });

  it('cashier has products:read permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Cashier' AND p.permission_name = 'products:read'`,
    );
    expect(result.rowCount).toBe(1);
  });

  it('cashier does NOT have products:create permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Cashier' AND p.permission_name = 'products:create'`,
    );
    expect(result.rowCount).toBe(0);
  });

  it('admin has purchase_orders:approve permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Admin' AND p.permission_name = 'purchase_orders:approve'`,
    );
    expect(result.rowCount).toBe(1);
  });

  it('manager does NOT have purchase_orders:approve permission', async () => {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.role_name = 'Manager' AND p.permission_name = 'purchase_orders:approve'`,
    );
    expect(result.rowCount).toBe(0);
  });
});
