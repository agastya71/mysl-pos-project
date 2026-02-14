/**
 * @fileoverview Role Service - Business logic for role and permission management
 *
 * This service handles all role-related database operations:
 * - Create, read, update roles
 * - Assign and revoke permissions to/from roles
 * - Retrieve all permissions
 * - Check user permissions via role membership
 *
 * Features:
 * - Role-based access control (RBAC)
 * - Many-to-many relationship between roles and permissions
 * - Permission checks for authorization middleware
 * - Active/inactive status for roles
 * - JSON aggregation for role permissions
 *
 * Database Tables:
 * - roles: Role definitions (Manager, Cashier, etc.)
 * - permissions: Available permissions (products:read, transactions:create, etc.)
 * - role_permissions: Junction table for many-to-many relationship
 * - employees: Links users to roles
 *
 * Permission Format:
 * - resource: Entity being accessed (e.g., "products", "transactions")
 * - action: Operation being performed (e.g., "read", "create", "update", "delete")
 *
 * @module services/role
 * @requires ../config/database - PostgreSQL connection pool
 * @requires ../types/employee.types - Role and permission type definitions
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-14 (Phase 4A: Employee Management)
 * @updated 2026-02-14 (Added comprehensive JSDoc documentation)
 */

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
 *
 * Inserts a new role record into the database. Role names should be unique
 * but this is not enforced at the database level (controller should validate).
 *
 * @async
 * @param {CreateRoleDTO} data - Role data to create
 * @param {string} data.role_name - Name of the role (e.g., "Manager", "Cashier")
 * @param {string} [data.description] - Optional description of role responsibilities
 * @returns {Promise<Role>} Created role record with auto-generated id and timestamps
 * @throws {Error} If database insert fails or returns no rows
 *
 * @example
 * const role = await createRole({
 *   role_name: 'Manager',
 *   description: 'Store manager with full access'
 * });
 * console.log(role.id); // Auto-generated ID
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
 *
 * Retrieves all role records from the database ordered by ID.
 * Includes both active and inactive roles.
 *
 * @async
 * @returns {Promise<Role[]>} Array of all roles
 * @throws {Error} If database query fails
 *
 * @example
 * const roles = await getRoles();
 * roles.forEach(role => {
 *   console.log(`${role.role_name}: ${role.description}`);
 * });
 */
export async function getRoles(): Promise<Role[]> {
  const query = 'SELECT * FROM roles ORDER BY id';

  const result = await pool.query(query);

  return result.rows;
}

