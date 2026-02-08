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

export class CustomerService {
  /**
   * Get paginated list of customers with optional search filter
   */
  async getCustomers(query: CustomerListQuery): Promise<CustomerListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by active status
    if (query.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(query.is_active);
      paramIndex++;
    }

    // Search filter (name, email, phone, customer_number)
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

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
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
   * Get customer by ID
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
   * Create new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    // Check for duplicate email if provided
    if (input.email) {
      const existing = await pool.query(
        'SELECT id FROM customers WHERE email = $1',
        [input.email]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already exists');
      }
    }

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
   * Update customer
   */
  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    // Check if customer exists
    await this.getCustomerById(id);

    // Check for duplicate email if being updated
    if (input.email) {
      const existing = await pool.query(
        'SELECT id FROM customers WHERE email = $1 AND id != $2',
        [input.email, id]
      );
      if (existing.rowCount && existing.rowCount > 0) {
        throw new AppError(400, 'DUPLICATE_EMAIL', 'Email already exists');
      }
    }

    // Build dynamic update query
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

    if (updates.length === 0) {
      throw new AppError(400, 'NO_FIELDS_TO_UPDATE', 'No fields to update');
    }

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
   * Soft delete customer (set is_active = false)
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
   * Quick search for customer selector (limited fields, fast)
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

export const customerService = new CustomerService();
