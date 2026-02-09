/**
 * @fileoverview Vendor Routes - API endpoint definitions for vendor/supplier management
 *
 * This module defines Express routes for all vendor-related operations:
 * - POST /api/v1/vendors - Create new vendor
 * - GET /api/v1/vendors - List all vendors with optional filtering
 * - GET /api/v1/vendors/:id - Get vendor details by ID
 * - PUT /api/v1/vendors/:id - Update vendor information
 * - DELETE /api/v1/vendors/:id - Soft delete vendor
 *
 * Features:
 * - RESTful API design with standard HTTP methods
 * - JWT authentication required for all endpoints
 * - Role-based access control (manager or higher)
 * - Auto-generated vendor numbers (VEND-XXXXXX)
 * - Soft delete with purchase order validation
 * - Supports three vendor types: supplier, distributor, manufacturer
 *
 * Route Structure:
 * - Base path: /api/v1/vendors
 * - All routes protected by authenticateToken middleware
 * - Controllers handle business logic and validation
 * - Consistent response format (ApiResponse)
 *
 * Authentication:
 * - JWT token required in Authorization header
 * - Format: "Bearer <token>"
 * - Token validated by authenticateToken middleware
 * - User ID and role extracted from token payload
 *
 * Error Handling:
 * - Validation errors: 400 Bad Request
 * - Not found errors: 404 Not Found
 * - Database errors: 500 Internal Server Error
 * - Unauthorized: 401 Unauthorized (no/invalid token)
 * - Forbidden: 403 Forbidden (insufficient permissions)
 *
 * Response Format:
 * Success responses include:
 * - success: true
 * - data: Vendor object or array
 * - message: Optional success message
 *
 * Error responses include:
 * - success: false
 * - error: { code, message }
 * - details: Optional validation error details
 *
 * Integration:
 * - Used by purchase order system for vendor selection
 * - Frontend VendorsPage for vendor management UI
 * - Referenced by purchase_orders table (vendor_id foreign key)
 *
 * @module routes/vendor
 * @requires express - Express Router for route definitions
 * @requires ../middleware/auth.middleware - JWT authentication middleware
 * @requires ../controllers/vendor.controller - Vendor request handlers
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - Vendor Management)
 * @updated 2026-02-08 (Documentation)
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as vendorController from '../controllers/vendor.controller';

const router = Router();

/**
 * Apply JWT authentication to all vendor routes
 *
 * Middleware chain:
 * 1. authenticateToken - Validates JWT token, extracts user info
 * 2. Route-specific controller - Handles business logic
 *
 * Authentication flow:
 * - Client sends JWT token in Authorization header
 * - Middleware validates token and extracts payload
 * - User ID and role attached to req.user
 * - If invalid token, returns 401 Unauthorized
 * - If valid, proceeds to route controller
 *
 * Token format: "Bearer <jwt-token>"
 *
 * @middleware authenticateToken
 * @see ../middleware/auth.middleware for authentication implementation
 */
router.use(authenticateToken);

/**
 * List all vendors
 *
 * GET /api/v1/vendors
 *
 * Retrieves list of all vendors sorted alphabetically by business name.
 * Supports filtering by active status via query parameter.
 *
 * Query parameters:
 * - active_only: 'true' to filter only active vendors (is_active = true)
 * - Omit parameter to get all vendors regardless of status
 *
 * Response includes all vendor fields:
 * - id, vendor_number (VEND-XXXXXX), vendor_type
 * - business_name, contact_person, email, phone
 * - address fields, payment_terms, tax_id, notes
 * - is_active, created_at, updated_at
 *
 * Use cases:
 * - Populate vendor dropdown in purchase order form
 * - Display vendor directory/management page
 * - Export vendor list for reporting
 *
 * @route GET /api/v1/vendors
 * @param {string} [active_only] - Query parameter: 'true' for active vendors only
 * @returns {ApiResponse<Vendor[]>} 200 - Array of vendor objects
 * @returns {ApiResponse} 401 - Unauthorized (invalid/missing token)
 * @returns {ApiResponse} 500 - Database error
 * @access Protected - Requires authentication
 *
 * @example
 * // Get all vendors
 * GET /api/v1/vendors
 * Authorization: Bearer <token>
 *
 * @example
 * // Get only active vendors
 * GET /api/v1/vendors?active_only=true
 * Authorization: Bearer <token>
 *
 * @see vendorController.getVendors for implementation
 */