/**
 * Get role by ID
 *
 * Retrieves a single role record by ID. Does not include permissions
 * (use getRoleWithPermissions for that). Returns null if not found.
 *
 * @async
 * @param {number} id - Role ID to retrieve
 * @returns {Promise<Role | null>} Role record, or null if not found
 * @throws {Error} If database query fails
 *
 * @example
 * const role = await getRoleById(1);
 * if (role) {
 *   console.log(role.role_name);
 * }
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
 *
 * Retrieves a single role record by ID with all assigned permissions included
 * as a JSON array. Uses PostgreSQL json_agg to aggregate permissions into a
 * single row. Returns empty array if role has no permissions.
 *
 * @async
 * @param {number} id - Role ID to retrieve
 * @returns {Promise<RoleWithPermissions | null>} Role with permissions array, or null if role not found
 * @returns {Role} return.role - Role details (id, role_name, description, etc.)
 * @returns {Permission[]} return.permissions - Array of permission objects
 * @throws {Error} If database query fails
 *
 * @example
 * const roleWithPerms = await getRoleWithPermissions(1);
 * if (roleWithPerms) {
 *   console.log(`${roleWithPerms.role_name} has ${roleWithPerms.permissions.length} permissions`);
 *   roleWithPerms.permissions.forEach(p => {
 *     console.log(`- ${p.resource}:${p.action}`);
 *   });
 * }
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
 *
 * Updates an existing role record with partial data. Only provided fields
 * are updated; omitted fields remain unchanged. Automatically sets updated_at
 * timestamp. Returns null if role not found.
 *
 * Note: Does not affect role_permissions relationships. Use assignPermission
 * and revokePermission to manage permissions.
 *
 * @async
 * @param {number} id - Role ID to update
 * @param {UpdateRoleDTO} data - Partial role data to update
 * @param {string} [data.role_name] - New role name
 * @param {string} [data.description] - New description
 * @param {boolean} [data.is_active] - Active status
 * @returns {Promise<Role | null>} Updated role record, or null if not found
 * @throws {Error} If database query fails
 *
 * @example
 * const updated = await updateRole(1, {
 *   description: 'Updated manager role description'
 * });
 *
 * @example
 * // Deactivate a role
 * await updateRole(3, { is_active: false });
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
 *
 * Creates a relationship between a role and permission in the role_permissions
 * junction table. Uses ON CONFLICT DO NOTHING to make this operation idempotent
 * (safe to call multiple times with same parameters).
 *
 * Note: Does not validate that role_id or permission_id exist. Foreign key
 * constraints will throw error if IDs are invalid.
 *
 * @async
 * @param {number} roleId - Role ID to assign permission to
 * @param {number} permissionId - Permission ID to assign
 * @returns {Promise<void>} Resolves when assignment complete (or already exists)
 * @throws {Error} If database insert fails (e.g., foreign key violation)
 *
 * @example
 * // Give Manager role the ability to create products
 * await assignPermission(1, 5); // role_id=1 (Manager), permission_id=5 (products:create)
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
 *
 * Removes the relationship between a role and permission by deleting from
 * the role_permissions junction table. Returns true if a row was deleted,
 * false if the relationship didn't exist.
 *
 * @async
 * @param {number} roleId - Role ID to revoke permission from
 * @param {number} permissionId - Permission ID to revoke
 * @returns {Promise<boolean>} True if permission was revoked, false if relationship didn't exist
 * @throws {Error} If database delete fails
 *
 * @example
 * // Remove Manager's ability to delete products
 * const revoked = await revokePermission(1, 8);
 * if (revoked) {
 *   console.log('Permission revoked');
 * } else {
 *   console.log('Permission was not assigned');
 * }
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
 *
 * Retrieves all available permissions from the database ordered by resource
 * and action. Used to display available permissions when configuring roles.
 *
 * @async
 * @returns {Promise<Permission[]>} Array of all permissions
 * @throws {Error} If database query fails
 *
 * @example
 * const permissions = await getPermissions();
 * permissions.forEach(p => {
 *   console.log(`${p.permission_name} (${p.resource}:${p.action})`);
 * });
 *
 * @example
 * // Group permissions by resource
 * const byResource = permissions.reduce((acc, p) => {
 *   if (!acc[p.resource]) acc[p.resource] = [];
 *   acc[p.resource].push(p);
 *   return acc;
 * }, {});
 */
export async function getPermissions(): Promise<Permission[]> {
  const query = 'SELECT * FROM permissions ORDER BY resource, action';

  const result = await pool.query(query);

  return result.rows;
}

/**
 * Check if user has specific permission
 *
 * Verifies if a user has a specific permission by checking through their
 * employee role assignment. Joins through employees → roles → role_permissions
 * → permissions tables. Only returns true if:
 * - User has an active employee record
 * - Employee's role is active
 * - Role has the specified permission assigned
 *
 * Used by authorization middleware to enforce access control.
 *
 * @async
 * @param {string} userId - UUID of the user to check (from auth.users table)
 * @param {string} resource - Resource being accessed (e.g., "products", "transactions")
 * @param {string} action - Action being performed (e.g., "read", "create", "update", "delete")
 * @returns {Promise<boolean>} True if user has permission, false otherwise
 * @throws {Error} If database query fails
 *
 * @example
 * // Check if user can create products
 * const canCreate = await checkPermission(
 *   'user-uuid-123',
 *   'products',
 *   'create'
 * );
 * if (canCreate) {
 *   // Allow product creation
 * }
 *
 * @example
 * // Use in authorization middleware
 * const hasPermission = await checkPermission(
 *   req.user.userId,
 *   'transactions',
 *   'delete'
 * );
 * if (!hasPermission) {
 *   throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
 * }
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
