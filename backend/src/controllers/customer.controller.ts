/**
 * @fileoverview Customer Controller - HTTP request handlers for customer management
 *
 * This controller handles all customer-related API endpoints:
 * - POST /api/v1/customers - Create new customer
 * - GET /api/v1/customers - List customers with pagination and filters
 * - GET /api/v1/customers/:id - Get customer details by ID
 * - PUT /api/v1/customers/:id - Update customer (partial updates)
 * - DELETE /api/v1/customers/:id - Soft delete customer
 * - GET /api/v1/customers/search - Quick search for customer selector
 *
 * Features:
 * - Full CRUD operations with soft delete (is_active flag)
 * - Complete address support (address_line1, address_line2, city, state, postal_code, country)
 * - Customer number auto-generation (CUST-XXXXXX)
 * - Pagination and filtering for customer list
 * - Quick search for customer selector (checkout flow)
 * - Transaction history tracking via database triggers
 *
 * Customer Lifecycle:
 * 1. Create customer with name (required) and optional contact/address info
 * 2. Customer number auto-generated via database trigger
 * 3. Associate customer with transactions during checkout
 * 4. Track transaction count and total spent (updated via triggers)
 * 5. Soft delete when no longer needed (is_active = false)
 *
 * Data Handling:
 * - Empty strings converted to null/undefined for optional fields
 * - Email validation (must be valid format if provided)
 * - Phone number stored as string (max 20 characters)
 * - All address fields optional
 * - Partial updates supported (only send changed fields)
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have 'cashier' or 'manager' role
 *
 * @module controllers/customer
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../services/customer.service - Customer business logic
 * @requires ../middleware/error.middleware - Custom error handling
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { customerService } from '../services/customer.service';
import { AppError } from '../middleware/error.middleware';

/**
 * Zod validation schema for customer creation
 *
 * Validates request body for POST /api/v1/customers.
 * Ensures customer has required name fields and validates optional contact/address info.
 *
 * Required fields:
 * - first_name: Customer first name (1-100 characters)
 * - last_name: Customer last name (1-100 characters)
 *
 * Optional fields:
 * - email: Email address (must be valid format if provided, or empty string)
 * - phone: Phone number (max 20 characters)
 * - address_line1: Street address line 1 (max 255 characters)
 * - address_line2: Street address line 2 (max 255 characters)
 * - city: City name (max 100 characters)
 * - state: State/province (max 50 characters)
 * - postal_code: ZIP/postal code (max 20 characters)
 * - country: Country name (max 50 characters)
 *
 * Note: Empty strings ('') are allowed for optional fields and converted to
 * undefined in the handler before passing to service layer.
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Minimal valid request
 * {
 *   first_name: "John",
 *   last_name: "Doe"
 * }
 *
 * @example
 * // Complete customer with address
 * {
 *   first_name: "Jane",
 *   last_name: "Smith",
 *   email: "jane.smith@example.com",
 *   phone: "555-1234",
 *   address_line1: "123 Main St",
 *   address_line2: "Apt 4B",
 *   city: "New York",
 *   state: "NY",
 *   postal_code: "10001",
 *   country: "USA"
 * }
 */
const createCustomerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address_line1: z.string().max(255).optional().or(z.literal('')),
  address_line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
});

/**
 * Zod validation schema for customer updates
 *
 * Validates request body for PUT /api/v1/customers/:id.
 * All fields are optional (partial updates supported).
 *
 * Updatable fields:
 * - first_name: Customer first name (1-100 characters)
 * - last_name: Customer last name (1-100 characters)
 * - email: Email address (valid format or empty string to clear)
 * - phone: Phone number (max 20 characters or empty string to clear)
 * - address_line1-country: Address fields (empty string to clear)
 * - is_active: Active status (boolean) - use for soft delete/restore
 *
 * Empty string handling:
 * - Empty strings ('') converted to null in handler
 * - This allows clearing optional fields (e.g., remove email)
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Update only name
 * {
 *   first_name: "Jane",
 *   last_name: "Doe"
 * }
 *
 * @example
 * // Clear email and update address
 * {
 *   email: "",
 *   address_line1: "456 Oak Ave",
 *   city: "Boston",
 *   state: "MA"
 * }
 *
 * @example
 * // Soft delete customer
 * {
 *   is_active: false
 * }
 */
const updateCustomerSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address_line1: z.string().max(255).optional().or(z.literal('')),
  address_line2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postal_code: z.string().max(20).optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

/**
 * Zod validation schema for customer list query parameters
 *
 * Validates query parameters for GET /api/v1/customers.
 * All parameters are optional (defaults applied in service layer).
 *
 * Available filters:
 * - search: Search across name, email, phone, customer_number (partial match)
 * - is_active: Filter by active status (true/false)
 *
 * Pagination:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * String to number transformation:
 * - page and limit validated as numeric strings then converted to numbers
 * - is_active validated as 'true'/'false' strings then converted to boolean
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Search active customers
 * GET /api/v1/customers?search=john&is_active=true&page=1&limit=20
 *
 * @example
 * // List all customers (including inactive)
 * GET /api/v1/customers?page=1&limit=50
 */
const customerListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
});

/**
 * Zod validation schema for customer search (quick search)
 *
 * Validates query parameters for GET /api/v1/customers/search.
 * Used for customer selector dropdown during checkout.
 *
 * Required parameters:
 * - q: Search query (min 1 character) - searches name, email, phone, customer_number
 *
 * Optional parameters:
 * - limit: Max results to return (default: 10) - keep low for quick selector
 *
 * Returns only active customers sorted by relevance (exact matches first).
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Quick search in checkout
 * GET /api/v1/customers/search?q=john&limit=5
 */
const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Customer Controller Class
 *
 * Handles HTTP requests for customer management with 6 endpoints:
 * - getCustomers: List customers with filters and pagination
 * - getCustomerById: Retrieve customer details by ID
 * - createCustomer: Create new customer with auto-generated customer_number
 * - updateCustomer: Update customer with partial field updates
 * - deleteCustomer: Soft delete customer (set is_active = false)
 * - searchCustomers: Quick search for customer selector
 *
 * All methods use try-catch pattern with NextFunction for error handling.
 * Zod validation errors are converted to AppError with 400 status.
 * Business logic errors are passed through to global error middleware.
 *
 * Empty string handling:
 * - createCustomer: Empty strings → undefined (omitted from insert)
 * - updateCustomer: Empty strings → null (clears field in database)
 *
 * @class CustomerController
 */
