import { pool } from '../config/database';
import {
  Role,
  CreateRoleDTO,
  UpdateRoleDTO,
  Permission,
  RoleWithPermissions,
} from '../types/employee.types';

/**
 * Create a new role
 */
export async function createRole(data: CreateRoleDTO): Promise<Role> {
  const query = `
    INSERT INTO roles (role_name, description)
    VALUES ($1, $2)
    RETURNING *
  `;

  const values = [data.role_name, data.description || null];

  const result = await pool.query(query, values);

  if (result.rowCount === null || result.rowCount === 0) {
    throw new Error('Failed to create role');
  }

  return result.rows[0];
}

/**
 * Get all roles
 */
export async function getRoles(): Promise<Role[]> {
  const query = 'SELECT * FROM roles ORDER BY id';

  const result = await pool.query(query);

  return result.rows;
}

/**
 * Get role by ID
 */
export async function getRoleById(id: number): Promise<Role | null> {
  const query = 'SELECT * FROM roles WHERE id = $1';

  const result = await pool.query(query, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get role with assigned permissions
 */
export async function getRoleWithPermissions(id: number): Promise<RoleWithPermissions | null> {
  const query = `
    SELECT
      r.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'permission_name', p.permission_name,
            'resource', p.resource,
            'action', p.action,
            'description', p.description,
            'created_at', p.created_at
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) as permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE r.id = $1
    GROUP BY r.id
  `;

  const result = await pool.query(query, [id]);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update role
 */
export async function updateRole(id: number, data: UpdateRoleDTO): Promise<Role | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.role_name !== undefined) {
    fields.push(`role_name = $${paramIndex}`);
    values.push(data.role_name);
    paramIndex++;
  }

  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(data.description);
    paramIndex++;
  }

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${paramIndex}`);
    values.push(data.is_active);
    paramIndex++;
  }

  if (fields.length === 0) {
    return await getRoleById(id);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE roles
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Assign permission to role
 */
export async function assignPermission(roleId: number, permissionId: number): Promise<void> {
  const query = `
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES ($1, $2)
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `;

  await pool.query(query, [roleId, permissionId]);
}

/**
 * Revoke permission from role
 */
export async function revokePermission(roleId: number, permissionId: number): Promise<boolean> {
  const query = `
    DELETE FROM role_permissions
    WHERE role_id = $1 AND permission_id = $2
  `;

  const result = await pool.query(query, [roleId, permissionId]);

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get all permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  const query = 'SELECT * FROM permissions ORDER BY resource, action';

  const result = await pool.query(query);

  return result.rows;
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const query = `
    SELECT EXISTS(
      SELECT 1
      FROM employees e
      JOIN roles r ON e.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE e.user_id = $1
        AND e.is_active = true
        AND r.is_active = true
        AND p.resource = $2
        AND p.action = $3
    ) as has_permission
  `;

  const result = await pool.query(query, [userId, resource, action]);

  if (result.rowCount === 0) {
    return false;
  }

  return result.rows[0].has_permission;
}
