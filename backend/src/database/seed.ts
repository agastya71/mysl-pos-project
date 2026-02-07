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

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
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
    const userId = userResult.rows[0].id;
    logger.info(`Created admin user: ${userId}`);

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

    // Create system settings
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