router.get('/', vendorController.getVendors);

/**
 * Get vendor by ID
 *
 * GET /api/v1/vendors/:id
 *
 * Retrieves complete vendor details for a specific vendor by UUID.
 * Used for vendor detail view, edit forms, and purchase order creation.
 *
 * Path parameters:
 * - id: Vendor UUID (required)
 *
 * Returns full vendor record with all fields:
 * - Basic info: id, vendor_number, vendor_type, business_name
 * - Contact: contact_person, email, phone
 * - Address: address_line1, address_line2, city, state, postal_code, country
 * - Business: payment_terms, tax_id
 * - Metadata: notes, is_active, created_at, updated_at
 *
 * @route GET /api/v1/vendors/:id
 * @param {string} id - Path parameter: Vendor UUID
 * @returns {ApiResponse<Vendor>} 200 - Vendor object with all details
 * @returns {ApiResponse} 401 - Unauthorized (invalid/missing token)
 * @returns {ApiResponse} 404 - Vendor not found
 * @returns {ApiResponse} 500 - Database error
 * @access Protected - Requires authentication
 *
 * @example
 * // Get vendor details
 * GET /api/v1/vendors/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 *
 * @see vendorController.getVendorById for implementation
 */
router.get('/:id', vendorController.getVendorById);

/**
 * Create new vendor
 *
 * POST /api/v1/vendors
 *
 * Creates new vendor record with auto-generated vendor_number (VEND-XXXXXX).
 * Vendor number is generated by database trigger on INSERT.
 *
 * Required fields:
 * - vendor_type: 'supplier', 'distributor', or 'manufacturer'
 * - business_name: Legal or DBA name (1-200 characters)
 *
 * Optional fields:
 * - contact_person: Primary contact name
 * - email: Contact email (validated)
 * - phone: Contact phone number
 * - address_line1, address_line2: Street address
 * - city, state, postal_code: Location
 * - country: Defaults to 'USA'
 * - payment_terms: Payment terms (e.g., "Net 30")
 * - tax_id: Tax identification number
 * - notes: Additional vendor notes
 *
 * Validation:
 * - business_name required and non-empty
 * - vendor_type must be valid enum value
 * - email must be valid format if provided
 * - All string fields have max length limits
 *
 * @route POST /api/v1/vendors
 * @param {CreateVendorRequest} body - Vendor data (see controller schema)
 * @returns {ApiResponse<Vendor>} 201 - Created vendor with generated vendor_number
 * @returns {ApiResponse} 400 - Validation error (invalid fields)
 * @returns {ApiResponse} 401 - Unauthorized (invalid/missing token)
 * @returns {ApiResponse} 500 - Database error
 * @access Protected - Requires authentication
 *
 * @example
 * // Create supplier vendor
 * POST /api/v1/vendors
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "vendor_type": "supplier",
 *   "business_name": "Acme Wholesale",
 *   "contact_person": "John Smith",
 *   "email": "john@acme.com",
 *   "phone": "+1-555-0123",
 *   "address_line1": "123 Main St",
 *   "city": "Chicago",
 *   "state": "IL",
 *   "postal_code": "60601",
 *   "payment_terms": "Net 30",
 *   "tax_id": "12-3456789"
 * }
 *
 * @see vendorController.createVendor for implementation
 * @see CreateVendorSchema in controller for validation rules
 */
router.post('/', vendorController.createVendor);

