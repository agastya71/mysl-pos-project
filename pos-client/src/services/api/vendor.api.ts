/**
 * @fileoverview Vendor API Service - Frontend API client for vendor operations
 *
 * This service provides API methods for vendor operations:
 * - getVendors: List vendors with optional active status filter
 * - getVendorById: Get complete vendor details by ID
 * - createVendor: Create new vendor with business and contact info
 * - updateVendor: Update existing vendor information
 * - deleteVendor: Soft delete vendor (preserves purchase order history)
 *
 * Use Cases:
 * - Vendor management: Admin interface for vendor list and CRUD operations
 * - Purchase orders: Vendor selector for creating purchase orders
 * - Vendor search: Real-time search when selecting vendor for PO
 * - Vendor details: View/edit vendor information and order history
 *
 * Vendor Information:
 * - Type: supplier, distributor, or manufacturer
 * - Business: business_name (required), contact_person, email, phone
 * - Address: address_line1, address_line2, city, state, postal_code, country (all optional)
 * - Payment: payment_terms (e.g., "Net 30"), tax_id
 * - Auto-generated: vendor_number (VEND-XXXXXX format)
 * - Status: is_active flag for soft delete
 *
 * API Endpoints:
 * - GET /api/v1/vendors - List vendors (with query params)
 * - GET /api/v1/vendors/:id - Get vendor by ID
 * - POST /api/v1/vendors - Create vendor
 * - PUT /api/v1/vendors/:id - Update vendor
 * - DELETE /api/v1/vendors/:id - Soft delete vendor
 *
 * @module services/api/vendor
 * @requires ./api.client - Configured Axios instance
 * @requires ../../types/api.types - API response types
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - Vendor Management)
 * @updated 2026-02-08
 */

import { apiClient } from './api.client';
import { ApiResponse } from '../../types/api.types';

/**
 * Vendor entity interface
 *
 * Represents a vendor (supplier, distributor, or manufacturer) in the POS system.
 * Used for purchase order management and inventory sourcing.
 *
 * @interface Vendor
 * @property {string} id - Unique vendor identifier (UUID)
 * @property {string} vendor_number - Auto-generated vendor number (VEND-XXXXXX)
 * @property {'supplier' | 'distributor' | 'manufacturer'} vendor_type - Vendor classification
 * @property {string} business_name - Business name (required, max 200 chars)
 * @property {string | null} contact_person - Primary contact person name
 * @property {string | null} email - Contact email address
 * @property {string | null} phone - Contact phone number
 * @property {string | null} address_line1 - Street address line 1
 * @property {string | null} address_line2 - Street address line 2
 * @property {string | null} city - City name
 * @property {string | null} state - State/province
 * @property {string | null} postal_code - Postal/ZIP code
 * @property {string | null} country - Country name
 * @property {string | null} payment_terms - Payment terms (e.g., "Net 30", "Net 60")
 * @property {string | null} tax_id - Tax identification number (EIN, VAT, etc.)
 * @property {string | null} notes - Additional notes about vendor
 * @property {boolean} is_active - Active status (false = soft deleted)
 * @property {string} created_at - ISO 8601 timestamp
 * @property {string} updated_at - ISO 8601 timestamp
 */
