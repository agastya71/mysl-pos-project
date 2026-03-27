import { pool } from '../config/database';
import logger from '../utils/logger';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const seedDatabase = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if seed data already exists
    const terminalCheck = await client.query('SELECT id FROM terminals LIMIT 1');
    if (terminalCheck.rowCount && terminalCheck.rowCount > 0) {
      logger.info('Seed data already exists, skipping...');
      await client.query('ROLLBACK');
      return;
    }

    logger.info('Seeding database with initial data...');

    // Create default terminal
    const terminalResult = await client.query(`
      INSERT INTO terminals (terminal_name, terminal_number, location, is_active, last_heartbeat_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id
    `, ['Terminal 1', 1, 'Main Counter', true]);
    const terminalId = terminalResult.rows[0].id;
    logger.info(`Created terminal: ${terminalId}`);

    // Create admin user (only if password provided via environment)
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    let userId: string | null = null;

    if (!adminPassword) {
      logger.warn(
        'ADMIN_INITIAL_PASSWORD not set. Skipping admin user creation. ' +
        'Set ADMIN_INITIAL_PASSWORD environment variable to create the initial admin user.'
      );
    } else {
      // Validate password length
      if (adminPassword.length < 8) {
        throw new Error('ADMIN_INITIAL_PASSWORD must be at least 8 characters');
      }

      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      const userResult = await client.query(`
        INSERT INTO users (
          username,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          is_active,
          assigned_terminal_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, ['admin', 'admin@pos-system.local', hashedPassword, 'System', 'Administrator', 'admin', true, terminalId]);
      userId = userResult.rows[0].id;
      logger.info(`Created admin user: ${userId}`);
    }

    // Create sample categories
    const categories = [
      { name: 'General Merchandise', description: 'General items and miscellaneous products' },
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Apparel and accessories' },
      { name: 'Books', description: 'Books and publications' },
      { name: 'Furniture', description: 'Furniture and home goods' },
    ];

    for (const category of categories) {
      await client.query(`
        INSERT INTO categories (name, description, is_active)
        VALUES ($1, $2, $3)
      `, [category.name, category.description, true]);
    }
    logger.info(`Created ${categories.length} categories`);

    // Create system settings (requires admin user)
    if (userId) {
      await client.query(`
        INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
        VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8),
          ($9, $10, $11, $12)
      `, [
        'organization_name', 'Non-Profit Organization', 'Organization name for receipts', userId,
        'tax_rate', '0.00', 'Sales tax rate (percentage)', userId,
        'currency', 'USD', 'Default currency', userId,
      ]);
      logger.info('Created system settings');
    } else {
      logger.warn('Skipping system settings creation (no admin user created)');
    }

    // Create default roles
    const roles = [
      { role_name: 'Admin', description: 'Full system access' },
      { role_name: 'Manager', description: 'Store operations and approvals' },
      { role_name: 'Cashier', description: 'Sales transactions only' },
    ];

    const roleIds: Record<string, number> = {};
    for (const role of roles) {
      const roleResult = await client.query(`
        INSERT INTO roles (role_name, description, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id
      `, [role.role_name, role.description]);
      roleIds[role.role_name] = roleResult.rows[0].id;
    }
    logger.info('Created default roles');

    // Create payments permissions
    const paymentsPermissions = [
      { permission_name: 'payments:create', resource: 'payments', action: 'create', description: 'Initiate Square Terminal checkout' },
      { permission_name: 'payments:read', resource: 'payments', action: 'read', description: 'Poll checkout status' },
      { permission_name: 'payments:update', resource: 'payments', action: 'update', description: 'Cancel a checkout' },
    ];

    const permissionIds: Record<string, number> = {};
    for (const perm of paymentsPermissions) {
      const permResult = await client.query(`
        INSERT INTO permissions (permission_name, resource, action, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (permission_name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id
      `, [perm.permission_name, perm.resource, perm.action, perm.description]);
      permissionIds[perm.permission_name] = permResult.rows[0].id;
    }
    logger.info('Created payments permissions');

    // Assign permissions to roles
    // Admin and Manager: all payments permissions; Cashier: create and read only
    const rolePermissionMappings = [
      { roleName: 'Admin', permissionName: 'payments:create' },
      { roleName: 'Admin', permissionName: 'payments:read' },
      { roleName: 'Admin', permissionName: 'payments:update' },
      { roleName: 'Manager', permissionName: 'payments:create' },
      { roleName: 'Manager', permissionName: 'payments:read' },
      { roleName: 'Manager', permissionName: 'payments:update' },
      { roleName: 'Cashier', permissionName: 'payments:create' },
      { roleName: 'Cashier', permissionName: 'payments:read' },
    ];

    for (const mapping of rolePermissionMappings) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [roleIds[mapping.roleName], permissionIds[mapping.permissionName]]);
    }
    logger.info('Assigned permissions to roles');

    // Create admin employee record (links auth user to RBAC role)
    if (userId) {
      await client.query(`
        INSERT INTO employees (
          user_id, first_name, last_name, email,
          hire_date, role_id, is_active
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, true)
        ON CONFLICT (email) DO NOTHING
      `, [userId, 'System', 'Administrator', 'admin@pos-system.local', roleIds['Admin']]);
      logger.info('Created admin employee record');
    }

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}
