/**
 * @fileoverview API Type Definitions - Standard API response wrapper
 *
 * Defines standardized API response structure used across all API calls.
 * Provides type-safe wrapper with success/error states.
 *
 * @module types/api.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Standard API Response wrapper
 *
 * Generic wrapper for all API responses providing consistent structure
 * for success and error states. Used by all API client methods.
 *
 * @template T - Type of the data payload
 *
 * @property {boolean} success - Whether the request succeeded (true) or failed (false)
 * @property {string} [message] - Optional message (e.g., "Customer created successfully")
 * @property {T} [data] - Response payload (present on success)
 * @property {Object} [error] - Error details (present on failure)
 * @property {string} error.code - Error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
 * @property {string} error.message - Human-readable error message
 * @property {any} [error.details] - Additional error context (validation errors, stack traces, etc.)
 *
 * @example
 * // Success response
 * const response: ApiResponse<Customer> = {
 *   success: true,
 *   message: "Customer created successfully",
 *   data: { id: "123", customer_number: "CUST-000042", ... }
 * };
 *
 * @example
 * // Error response
 * const response: ApiResponse = {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "First name is required",
 *     details: { field: "first_name", constraint: "required" }
 *   }
 * };
 *
 * @example
 * // Usage in API client
 * async function getCustomer(id: string): Promise<ApiResponse<Customer>> {
 *   const response = await fetch(`/api/v1/customers/${id}`);
 *   return response.json();
 * }
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Paginated Response wrapper
 * Used for list endpoints that return paginated results
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