export interface Vendor {
  id: string;
  vendor_number: string;
  vendor_type: 'supplier' | 'distributor' | 'manufacturer';
  business_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  payment_terms: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create vendor request payload
 *
 * Input data for creating a new vendor. Only vendor_type and business_name are required.
 * All other fields are optional.
 *
 * @interface CreateVendorRequest
 * @property {'supplier' | 'distributor' | 'manufacturer'} vendor_type - Vendor classification (required)
 * @property {string} business_name - Business name (required, max 200 chars)
 * @property {string} [contact_person] - Primary contact person name
 * @property {string} [email] - Contact email address
 * @property {string} [phone] - Contact phone number
 * @property {string} [address_line1] - Street address line 1
 * @property {string} [address_line2] - Street address line 2
 * @property {string} [city] - City name
 * @property {string} [state] - State/province
 * @property {string} [postal_code] - Postal/ZIP code
 * @property {string} [country] - Country name
 * @property {string} [payment_terms] - Payment terms (e.g., "Net 30")
 * @property {string} [tax_id] - Tax identification number
 * @property {string} [notes] - Additional notes
 */
export interface CreateVendorRequest {
  vendor_type: 'supplier' | 'distributor' | 'manufacturer';
  business_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  payment_terms?: string;
  tax_id?: string;
  notes?: string;
}

/**
 * Update vendor request payload
 *
 * Partial update support - only include fields to be updated.
 * All fields from CreateVendorRequest are optional.
 *
 * @interface UpdateVendorRequest
 * @extends {Partial<CreateVendorRequest>}
 */
export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {}

/**
 * Get all vendors with optional active status filter
 *
 * HTTP: GET /api/v1/vendors (with optional query param)
 *
 * Retrieves all vendors or only active vendors based on filter.
 * Used for vendor management page and vendor selector in purchase orders.
 *
 * Filter behavior:
 * - activeOnly=true: Returns only vendors with is_active=true
 * - activeOnly=false or undefined: Returns all vendors (active and inactive)
 *
 * Results are sorted by created_at descending (newest first).
 *
 * @async
 * @function getVendors
 * @param {boolean} [activeOnly] - If true, return only active vendors
 * @returns {Promise<Vendor[]>} Array of vendor objects
 * @throws {Error} If API request fails (handled by apiClient)
 *
 * @example
 * // Get all vendors (active and inactive)
 * const allVendors = await getVendors();
 *
 * @example
 * // Get only active vendors
 * const activeVendors = await getVendors(true);
 */
export async function getVendors(activeOnly?: boolean): Promise<Vendor[]> {
  const url = activeOnly ? '/vendors?active_only=true' : '/vendors';
  const response = await apiClient.get<ApiResponse<Vendor[]>>(url);
  return response.data.data!;
}

/**
 * Get vendor by ID
 *
 * HTTP: GET /api/v1/vendors/:id
 *
 * Retrieves complete vendor details including all fields.
 * Used for viewing/editing vendor details and loading vendor for purchase order.
 *
 * Returns full vendor object with all contact, address, and payment information.
 *
 * @async
 * @function getVendorById
 * @param {string} id - Vendor UUID
 * @returns {Promise<Vendor>} Complete vendor object
 * @throws {Error} If vendor not found or API request fails
 *
 * @example
 * // Get vendor for editing
 * const vendor = await getVendorById('uuid-here');
 * console.log(vendor.business_name, vendor.payment_terms);
 *
 * @example
 * // Load vendor for purchase order
 * const selectedVendor = await getVendorById(vendorId);
 * setPurchaseOrderVendor(selectedVendor);
 */
export async function getVendorById(id: string): Promise<Vendor> {
  const response = await apiClient.get<ApiResponse<Vendor>>(`/vendors/${id}`);
  return response.data.data!;
}

/**
 * Create new vendor
 *
 * HTTP: POST /api/v1/vendors
 *
 * Creates a new vendor with auto-generated vendor_number (VEND-XXXXXX).
 * Only vendor_type and business_name are required; all other fields optional.
 *
 * Backend automatically generates:
 * - vendor_number: Sequential number in VEND-000001 format
 * - id: UUID
 * - is_active: true (default)
 * - created_at, updated_at: Current timestamp
 *
 * @async
 * @function createVendor
 * @param {CreateVendorRequest} data - Vendor data (vendor_type and business_name required)
 * @returns {Promise<Vendor>} Newly created vendor with generated fields
 * @throws {Error} If validation fails or API request fails
 *
 * @example
 * // Create minimal vendor
 * const newVendor = await createVendor({
 *   vendor_type: 'supplier',
 *   business_name: 'Acme Supplies Inc.',
 * });
 *
 * @example
 * // Create vendor with full details
 * const newVendor = await createVendor({
 *   vendor_type: 'distributor',
 *   business_name: 'Global Distribution Co.',
 *   contact_person: 'John Smith',
 *   email: 'john@globalco.com',
 *   phone: '555-1234',
 *   payment_terms: 'Net 30',
 *   tax_id: '12-3456789',
 * });
 */
export async function createVendor(data: CreateVendorRequest): Promise<Vendor> {
  const response = await apiClient.post<ApiResponse<Vendor>>('/vendors', data);
  return response.data.data!;
}

/**
 * Update vendor
 *
 * HTTP: PUT /api/v1/vendors/:id
 *
 * Updates vendor information with partial update support.
 * Only include fields that need to be changed.
 *
 * Cannot update:
 * - id, vendor_number (immutable)
 * - created_at (immutable)
 * - updated_at (auto-updated by backend)
 *
 * @async
 * @function updateVendor
 * @param {string} id - Vendor UUID
 * @param {UpdateVendorRequest} data - Fields to update (partial)
 * @returns {Promise<Vendor>} Updated vendor object
 * @throws {Error} If vendor not found, validation fails, or API request fails
 *
 * @example
 * // Update contact information
 * const updated = await updateVendor('vendor-id', {
 *   email: 'newemail@vendor.com',
 *   phone: '555-9999',
 * });
 *
 * @example
 * // Update payment terms only
 * const updated = await updateVendor('vendor-id', {
 *   payment_terms: 'Net 60',
 * });
 */
export async function updateVendor(
  id: string,
  data: UpdateVendorRequest
): Promise<Vendor> {
  const response = await apiClient.put<ApiResponse<Vendor>>(
    `/vendors/${id}`,
    data
  );
  return response.data.data!;
}

/**
 * Delete vendor (soft delete)
 *
 * HTTP: DELETE /api/v1/vendors/:id
 *
 * Soft deletes vendor by setting is_active=false.
 * Preserves vendor record and all associated purchase order history.
 *
 * Validation:
 * - Cannot delete vendor with active purchase orders (pending/ordered status)
 * - Can delete vendor with completed/cancelled purchase orders
 *
 * Effects:
 * - Sets is_active=false (soft delete)
 * - Vendor removed from vendor list when filtered by active status
 * - Historical purchase orders remain accessible
 * - Can be reactivated by updating is_active back to true
 *
 * @async
 * @function deleteVendor
 * @param {string} id - Vendor UUID
 * @returns {Promise<void>} No return value (void response)
 * @throws {Error} If vendor has active purchase orders, vendor not found, or API request fails
 *
 * @example
 * // Delete inactive vendor
 * await deleteVendor('vendor-id');
 * // Vendor is soft deleted (is_active=false)
 *
 * @example
 * // Handle deletion error
 * try {
 *   await deleteVendor('vendor-id');
 *   alert('Vendor deleted successfully');
 * } catch (err) {
 *   alert('Cannot delete vendor with active purchase orders');
 * }
 */
export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete(`/vendors/${id}`);
}
