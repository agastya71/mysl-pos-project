/**
 * @fileoverview Customer Type Definitions - Customer management data structures
 *
 * Defines customer entity, create/update inputs, list query parameters, and search results.
 * Used across customer management, transaction assignment, and loyalty tracking.
 *
 * @module types/customer.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 2)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Customer entity
 *
 * Complete customer record from database with contact information, address, and loyalty data.
 * Auto-generated customer_number (CUST-XXXXXX). Used in customer management and transaction assignment.
 *
 * @interface Customer
 * @property {string} id - UUID primary key
 * @property {string} customer_number - Auto-generated (CUST-000001, CUST-000002, ...)
 * @property {string} first_name - Customer first name (required)
 * @property {string} last_name - Customer last name (required)
 * @property {string | null} email - Email address (optional, indexed)
 * @property {string | null} phone - Phone number (optional, indexed)
 * @property {string | null} address_line1 - Street address line 1 (optional)
 * @property {string | null} address_line2 - Street address line 2 (optional)
 * @property {string | null} city - City (optional)
 * @property {string | null} state - State/province (optional)
 * @property {string | null} postal_code - Postal/ZIP code (optional)
 * @property {string} country - Country (default: 'USA')
 * @property {number} loyalty_points - Current loyalty points balance
 * @property {number} total_spent - Lifetime total spent (decimal 10,2)
 * @property {number} total_transactions - Count of completed transactions
 * @property {boolean} is_active - Whether customer is active
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 *
 * @example
 * const customer: Customer = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   customer_number: "CUST-000042",
 *   first_name: "John",
 *   last_name: "Smith",
 *   email: "john.smith@example.com",
 *   phone: "+1-555-123-4567",
 *   address_line1: "123 Main Street",
 *   address_line2: "Apt 4B",
 *   city: "New York",
 *   state: "NY",
 *   postal_code: "10001",
 *   country: "USA",
 *   loyalty_points: 250,
 *   total_spent: 1245.67,
 *   total_transactions: 15,
 *   is_active: true,
 *   created_at: "2024-01-15T10:30:00Z",
 *   updated_at: "2024-02-08T14:22:00Z"
 * };
 */
export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  loyalty_points: number;
  total_spent: number;
  total_transactions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create customer input
 *
 * Request body for POST /api/v1/customers endpoint.
 * Only first_name and last_name are required; all other fields optional.
 *
 * @interface CreateCustomerInput
 * @property {string} first_name - Customer first name (required, max 100 chars)
 * @property {string} last_name - Customer last name (required, max 100 chars)
 * @property {string} [email] - Email address (optional, max 255 chars)
 * @property {string} [phone] - Phone number (optional, max 20 chars)
 * @property {string} [address_line1] - Street address line 1 (optional, max 255 chars)
 * @property {string} [address_line2] - Street address line 2 (optional, max 255 chars)
 * @property {string} [city] - City (optional, max 100 chars)
 * @property {string} [state] - State/province (optional, max 50 chars)
 * @property {string} [postal_code] - Postal/ZIP code (optional, max 20 chars)
 * @property {string} [country] - Country (optional, defaults to 'USA', max 50 chars)
 *
 * @example
 * const input: CreateCustomerInput = {
 *   first_name: "Jane",
 *   last_name: "Doe",
 *   email: "jane.doe@example.com",
 *   phone: "+1-555-987-6543",
 *   address_line1: "456 Oak Avenue",
 *   city: "Los Angeles",
 *   state: "CA",
 *   postal_code: "90001",
 *   country: "USA"
 * };
 */
export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

/**
 * Update customer input
 *
 * Request body for PUT /api/v1/customers/:id endpoint.
 * All fields optional - only provide fields to update.
 *
 * @interface UpdateCustomerInput
 * @property {string} [first_name] - Customer first name (max 100 chars)
 * @property {string} [last_name] - Customer last name (max 100 chars)
 * @property {string} [email] - Email address (max 255 chars)
 * @property {string} [phone] - Phone number (max 20 chars)
 * @property {string} [address_line1] - Street address line 1 (max 255 chars)
 * @property {string} [address_line2] - Street address line 2 (max 255 chars)
 * @property {string} [city] - City (max 100 chars)
 * @property {string} [state] - State/province (max 50 chars)
 * @property {string} [postal_code] - Postal/ZIP code (max 20 chars)
 * @property {string} [country] - Country (max 50 chars)
 * @property {boolean} [is_active] - Whether customer is active
 *
 * @example
 * const update: UpdateCustomerInput = {
 *   phone: "+1-555-111-2222",
 *   address_line1: "789 New Street",
 *   city: "San Francisco"
 * };
 */
export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_active?: boolean;
}

/**
 * Customer list query parameters
 *
 * Optional filters, pagination, and search for customer list endpoint.
 * All fields optional - defaults applied server-side.
 *
 * @interface CustomerListQuery
 * @property {number} [page] - Page number (1-indexed, default: 1)
 * @property {number} [limit] - Items per page (default: 50, max: 100)
 * @property {string} [search] - Search term (matches first name, last name, email, phone, customer number)
 * @property {boolean} [is_active] - Filter by active status (default: all)
 *
 * @example
 * const query: CustomerListQuery = {
 *   page: 1,
 *   limit: 20,
 *   search: "john",
 *   is_active: true
 * };
 */
export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

/**
 * Customer list paginated response
 *
 * Standardized paginated response for customer list endpoint.
 * Includes customers array and pagination metadata.
 *
 * @interface CustomerListResponse
 * @property {Customer[]} customers - Array of customer records
 * @property {Object} pagination - Pagination metadata
 * @property {number} pagination.total - Total number of matching customers
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.totalPages - Total number of pages
 *
 * @example
 * const response: CustomerListResponse = {
 *   customers: [
 *     { id: "123", customer_number: "CUST-000001", first_name: "John", ... },
 *     { id: "456", customer_number: "CUST-000002", first_name: "Jane", ... }
 *   ],
 *   pagination: {
 *     total: 150,
 *     page: 1,
 *     limit: 20,
 *     totalPages: 8
 *   }
 * };
 */
export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Customer search result
 *
 * Simplified customer data for search/autocomplete endpoints.
 * Includes pre-computed full_name for display convenience.
 * Used in CustomerSelector component for checkout.
 *
 * @interface CustomerSearchResult
 * @property {string} id - Customer UUID
 * @property {string} customer_number - Auto-generated customer number (CUST-XXXXXX)
 * @property {string} first_name - Customer first name
 * @property {string} last_name - Customer last name
 * @property {string} full_name - Combined first + last name (computed server-side)
 * @property {string | null} phone - Phone number (for display)
 * @property {string | null} email - Email address (for display)
 *
 * @example
 * const result: CustomerSearchResult = {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   customer_number: "CUST-000042",
 *   first_name: "John",
 *   last_name: "Smith",
 *   full_name: "John Smith",
 *   phone: "+1-555-123-4567",
 *   email: "john.smith@example.com"
 * };
 */
export interface CustomerSearchResult {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  full_name: string; // Combined first + last name
  phone: string | null;
  email: string | null;
}
