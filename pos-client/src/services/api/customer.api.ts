/**
 * @fileoverview Customer API Service - Frontend API client for customer operations
 *
 * This service provides API methods for customer operations:
 * - getCustomers: List customers with filters and pagination
 * - getCustomerById: Get complete customer details by ID
 * - createCustomer: Create new customer with contact and address info
 * - updateCustomer: Update existing customer information
 * - deleteCustomer: Soft delete customer (preserves transaction history)
 * - searchCustomers: Quick search for customer selector (typeahead)
 *
 * Use Cases:
 * - Customer management: Admin interface for customer list and CRUD operations
 * - Checkout integration: Customer selector for associating customer with transaction
 * - Customer search: Real-time search as cashier types
 * - Customer details: View/edit customer information and transaction history
 *
 * Customer Information:
 * - Contact: email, phone (optional)
 * - Address: address_line1, address_line2, city, state, postal_code, country (all optional)
 * - Auto-generated: customer_number (CUST-XXXXXX format)
 * - Tracking: total_purchases, total_spent (updated by database trigger)
 * - Status: is_active flag for soft delete
 *
 * API Endpoints:
 * - GET /api/v1/customers - List customers (with query params)
 * - GET /api/v1/customers/:id - Get customer by ID
 * - POST /api/v1/customers - Create customer
 * - PUT /api/v1/customers/:id - Update customer
 * - DELETE /api/v1/customers/:id - Soft delete customer
 * - GET /api/v1/customers/search?q={query} - Quick search
 *
 * @module services/api/customer
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/api.types - API response types
 * @requires ../../types/customer.types - Customer types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';
import {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListQuery,
  CustomerListResponse,
  CustomerSearchResult,
} from '../../types/customer.types';

/**
 * Customer API Service
 *
 * Provides methods for customer operations in POS system.
 * All methods use apiClient for HTTP requests with consistent error handling.
 *
 * Methods:
 * - getCustomers: List customers with full filters and pagination
 * - getCustomerById: Get complete customer details with transaction stats
 * - createCustomer: Create new customer with auto-generated customer_number
 * - updateCustomer: Update customer information (partial updates supported)
 * - deleteCustomer: Soft delete customer (preserves transaction history)
 * - searchCustomers: Quick search for customer selector (typeahead)
 *
 * Usage in Redux:
 * - Called from customers.slice.ts async thunks
 * - Responses stored in Redux customers state
 * - Errors handled by Redux thunk rejection
 *
 * @constant
 * @type {object}
 */
