/**
 * @fileoverview Customer Service - Manages customer records and relationships
 *
 * This service provides comprehensive customer management including:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Paginated customer lists with search
 * - Quick search for customer selection (checkout flow)
 * - Duplicate email prevention
 * - Soft delete (preserves historical data)
 * - Full address support (line1, line2, city, state, postal, country)
 * - Automatic customer number generation (CUST-XXXXXX)
 * - Transaction history tracking (total_spent, total_transactions)
 *
 * Database triggers automatically maintain:
 * - customer_number generation
 * - total_spent and total_transactions on transaction completion
 * - updated_at timestamps
 *
 * @module services/customer
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-01-20 (Phase 2)
 */

import { pool } from '../config/database';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
  CustomerListResponse,
  CustomerSearchResult,
} from '../types/customer.types';
import { AppError } from '../middleware/error.middleware';

/**
 * CustomerService - Handles all customer-related business logic
 *
 * This class provides methods for managing customer records with full CRUD
 * operations, search capabilities, and validation. All database operations
 * use parameterized queries to prevent SQL injection.
 *
 * @class CustomerService
 */
export class CustomerService {
  /**
   * Retrieves paginated list of customers with optional search and filters
   *
   * Supports:
   * - Pagination (page, limit)
   * - Active/inactive filtering (is_active flag)
   * - Full-text search across: first_name, last_name, email, phone, customer_number
   * - Case-insensitive search (ILIKE)
   *
   * Results are sorted by created_at DESC (newest customers first).
   * Search uses partial matching with wildcards (e.g., "john" matches "John Doe").
   *
   * @async
   * @param {CustomerListQuery} query - Query parameters
   * @param {number} [query.page=1] - Page number (1-indexed)
   * @param {number} [query.limit=20] - Items per page
   * @param {boolean} [query.is_active] - Filter by active status (true/false)
   * @param {string} [query.search] - Search term for name, email, phone, customer number
   * @returns {Promise<CustomerListResponse>} Paginated customers with metadata
   *
   * @example
   * // Get first page of all active customers
   * const result = await customerService.getCustomers({ page: 1, is_active: true });
   *
   * @example
   * // Search for customers by name or email
   * const result = await customerService.getCustomers({
   *   search: 'john',
   *   is_active: true
   * });
   * // Matches: John Doe, Johnny Smith, john@email.com, etc.
   */
  async getCustomers(query: CustomerListQuery): Promise<CustomerListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by active status if specified
    if (query.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(query.is_active);
      paramIndex++;
    }