export class CustomerController {
  /**
   * Get paginated list of customers
   *
   * HTTP: GET /api/v1/customers
   *
   * Retrieves customer list with optional search and filtering.
   * Supports pagination with configurable page size.
   *
   * Available filters:
   * - search: Searches across name, email, phone, customer_number (case-insensitive, partial match)
   * - is_active: Filter by active status (true for active only, false for inactive only, omit for all)
   *
   * Returns customer summary (not full details):
   * - id, customer_number, full_name (computed), email, phone
   * - transaction_count, total_spent (from triggers)
   * - is_active status
   *
   * Pagination metadata included:
   * - page: Current page number
   * - limit: Items per page
   * - total: Total customers matching filters
   * - totalPages: Total pages available
   *
   * @async
   * @param {Request} req - Express request with query parameters
   * @param {Response} res - Express response with customer list and pagination
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 200 OK with customer list and pagination metadata
   * @throws {AppError} 400 if query parameters invalid (non-numeric page/limit, invalid is_active)
   *
   * @example
   * // Request
   * GET /api/v1/customers?search=john&is_active=true&page=1&limit=20
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     customers: [
   *       {
   *         id: "customer-uuid",
   *         customer_number: "CUST-000123",
   *         first_name: "John",
   *         last_name: "Doe",
   *         email: "john.doe@example.com",
   *         phone: "555-1234",
   *         transaction_count: 5,
   *         total_spent: "450.00",
   *         is_active: true
   *       }
   *     ],
   *     pagination: {
   *       page: 1,
   *       limit: 20,
   *       total: 42,
   *       totalPages: 3
   *     }
   *   }
   * }
   *
   * @see customerService.getCustomers for implementation
   */
  async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = customerListQuerySchema.parse(req.query);
      const result = await customerService.getCustomers(query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'INVALID_QUERY_PARAMS', 'Invalid query parameters', error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * Get customer details by ID
   *
   * HTTP: GET /api/v1/customers/:id
   *
   * Retrieves complete customer details including all fields.
   * Used for customer detail view and edit forms.
   *
   * Returns full customer record:
   * - id, customer_number, created_at, updated_at
   * - first_name, last_name, email, phone
   * - Complete address (address_line1, address_line2, city, state, postal_code, country)
   * - transaction_count, total_spent (from triggers)
   * - is_active status
   *
   * @async
   * @param {Request} req - Express request with customer ID in params
   * @param {Response} res - Express response with customer details
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 200 OK with customer details
   * @throws {AppError} 404 if customer not found
   *
   * @example
   * // Request
   * GET /api/v1/customers/customer-uuid
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: {
   *     id: "customer-uuid",
   *     customer_number: "CUST-000123",
   *     first_name: "John",
   *     last_name: "Doe",
   *     email: "john.doe@example.com",
   *     phone: "555-1234",
   *     address_line1: "123 Main St",
   *     address_line2: "Apt 4B",
   *     city: "New York",
   *     state: "NY",
   *     postal_code: "10001",
   *     country: "USA",
   *     transaction_count: 5,
   *     total_spent: "450.00",
   *     is_active: true,
   *     created_at: "2026-02-01T10:00:00Z",
   *     updated_at: "2026-02-08T10:00:00Z"
   *   }
   * }
   *
   * @see customerService.getCustomerById for implementation
   */
  async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customerService.getCustomerById(id);

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new customer
   *
   * HTTP: POST /api/v1/customers
   *
   * Creates new customer with auto-generated customer_number (CUST-XXXXXX).
   * Only name is required; all contact and address fields are optional.
   *
   * Customer creation flow:
   * 1. Validate request body (name required, optional fields validated)
   * 2. Convert empty strings to undefined (omit from insert)
   * 3. Insert customer record into database
   * 4. Database trigger generates customer_number (CUST-000001, CUST-000002, etc.)
   * 5. Initialize transaction_count = 0 and total_spent = 0.00
   * 6. Return created customer with generated fields
   *
   * Empty string handling:
   * - Empty strings ('') converted to undefined
   * - Undefined fields omitted from INSERT statement
   * - Database defaults to NULL for optional fields
   *
   * @async
   * @param {Request} req - Express request with customer data in body
   * @param {Response} res - Express response with created customer
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 201 Created with customer details
   * @throws {AppError} 400 if validation fails (missing name, invalid email format, field too long)
   * @throws {AppError} 409 if email already exists (unique constraint)
   *
   * @example
   * // Request - minimal customer
   * POST /api/v1/customers
   * {
   *   first_name: "John",
   *   last_name: "Doe"
   * }
   *
   * @example
   * // Request - complete customer
   * POST /api/v1/customers
   * {
   *   first_name: "Jane",
   *   last_name: "Smith",
   *   email: "jane.smith@example.com",
   *   phone: "555-5678",
   *   address_line1: "456 Oak Ave",
   *   city: "Boston",
   *   state: "MA",
   *   postal_code: "02101",
   *   country: "USA"
   * }
   *
   * @example
   * // Response (201 Created)
   * {
   *   success: true,
   *   message: "Customer created successfully",
   *   data: {
   *     id: "customer-uuid",
   *     customer_number: "CUST-000124",
   *     first_name: "Jane",
   *     last_name: "Smith",
   *     email: "jane.smith@example.com",
   *     phone: "555-5678",
   *     address_line1: "456 Oak Ave",
   *     address_line2: null,
   *     city: "Boston",
   *     state: "MA",
   *     postal_code: "02101",
   *     country: "USA",
   *     transaction_count: 0,
   *     total_spent: "0.00",
   *     is_active: true,
   *     created_at: "2026-02-08T10:30:00Z",
   *     updated_at: "2026-02-08T10:30:00Z"
   *   }
   * }
   *
   * @see customerService.createCustomer for implementation
   * @see database trigger `generate_customer_number` for auto-numbering
   */
  async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createCustomerSchema.parse(req.body);

      // Convert empty strings to undefined for optional fields
      // Undefined fields are omitted from INSERT, defaulting to NULL in database
      const cleanInput = {
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email && input.email !== '' ? input.email : undefined,
        phone: input.phone && input.phone !== '' ? input.phone : undefined,
        address_line1: input.address_line1 && input.address_line1 !== '' ? input.address_line1 : undefined,
        address_line2: input.address_line2 && input.address_line2 !== '' ? input.address_line2 : undefined,
        city: input.city && input.city !== '' ? input.city : undefined,
        state: input.state && input.state !== '' ? input.state : undefined,
        postal_code: input.postal_code && input.postal_code !== '' ? input.postal_code : undefined,
        country: input.country && input.country !== '' ? input.country : undefined,
      };