export const customerApi = {
  /**
   * List customers with filters and pagination
   *
   * HTTP: GET /api/v1/customers (with query parameters)
   *
   * Retrieves paginated customer list with optional filtering and search.
   * Used for customer management page and customer reports.
   *
   * Available filters (CustomerListQuery):
   * - search: Search across full_name, email, phone, customer_number
   * - is_active: Filter by active status (true/false)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   *
   * Search behavior:
   * - Case-insensitive partial match
   * - Searches: full_name, email, phone, customer_number
   * - Returns customers with any field matching query
   *
   * Returns customer list with:
   * - customers: Array of customer objects with full details
   * - pagination: Page metadata (page, limit, total, totalPages)
   *
   * Use cases:
   * - Customer management list page
   * - Customer reports and analytics
   * - Customer lookup by admin
   *
   * @async
   * @function getCustomers
   * @param {CustomerListQuery} [query={}] - Filter and pagination parameters
   * @returns {Promise<CustomerListResponse>} Customer list with pagination metadata
   * @throws {Error} If request fails (network error, server error)
   *
   * @example
   * // Get first page of customers
   * const results = await customerApi.getCustomers({ page: 1, limit: 20 });
   * console.log('Total customers:', results.pagination.total);
   *
   * @example
   * // Search by name or email
   * const results = await customerApi.getCustomers({
   *   search: 'john',
   *   is_active: true,
   *   page: 1,
   *   limit: 20
   * });
   * console.log('Matching customers:', results.customers);
   *
   * @example
   * // Get active customers only
   * const results = await customerApi.getCustomers({
   *   is_active: true,
   *   page: 1,
   *   limit: 50
   * });
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const fetchCustomers = createAsyncThunk(
   *   'customers/fetchAll',
   *   async (filters: CustomerListQuery) => {
   *     return await customerApi.getCustomers(filters);
   *   }
   * );
   *
   * @see CustomerListQuery type in ../../types/customer.types.ts
   * @see CustomerListResponse type in ../../types/customer.types.ts
   * @see customers.slice.ts for Redux integration
   */
  getCustomers: async (query: CustomerListQuery = {}): Promise<CustomerListResponse> => {
    const params = new URLSearchParams();

    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.is_active !== undefined) params.append('is_active', query.is_active.toString());

    const queryString = params.toString();
    const url = queryString ? `/customers?${queryString}` : '/customers';

    const response = await apiClient.get<ApiResponse<CustomerListResponse>>(url);
    return response.data.data!;
  },

  /**
   * Get customer details by ID
   *
   * HTTP: GET /api/v1/customers/:id
   *
   * Retrieves complete customer details including contact info, address,
   * and transaction statistics (total_purchases, total_spent).
   * Used for customer detail view and edit forms.
   *
   * Returns full customer record:
   * - id, customer_number (CUST-XXXXXX), full_name
   * - email, phone (contact information)
   * - address_line1, address_line2, city, state, postal_code, country
   * - total_purchases, total_spent (auto-updated by trigger)
   * - is_active, created_at, updated_at
   *
   * Transaction statistics:
   * - total_purchases: Count of completed transactions
   * - total_spent: Sum of all transaction amounts
   * - Updated automatically via database trigger on transaction completion
   *
   * Use cases:
   * - Customer detail view (show full profile)
   * - Customer edit form (pre-fill data)
   * - Transaction history (customer context)
   * - Customer analytics (purchase patterns)
   *
   * @async
   * @function getCustomerById
   * @param {string} id - Customer UUID
   * @returns {Promise<Customer>} Complete customer details
   * @throws {Error} If customer not found (404) or request fails
   *
   * @example
   * // Get customer details
   * const customer = await customerApi.getCustomerById('customer-uuid');
   * console.log('Customer:', customer.full_name);
   * console.log('Email:', customer.email);
   * console.log('Total purchases:', customer.total_purchases);
   * console.log('Total spent:', customer.total_spent);
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const fetchCustomerById = createAsyncThunk(
   *   'customers/fetchById',
   *   async (id: string) => {
   *     return await customerApi.getCustomerById(id);
   *   }
   * );
   *
   * @see Customer type in ../../types/customer.types.ts
   * @see customers.slice.ts for Redux integration
   */
  getCustomerById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data!;
  },

  /**
   * Create new customer
   *
   * HTTP: POST /api/v1/customers
   *
   * Creates new customer with auto-generated customer_number (CUST-XXXXXX format).
   * Customer number generated sequentially via database trigger.
   *
   * Required fields:
   * - full_name: Customer's full name (1-100 characters)
   *
   * Optional fields:
   * - email: Email address (validated format)
   * - phone: Phone number
   * - address_line1, address_line2: Street address
   * - city, state, postal_code, country: Location details
   *
   * Auto-generated fields:
   * - id: UUID primary key
   * - customer_number: Sequential CUST-000001, CUST-000002, etc.
   * - total_purchases: Initialized to 0
   * - total_spent: Initialized to 0.00
   * - is_active: Initialized to true
   * - created_at, updated_at: Timestamps
   *
   * Validation:
   * - full_name required and non-empty
   * - email must be valid format if provided
   * - All address fields optional but recommended for complete records
   *
   * @async
   * @function createCustomer
   * @param {CreateCustomerInput} data - Customer data (name, contact, address)
   * @returns {Promise<Customer>} Created customer with auto-generated customer_number
   * @throws {Error} If validation fails or request fails
   *
   * @example
   * // Create customer with full details
   * const customer = await customerApi.createCustomer({
   *   full_name: 'John Smith',
   *   email: 'john.smith@example.com',
   *   phone: '555-0123',
   *   address_line1: '123 Main St',
   *   address_line2: 'Apt 4B',
   *   city: 'Springfield',
   *   state: 'IL',
   *   postal_code: '62701',
   *   country: 'USA'
   * });
   * console.log('Created customer:', customer.customer_number);
   *
   * @example
   * // Create customer with minimal info
   * const customer = await customerApi.createCustomer({
   *   full_name: 'Jane Doe',
   *   email: 'jane@example.com'
   * });
   * console.log('Customer number:', customer.customer_number);
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const createCustomer = createAsyncThunk(
   *   'customers/create',
   *   async (data: CreateCustomerInput) => {
   *     return await customerApi.createCustomer(data);
   *   }
   * );
   *
   * @see CreateCustomerInput type in ../../types/customer.types.ts
   * @see Customer type in ../../types/customer.types.ts
   * @see customers.slice.ts for Redux integration
   */
  createCustomer: async (data: CreateCustomerInput): Promise<Customer> => {
    const response = await apiClient.post<ApiResponse<Customer>>('/customers', data);
    return response.data.data!;
  },

  /**
   * Update existing customer
   *
   * HTTP: PUT /api/v1/customers/:id
   *
   * Updates customer information with partial update support.
   * Only fields provided in the request will be updated.
   *
   * Updatable fields:
   * - full_name: Customer's full name
   * - email: Email address
   * - phone: Phone number
   * - address_line1, address_line2: Street address
   * - city, state, postal_code, country: Location details
   *
   * Non-updatable fields (managed by system):
   * - id, customer_number: Immutable identifiers
   * - total_purchases, total_spent: Updated by trigger
   * - created_at: Immutable timestamp
   * - updated_at: Auto-updated by database
   *
   * Empty string handling:
   * - Empty strings converted to null (clears field value)
   * - Useful for removing optional data (e.g., clear phone number)
   *
   * Validation:
   * - full_name cannot be empty if provided
   * - email must be valid format if provided
   * - Customer must exist and not be deleted
   *
   * @async
   * @function updateCustomer
   * @param {string} id - Customer UUID to update
   * @param {UpdateCustomerInput} data - Customer data to update (partial)
   * @returns {Promise<Customer>} Updated customer with new data
   * @throws {Error} If customer not found (404) or validation fails
   *
   * @example
   * // Update contact information
   * const customer = await customerApi.updateCustomer('customer-uuid', {
   *   email: 'newemail@example.com',
   *   phone: '555-9999'
   * });
   * console.log('Updated customer:', customer.full_name);
   *
   * @example
   * // Update address only
   * const customer = await customerApi.updateCustomer('customer-uuid', {
   *   address_line1: '456 Oak Ave',
   *   city: 'Chicago',
   *   state: 'IL',
   *   postal_code: '60601'
   * });
   *
   * @example
   * // Clear phone number (empty string → null)
   * const customer = await customerApi.updateCustomer('customer-uuid', {
   *   phone: ''
   * });
   * console.log('Phone cleared:', customer.phone); // null
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const updateCustomer = createAsyncThunk(
   *   'customers/update',
   *   async ({ id, data }: { id: string; data: UpdateCustomerInput }) => {
   *     return await customerApi.updateCustomer(id, data);
   *   }
   * );
   *
   * @see UpdateCustomerInput type in ../../types/customer.types.ts
   * @see Customer type in ../../types/customer.types.ts
   * @see customers.slice.ts for Redux integration
   */
  updateCustomer: async (id: string, data: UpdateCustomerInput): Promise<Customer> => {
    const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete customer (soft delete)
   *
   * HTTP: DELETE /api/v1/customers/:id
   *
   * Soft deletes customer by setting is_active = false.
   * Preserves customer record and transaction history for data integrity.
   *
   * Soft delete behavior:
   * - Sets is_active = false (customer marked as inactive)
   * - Customer record remains in database
   * - Transaction history preserved (historical data intact)
   * - Customer excluded from active customer lists
   * - Can be reactivated by setting is_active = true via update
   *
   * Why soft delete:
   * - Maintains referential integrity (transaction.customer_id remains valid)
   * - Preserves historical transaction data
   * - Enables customer reactivation if needed
   * - Supports audit trails and compliance requirements
   *
   * Hard delete not supported:
   * - Would break transaction history
   * - Would violate foreign key constraints
   * - Would lose valuable historical data
   *
   * Validation:
   * - Customer must exist
   * - Already deleted customers can be deleted again (idempotent)
   *
   * @async
   * @function deleteCustomer
   * @param {string} id - Customer UUID to delete
   * @returns {Promise<void>} Resolves when customer deleted
   * @throws {Error} If customer not found (404) or request fails
   *
   * @example
   * // Delete customer
   * await customerApi.deleteCustomer('customer-uuid');
   * console.log('Customer deleted (soft delete)');
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const deleteCustomer = createAsyncThunk(
   *   'customers/delete',
   *   async (id: string) => {
   *     await customerApi.deleteCustomer(id);
   *     return id; // Return ID to remove from Redux state
   *   }
   * );
   *
   * @see customers.slice.ts for Redux integration
   * @see customer.controller.ts for backend implementation
   */
  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  /**
   * Quick search customers for customer selector
   *
   * HTTP: GET /api/v1/customers/search?q={query}&limit={limit}
   *
   * Fast customer search for customer selector with typeahead functionality.
   * Searches across name, email, phone, and customer number.
   * Returns only active customers for quick selection.
   *
   * Search behavior:
   * - Case-insensitive partial match
   * - Searches: full_name, email, phone, customer_number
   * - Filter: is_active = true (only active customers)
   * - Default limit: 10 results
   * - No pagination (returns top N matches)
   *
   * Returns minimal customer data:
   * - id, customer_number, full_name, email, phone
   * - Omits address fields for faster response
   * - Optimized for quick selection UI
   *
   * Use cases:
   * - Checkout customer selector (as cashier types)
   * - Quick customer lookup during transaction
   * - Customer assignment to transaction
   *
   * Performance:
   * - Fast response (< 100ms typically)
   * - Limited results for quick rendering
   * - Active customers only (smaller dataset)
   *
   * @async
   * @function searchCustomers
   * @param {string} query - Search query (name, email, phone, or customer number)
   * @param {number} [limit=10] - Maximum results to return (default: 10)
   * @returns {Promise<CustomerSearchResult[]>} Array of matching customers (id, customer_number, full_name, email, phone)
   * @throws {Error} If search fails (network error, server error)
   *
   * @example
   * // Search by name
   * const results = await customerApi.searchCustomers('john');
   * console.log('Found customers:', results);
   *
   * @example
   * // Search by customer number
   * const results = await customerApi.searchCustomers('CUST-000123');
   * console.log('Customer:', results[0].full_name);
   *
   * @example
   * // Search with custom limit
   * const results = await customerApi.searchCustomers('smith', 5);
   * console.log('Top 5 matches:', results);
   *
   * @example
   * // Usage in Redux thunk (customers.slice.ts)
   * export const searchCustomers = createAsyncThunk(
   *   'customers/search',
   *   async (query: string) => {
   *     return await customerApi.searchCustomers(query);
   *   }
   * );
   *
   * @example
   * // Usage in CustomerSelector component
   * const handleSearch = async (query: string) => {
   *   if (query.length >= 2) {
   *     const results = await customerApi.searchCustomers(query, 10);
   *     setCustomerOptions(results);
   *   }
   * };
   *
   * @see CustomerSearchResult type in ../../types/customer.types.ts
   * @see customers.slice.ts for Redux integration
   * @see CustomerSelector component for UI integration
   */
  searchCustomers: async (query: string, limit?: number): Promise<CustomerSearchResult[]> => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<ApiResponse<CustomerSearchResult[]>>(
      `/customers/search?${params.toString()}`
    );
    return response.data.data!;
  },
};
