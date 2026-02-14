import { pool } from '../config/database';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  name: string;
  filePath: string;
}

const SCHEMA_BASE_PATH = path.join(__dirname, '../../..', 'schema');

const createMigrationsTable = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('Schema migrations table ready');
  } finally {
    client.release();
  }
};

const getMigrationOrder = (): Migration[] => {
  const migrations: Migration[] = [];

  // Step 1: Add functions FIRST (tables may reference functions in their definitions)
  const functionsPath = path.join(SCHEMA_BASE_PATH, 'functions');
  if (fs.existsSync(functionsPath)) {
    const functionFiles = fs.readdirSync(functionsPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of functionFiles) {
      migrations.push({
        name: `function_${file.replace('.sql', '')}`,
        filePath: path.join(functionsPath, file),
      });
    }
  }

  // Step 2: Add tables in dependency order
  // Level 1: Independent tables (no foreign keys)
  const level1 = ['categories', 'terminals', 'roles', 'permissions'];

  // Level 2: First dependencies (depend on level 1)
  const level2 = ['users', 'vendors', 'customers', 'role_permissions', 'employees'];

  // Level 3: Second level dependencies
  const level3 = ['products', 'sessions', 'system_settings'];

  // Level 4: Third level dependencies
  const level4 = ['transactions', 'purchase_orders', 'inventory_count_sessions', 'price_history'];

  // Level 5: Fourth level dependencies
  const level5 = [
    'transaction_items',
    'payments',
    'purchase_order_items',
    'inventory_receiving',
    'donations',
    'accounts_payable',
    'inventory_counts',
  ];

  // Level 6: Fifth level dependencies
  const level6 = [
    'payment_details',
    'refunds',
    'receiving_items',
    'vendor_payments',
    'inventory_reconciliations',
    'inventory_adjustments',
  ];

  // Level 7: Sixth level dependencies
  const level7 = ['payment_allocations', 'import_batches', 'import_batch_items', 'inventory_snapshots', 'audit_log'];

  const allLevels = [...level1, ...level2, ...level3, ...level4, ...level5, ...level6, ...level7];

  for (const tableName of allLevels) {
    const filePath = path.join(SCHEMA_BASE_PATH, 'tables', `${tableName}.sql`);
    if (fs.existsSync(filePath)) {
      migrations.push({ name: `table_${tableName}`, filePath });
    }
  }

  // Step 3: Add views (depend on tables)
  const viewsPath = path.join(SCHEMA_BASE_PATH, 'views');
  if (fs.existsSync(viewsPath)) {
    const viewFiles = fs.readdirSync(viewsPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of viewFiles) {
      migrations.push({
        name: `view_${file.replace('.sql', '')}`,
        filePath: path.join(viewsPath, file),
      });
    }
  }

  // Step 4: Add triggers LAST (depend on both tables and functions)
  const triggersPath = path.join(SCHEMA_BASE_PATH, 'triggers');
  if (fs.existsSync(triggersPath)) {
    const triggerFiles = fs.readdirSync(triggersPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of triggerFiles) {
      migrations.push({
        name: `trigger_${file.replace('.sql', '')}`,
        filePath: path.join(triggersPath, file),
      });
    }
  }

  return migrations;
};

const isMigrationExecuted = async (migrationName: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
    [migrationName]
  );
  return result.rowCount !== null && result.rowCount > 0;
};

const executeMigration = async (migration: Migration): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = fs.readFileSync(migration.filePath, 'utf8');
    await client.query(sql);

    await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [
      migration.name,
    ]);

    await client.query('COMMIT');
    logger.info(`Migration executed: ${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Migration failed: ${migration.name}`, error);
    throw error;
  } finally {
    client.release();
  }
};

export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Starting database migrations...');

    await createMigrationsTable();

    const migrations = getMigrationOrder();
    logger.info(`Found ${migrations.length} migrations`);

    for (const migration of migrations) {
      const executed = await isMigrationExecuted(migration.name);
      if (!executed) {
        logger.info(`Executing migration: ${migration.name}`);
        await executeMigration(migration);
      } else {
        logger.debug(`Skipping already executed migration: ${migration.name}`);
      }
    }

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migrations failed:', error);
    throw error;
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}