    // Search filter - matches across multiple fields with partial matching
    // ILIKE provides case-insensitive search
    if (query.search) {
      whereConditions.push(`(
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        phone ILIKE $${paramIndex} OR
        customer_number ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results with all customer fields
    const result = await pool.query(
      `SELECT
        id, customer_number, first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        loyalty_points, total_spent, total_transactions,
        is_active, created_at, updated_at
      FROM customers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      customers: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single customer by ID
   *
   * Returns complete customer record including:
   * - Basic info (name, email, phone)
   * - Full address fields
   * - Transaction history (total_spent, total_transactions)
   * - Loyalty points
   * - Active status and timestamps
   *
   * @async
   * @param {string} id - UUID of the customer
   * @returns {Promise<Customer>} Complete customer record
   * @throws {AppError} 404 - If customer is not found
   *
   * @example
   * const customer = await customerService.getCustomerById('customer-uuid');
   * console.log(customer.customer_number); // "CUST-000123"
   * console.log(customer.total_spent); // 1250.75
   */
  async getCustomerById(id: string): Promise<Customer> {
    const result = await pool.query(
      `SELECT
        id, customer_number, first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        loyalty_points, total_spent, total_transactions,
        is_active, created_at, updated_at
      FROM customers
      WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    return result.rows[0];
  }

  /**
   * Creates a new customer with automatic customer number generation
   *
   * The database trigger 'set_customer_number' automatically generates a
   * unique customer number in format CUST-XXXXXX (e.g., CUST-000123).
   *
   * Email uniqueness is enforced - duplicate emails are rejected.
   * Only first_name and last_name are required; all other fields are optional.
   *
   * Default values:
   * - country: 'USA' if not provided
   * - is_active: true (set by database default)
   * - loyalty_points: 0 (set by database default)
   * - total_spent: 0.00 (set by database default)
   * - total_transactions: 0 (set by database default)
   *
   * @async
   * @param {CreateCustomerInput} input - Customer data
   * @param {string} input.first_name - First name (required)
   * @param {string} input.last_name - Last name (required)
   * @param {string} [input.email] - Email address (optional, must be unique)
   * @param {string} [input.phone] - Phone number (optional)
   * @param {string} [input.address_line1] - Address line 1 (optional)
   * @param {string} [input.address_line2] - Address line 2 (optional)
   * @param {string} [input.city] - City (optional)
   * @param {string} [input.state] - State/Province (optional)
   * @param {string} [input.postal_code] - Postal/ZIP code (optional)
   * @param {string} [input.country='USA'] - Country (defaults to 'USA')
   * @returns {Promise<Customer>} The created customer with auto-generated fields
   * @throws {AppError} 400 - If email already exists
   *
   * @example
   * // Minimal customer (name only)
   * const customer = await customerService.createCustomer({
   *   first_name: 'John',
   *   last_name: 'Doe'
   * });
   * // Returns customer with auto-generated customer_number: "CUST-000124"
   *
   * @example
   * // Complete customer with all fields
   * const customer = await customerService.createCustomer({
   *   first_name: 'Jane',
   *   last_name: 'Smith',
   *   email: 'jane.smith@example.com',
   *   phone: '555-0123',
   *   address_line1: '123 Main St',
   *   address_line2: 'Apt 4B',
   *   city: 'New York',
   *   state: 'NY',
   *   postal_code: '10001',
   *   country: 'USA'
   * });
   */
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    // Check for duplicate email if provided
    // Email uniqueness constraint is enforced at application level
    if (input.email) {
      const existing = await pool.query(
        'SELECT id FROM customers WHERE email = $1',
        [input.email]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already exists');
      }
    }

    // Insert customer record
    // Database trigger will automatically generate customer_number
    const result = await pool.query(
      `INSERT INTO customers (
        first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id, customer_number, first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        loyalty_points, total_spent, total_transactions,
        is_active, created_at, updated_at`,
      [
        input.first_name,
        input.last_name,
        input.email || null,
        input.phone || null,
        input.address_line1 || null,
        input.address_line2 || null,
        input.city || null,
        input.state || null,
        input.postal_code || null,
        input.country || 'USA',
      ]
    );

    return result.rows[0];
  }

  /**
   * Updates an existing customer with partial field updates
   *
   * Supports partial updates - only provided fields are updated.
   * Undefined fields are ignored, allowing selective updates.
   *
   * Email uniqueness is enforced - cannot update to an email already in use
   * by another customer.
   *
   * The updated_at timestamp is automatically set to current time.
   *
   * **Important:** To clear a field, pass null explicitly. Undefined means "don't change".
   *
   * @async
   * @param {string} id - UUID of the customer to update
   * @param {UpdateCustomerInput} input - Fields to update (partial)
   * @param {string} [input.first_name] - Update first name
   * @param {string} [input.last_name] - Update last name
   * @param {string} [input.email] - Update email (must be unique)
   * @param {string} [input.phone] - Update phone
   * @param {string} [input.address_line1] - Update address line 1
   * @param {string} [input.address_line2] - Update address line 2
   * @param {string} [input.city] - Update city
   * @param {string} [input.state] - Update state
   * @param {string} [input.postal_code] - Update postal code
   * @param {string} [input.country] - Update country
   * @param {boolean} [input.is_active] - Update active status
   * @returns {Promise<Customer>} The updated customer
   * @throws {AppError} 404 - If customer is not found
   * @throws {AppError} 400 - If email already exists or no fields to update
   *
   * @example
   * // Update only email
   * const customer = await customerService.updateCustomer('customer-uuid', {
   *   email: 'newemail@example.com'
   * });
   *
   * @example
   * // Update multiple fields
   * const customer = await customerService.updateCustomer('customer-uuid', {
   *   phone: '555-9999',
   *   address_line1: '456 Oak Ave',
   *   city: 'Boston'
   * });
   *
   * @example
   * // Deactivate customer (soft delete via is_active)
   * const customer = await customerService.updateCustomer('customer-uuid', {
   *   is_active: false
   * });
   */
  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    // Check if customer exists (throws 404 if not found)
    await this.getCustomerById(id);

    // Check for duplicate email if being updated
    // Exclude current customer from duplicate check
    if (input.email) {
      const existing = await pool.query(
        'SELECT id FROM customers WHERE email = $1 AND id != $2',
        [input.email, id]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already exists');
      }
    }

    // Build dynamic update query - only update provided fields
    // This allows partial updates without affecting other fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(input.first_name);
      paramIndex++;
    }

    if (input.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(input.last_name);
      paramIndex++;
    }

    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(input.email || null);
      paramIndex++;
    }

    if (input.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(input.phone || null);
      paramIndex++;
    }

    if (input.address_line1 !== undefined) {
      updates.push(`address_line1 = $${paramIndex}`);
      values.push(input.address_line1 || null);
      paramIndex++;
    }

    if (input.address_line2 !== undefined) {
      updates.push(`address_line2 = $${paramIndex}`);
      values.push(input.address_line2 || null);
      paramIndex++;
    }

    if (input.city !== undefined) {
      updates.push(`city = $${paramIndex}`);
      values.push(input.city || null);
      paramIndex++;
    }

    if (input.state !== undefined) {
      updates.push(`state = $${paramIndex}`);
      values.push(input.state || null);
      paramIndex++;
    }

    if (input.postal_code !== undefined) {
      updates.push(`postal_code = $${paramIndex}`);
      values.push(input.postal_code || null);
      paramIndex++;
    }

    if (input.country !== undefined) {
      updates.push(`country = $${paramIndex}`);
      values.push(input.country || 'USA');
      paramIndex++;
    }

    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(input.is_active);
      paramIndex++;
    }

    // Validate at least one field is being updated
    if (updates.length === 0) {
      throw new AppError(400, 'NO_FIELDS_TO_UPDATE', 'No fields to update');
    }

    // Always update the timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE customers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, customer_number, first_name, last_name, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        loyalty_points, total_spent, total_transactions,
        is_active, created_at, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Soft deletes a customer by setting is_active to false
   *
   * This is a soft delete - the customer record is not physically removed from
   * the database. Instead, is_active is set to false, which:
   * - Hides the customer from active customer lists
   * - Preserves historical transaction data
   * - Allows reactivation if needed (via updateCustomer)
   * - Maintains referential integrity with transactions
   *
   * The customer's transaction history remains intact and accessible.
   *
   * **Note:** This method does not return the updated customer. To verify
   * the deletion, use getCustomerById() afterward (it will still exist with is_active=false).
   *
   * @async
   * @param {string} id - UUID of the customer to delete
   * @returns {Promise<void>}
   * @throws {AppError} 404 - If customer is not found
   *
   * @example
   * // Soft delete a customer
   * await customerService.deleteCustomer('customer-uuid');
   * // Customer now has is_active = false, but record still exists
   *
   * @example
   * // Reactivate a deleted customer
   * await customerService.deleteCustomer('customer-uuid');  // Soft delete
   * await customerService.updateCustomer('customer-uuid', { is_active: true });  // Reactivate
   */
  async deleteCustomer(id: string): Promise<void> {
    const result = await pool.query(
      `UPDATE customers
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }
  }

  /**
   * Quick search for customer selection (optimized for dropdowns/autocomplete)
   *
   * Designed for fast customer lookup during checkout or transaction creation.
   * Returns minimal fields to reduce payload size and improve performance.
   *
   * Features:
   * - Limited result set (default 10, configurable)
   * - Only active customers
   * - Searches across: first_name, last_name, full_name, email, phone, customer_number
   * - Intelligent ranking: exact matches on customer_number ranked first, then name matches
   * - Case-insensitive partial matching
   *
   * Returns limited fields:
   * - id, customer_number (for selection)
   * - first_name, last_name, full_name (for display)
   * - phone, email (for verification)
   *
   * @async
   * @param {string} query - Search term (partial matching)
   * @param {number} [limit=10] - Maximum number of results to return
   * @returns {Promise<CustomerSearchResult[]>} Array of matching customers (limited fields)
   *
   * @example
   * // Search by name
   * const results = await customerService.searchCustomers('john');
   * // Returns: [{ id, customer_number: "CUST-000123", full_name: "John Doe", ... }]
   *
   * @example
   * // Search by customer number (ranked first)
   * const results = await customerService.searchCustomers('CUST-000123');
   * // Exact match on customer_number appears first
   *
   * @example
   * // Search by phone
   * const results = await customerService.searchCustomers('555-0123', 5);
   * // Returns up to 5 customers with matching phone numbers
   */
  async searchCustomers(query: string, limit: number = 10): Promise<CustomerSearchResult[]> {
    const result = await pool.query(
      `SELECT
        id,
        customer_number,
        first_name,
        last_name,
        (first_name || ' ' || last_name) as full_name,
        phone,
        email
      FROM customers
      WHERE
        is_active = true
        AND (
          first_name ILIKE $1 OR
          last_name ILIKE $1 OR
          (first_name || ' ' || last_name) ILIKE $1 OR
          email ILIKE $1 OR
          phone ILIKE $1 OR
          customer_number ILIKE $1
        )
      ORDER BY
        CASE
          WHEN customer_number ILIKE $1 THEN 1
          WHEN first_name ILIKE $1 THEN 2
          WHEN last_name ILIKE $1 THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT $2`,
      [`%${query}%`, limit]
    );

    return result.rows;
  }
}

/**
 * Singleton instance of CustomerService
 *
 * Import and use this instance rather than creating new instances:
 * @example
 * import { customerService } from '../services/customer.service';
 * const customers = await customerService.getCustomers({ page: 1 });
 */
export const customerService = new CustomerService();
