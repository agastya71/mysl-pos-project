import { PoolClient } from 'pg';
import { pool } from '../config/database';
import logger from '../utils/logger';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  cashier: [
    'products:read',
    'categories:read',
    'transactions:create', 'transactions:read',
    'customers:create', 'customers:read',
    'payments:create', 'payments:read',
    'gift_cards:create', 'gift_cards:read',
  ],
  manager: [
    'transactions:update',
    'customers:update', 'customers:delete',
    'payments:update',
    'gift_cards:update', 'gift_cards:delete',
    'inventory:adjust', 'inventory:read', 'inventory:reports',
    'vendors:read',
    'purchase_orders:create', 'purchase_orders:read',
    'purchase_orders:update', 'purchase_orders:receive', 'purchase_orders:cancel',
    'employees:read',
    'roles:read',
    'permissions:read',
  ],
  admin: [
    'products:create', 'products:update', 'products:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'vendors:create', 'vendors:update', 'vendors:delete',
    'employees:create', 'employees:update', 'employees:delete',
    'purchase_orders:approve', 'purchase_orders:delete',
    'roles:create', 'roles:update',
  ],
};

export async function seedPermissions(client: PoolClient): Promise<Record<string, number>> {
  const allPermissions = new Set<string>(Object.values(ROLE_PERMISSIONS).flat());
  const permissionIds: Record<string, number> = {};
  for (const permName of allPermissions) {
    const [resource, action] = permName.split(':');
    const result = await client.query<{ id: number }>(
      `INSERT INTO permissions (permission_name, resource, action, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (permission_name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [permName, resource, action, `${action} ${resource}`],
    );
    permissionIds[permName] = result.rows[0].id;
  }
  return permissionIds;
}

export async function seedRolePermissions(
  client: PoolClient,
  permissionIds: Record<string, number>,
): Promise<void> {
  const rolesResult = await client.query<{ id: number; role_name: string }>(
    `SELECT id, role_name FROM roles WHERE role_name IN ('Admin', 'Manager', 'Cashier')`,
  );
  const roleIds: Record<string, number> = {};
  for (const row of rolesResult.rows) {
    roleIds[row.role_name] = row.id;
  }

  const cumulative: Record<string, string[]> = {
    Cashier: ROLE_PERMISSIONS.cashier,
    Manager: [...ROLE_PERMISSIONS.cashier, ...ROLE_PERMISSIONS.manager],
    Admin: [...ROLE_PERMISSIONS.cashier, ...ROLE_PERMISSIONS.manager, ...ROLE_PERMISSIONS.admin],
  };

  for (const [roleName, perms] of Object.entries(cumulative)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;
    for (const permName of perms) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permissionIds[permName]],
      );
    }
  }
}

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

    // Seed all permissions from the role-permission matrix
    const permissionIds = await seedPermissions(client);
    logger.info('Seeded all permissions');

    // Assign cumulative permissions to each role
    await seedRolePermissions(client, permissionIds);
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