/**
 * Update vendor
 *
 * PUT /api/v1/vendors/:id
 *
 * Updates vendor with partial field updates.
 * Only provided fields are updated, omitted fields remain unchanged.
 *
 * Path parameters:
 * - id: Vendor UUID (required)
 *
 * Updatable fields (all optional):
 * - vendor_type: Change vendor type
 * - business_name: Update business name
 * - contact_person, email, phone: Update contact info
 * - address_line1, address_line2, city, state, postal_code, country: Update address
 * - payment_terms: Update payment terms
 * - tax_id: Update tax ID
 * - notes: Update vendor notes
 *
 * Immutable fields:
 * - id, vendor_number: Cannot be changed
 * - created_at: Preserved
 * - updated_at: Automatically set to NOW()
 *
 * Partial update behavior:
 * - Only fields present in request body are updated
 * - Omitted fields remain unchanged (not set to null)
 * - Empty request body returns validation error
 *
 * @route PUT /api/v1/vendors/:id
 * @param {string} id - Path parameter: Vendor UUID
 * @param {UpdateVendorRequest} body - Partial vendor data (see controller schema)
 * @returns {ApiResponse<Vendor>} 200 - Updated vendor object
 * @returns {ApiResponse} 400 - Validation error or no fields provided
 * @returns {ApiResponse} 401 - Unauthorized (invalid/missing token)
 * @returns {ApiResponse} 404 - Vendor not found
 * @returns {ApiResponse} 500 - Database error
 * @access Protected - Requires authentication
 *
 * @example
 * // Update contact information
 * PUT /api/v1/vendors/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "contact_person": "Jane Doe",
 *   "email": "jane@acme.com",
 *   "phone": "+1-555-0199"
 * }
 *
 * @example
 * // Update payment terms
 * PUT /api/v1/vendors/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "payment_terms": "Net 60",
 *   "notes": "Extended payment terms negotiated Q1 2026"
 * }
 *
 * @see vendorController.updateVendor for implementation
 * @see UpdateVendorSchema in controller for validation rules
 */
router.put('/:id', vendorController.updateVendor);

/**
 * Delete vendor (soft delete)
 *
 * DELETE /api/v1/vendors/:id
 *
 * Soft deletes vendor by setting is_active = false.
 * Validates vendor has no purchase orders before allowing deletion.
 *
 * Path parameters:
 * - id: Vendor UUID (required)
 *
 * Validation rules:
 * - Vendor must exist
 * - Vendor must have no purchase orders (any status)
 * - If validation fails, returns 400 with error code VENDOR_HAS_POS
 *
 * Soft delete behavior:
 * - Sets is_active = false (does not remove record)
 * - Preserves all vendor data for historical reference
 * - Vendor hidden from active vendor lists
 * - Purchase orders still reference vendor (data integrity)
 * - Can be restored by updating is_active = true
 *
 * Hard delete not supported:
 * - Maintains referential integrity
 * - Preserves audit trail
 * - Prevents orphaned purchase order records
 *
 * @route DELETE /api/v1/vendors/:id
 * @param {string} id - Path parameter: Vendor UUID
 * @returns {ApiResponse<Vendor>} 200 - Soft-deleted vendor object (is_active = false)
 * @returns {ApiResponse} 400 - Vendor has purchase orders (code: VENDOR_HAS_POS)
 * @returns {ApiResponse} 401 - Unauthorized (invalid/missing token)
 * @returns {ApiResponse} 404 - Vendor not found
 * @returns {ApiResponse} 500 - Database error
 * @access Protected - Requires authentication
 *
 * @example
 * // Delete vendor (soft delete)
 * DELETE /api/v1/vendors/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 *
 * @example
 * // Error response - vendor has purchase orders
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VENDOR_HAS_POS",
 *     "message": "Cannot delete vendor with existing purchase orders"
 *   }
 * }
 *
 * @see vendorController.deleteVendor for implementation
 */
router.delete('/:id', vendorController.deleteVendor);

export default router;