      const customer = await customerService.createCustomer(cleanInput);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'INVALID_CUSTOMER_DATA', 'Invalid customer data', error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * Update customer
   *
   * HTTP: PUT /api/v1/customers/:id
   *
   * Updates customer with partial field updates. Only send fields you want to change.
   * Empty strings clear the field (set to null in database).
   *
   * Updatable fields:
   * - first_name, last_name (cannot be empty if provided)
   * - email, phone (empty string clears field)
   * - address_line1, address_line2, city, state, postal_code, country (empty string clears)
   * - is_active (boolean) - use for soft delete/restore
   *
   * Empty string handling:
   * - Empty strings ('') converted to null
   * - Null values update database to NULL (clears field)
   * - Allows clearing optional fields that were previously set
   *
   * Partial update logic:
   * - Only provided fields are included in UPDATE statement
   * - Omitted fields remain unchanged in database
   * - SET clause built dynamically based on provided fields
   *
   * @async
   * @param {Request} req - Express request with customer ID in params and update data in body
   * @param {Response} res - Express response with updated customer
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 200 OK with updated customer details
   * @throws {AppError} 400 if validation fails (invalid email format, name empty, field too long)
   * @throws {AppError} 404 if customer not found
   * @throws {AppError} 409 if email already exists (unique constraint)
   *
   * @example
   * // Request - update name only
   * PUT /api/v1/customers/customer-uuid
   * {
   *   first_name: "Jane",
   *   last_name: "Doe-Smith"
   * }
   *
   * @example
   * // Request - clear email and update address
   * PUT /api/v1/customers/customer-uuid
   * {
   *   email: "",
   *   address_line1: "789 Elm St",
   *   city: "Chicago",
   *   state: "IL"
   * }
   *
   * @example
   * // Request - soft delete customer
   * PUT /api/v1/customers/customer-uuid
   * {
   *   is_active: false
   * }
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   message: "Customer updated successfully",
   *   data: {
   *     id: "customer-uuid",
   *     customer_number: "CUST-000123",
   *     first_name: "Jane",
   *     last_name: "Doe-Smith",
   *     email: null,
   *     phone: "555-1234",
   *     address_line1: "789 Elm St",
   *     city: "Chicago",
   *     state: "IL",
   *     is_active: true,
   *     updated_at: "2026-02-08T11:00:00Z"
   *   }
   * }
   *
   * @see customerService.updateCustomer for implementation
   */
  async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = updateCustomerSchema.parse(req.body);

      // Convert empty strings to null for optional fields
      // Only include fields that were actually provided in the request
      const cleanInput: any = {};
      if (input.first_name !== undefined) cleanInput.first_name = input.first_name;
      if (input.last_name !== undefined) cleanInput.last_name = input.last_name;
      if (input.email !== undefined) cleanInput.email = input.email === '' ? null : input.email;
      if (input.phone !== undefined) cleanInput.phone = input.phone === '' ? null : input.phone;
      if (input.address_line1 !== undefined) cleanInput.address_line1 = input.address_line1 === '' ? null : input.address_line1;
      if (input.address_line2 !== undefined) cleanInput.address_line2 = input.address_line2 === '' ? null : input.address_line2;
      if (input.city !== undefined) cleanInput.city = input.city === '' ? null : input.city;
      if (input.state !== undefined) cleanInput.state = input.state === '' ? null : input.state;
      if (input.postal_code !== undefined) cleanInput.postal_code = input.postal_code === '' ? null : input.postal_code;
      if (input.country !== undefined) cleanInput.country = input.country === '' ? null : input.country;
      if (input.is_active !== undefined) cleanInput.is_active = input.is_active;

      const customer = await customerService.updateCustomer(id, cleanInput);

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'INVALID_CUSTOMER_DATA', 'Invalid customer data', error.errors));
      } else {
        next(error);
      }
    }
  }

  /**
   * Soft delete customer
   *
   * HTTP: DELETE /api/v1/customers/:id
   *
   * Soft deletes customer by setting is_active = false.
   * Customer record remains in database but hidden from active customer lists.
   *
   * Soft delete benefits:
   * - Preserves transaction history (customer_id foreign keys remain valid)
   * - Maintains referential integrity
   * - Allows customer restoration if needed (via UPDATE is_active = true)
   * - Audit trail preserved (created_at, updated_at)
   *
   * Effects:
   * - Customer hidden from customer list (when is_active filter = true)
   * - Customer hidden from customer selector in checkout
   * - Historical transactions still show customer name
   * - Customer can be restored via PUT /api/v1/customers/:id with is_active = true
   *
   * Hard delete (permanent removal) is not supported to maintain data integrity.
   *
   * @async
   * @param {Request} req - Express request with customer ID in params
   * @param {Response} res - Express response with success message
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 200 OK with success message
   * @throws {AppError} 404 if customer not found
   *
   * @example
   * // Request
   * DELETE /api/v1/customers/customer-uuid
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   message: "Customer deleted successfully"
   * }
   *
   * @see customerService.deleteCustomer for implementation
   */
  async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await customerService.deleteCustomer(id);

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick search customers for customer selector
   *
   * HTTP: GET /api/v1/customers/search
   *
   * Fast customer search for dropdown selector during checkout.
   * Searches across name, email, phone, and customer_number with partial matching.
   *
   * Search behavior:
   * - Case-insensitive partial match
   * - Searches first_name, last_name, email, phone, customer_number
   * - Returns only active customers (is_active = true)
   * - Results sorted by relevance (exact matches first, then partial)
   * - Limited to configurable max results (default 10, for dropdown performance)
   *
   * Use cases:
   * - Customer selector dropdown in checkout flow
   * - Quick customer lookup by name/phone/email
   * - Typeahead search (search as user types)
   *
   * Returns minimal customer info for selector:
   * - id, customer_number, first_name, last_name, email, phone
   * - Omits address and transaction statistics for performance
   *
   * @async
   * @param {Request} req - Express request with search query in query params
   * @param {Response} res - Express response with search results
   * @param {NextFunction} next - Express next function for error handling
   * @returns {Promise<void>} Sends 200 OK with search results
   * @throws {AppError} 400 if search query missing or invalid
   *
   * @example
   * // Request - search by name
   * GET /api/v1/customers/search?q=john&limit=5
   *
   * @example
   * // Request - search by email
   * GET /api/v1/customers/search?q=jane@example&limit=10
   *
   * @example
   * // Request - search by customer number
   * GET /api/v1/customers/search?q=CUST-000123
   *
   * @example
   * // Response (200 OK)
   * {
   *   success: true,
   *   data: [
   *     {
   *       id: "customer-uuid-1",
   *       customer_number: "CUST-000123",
   *       first_name: "John",
   *       last_name: "Doe",
   *       email: "john.doe@example.com",
   *       phone: "555-1234"
   *     },
   *     {
   *       id: "customer-uuid-2",
   *       customer_number: "CUST-000456",
   *       first_name: "Johnny",
   *       last_name: "Smith",
   *       email: "johnny@example.com",
   *       phone: "555-5678"
   *     }
   *   ]
   * }
   *
   * @see customerService.searchCustomers for implementation with ILIKE query
   */
  async searchCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, limit } = searchQuerySchema.parse(req.query);
      const results = await customerService.searchCustomers(q, limit);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, 'INVALID_SEARCH_QUERY', 'Invalid search query', error.errors));
      } else {
        next(error);
      }
    }
  }
}

/**
 * Export singleton instance for use in routes
 *
 * Routes import this export and call methods directly:
 * - router.post('/', customerController.createCustomer.bind(customerController))
 * - router.get('/', customerController.getCustomers.bind(customerController))
 * - router.get('/search', customerController.searchCustomers.bind(customerController))
 * - router.get('/:id', customerController.getCustomerById.bind(customerController))
 * - router.put('/:id', customerController.updateCustomer.bind(customerController))
 * - router.delete('/:id', customerController.deleteCustomer.bind(customerController))
 *
 * Note: /search route must be defined before /:id route to avoid conflict
 *
 * @constant
 * @type {CustomerController}
 *
 * @see ../routes/customer.routes.ts for route definitions
 */
export const customerController = new CustomerController();
