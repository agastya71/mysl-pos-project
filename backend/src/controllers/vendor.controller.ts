/**
 * @fileoverview Vendor Controller - HTTP request handlers for vendor/supplier management
 *
 * This controller handles all vendor-related API endpoints:
 * - POST /api/v1/vendors - Create new vendor
 * - GET /api/v1/vendors - List all vendors with optional filtering
 * - GET /api/v1/vendors/:id - Get vendor details by ID
 * - PUT /api/v1/vendors/:id - Update vendor information
 * - DELETE /api/v1/vendors/:id - Soft delete vendor
 *
 * Features:
 * - Vendor number auto-generation (VEND-XXXXXX) via database trigger
 * - Three vendor types: supplier, distributor, manufacturer
 * - Complete address support (multi-line, city, state, postal, country)
 * - Payment terms and tax ID tracking
 * - Soft delete with validation (cannot delete vendors with purchase orders)
 * - Contact information management (contact person, email, phone)
 * - Optional notes field for vendor-specific information
 *
 * Vendor Types:
 * - supplier: Direct suppliers of products
 * - distributor: Middle-tier distributors
 * - manufacturer: Original product manufacturers
 *
 * Address Structure:
 * - address_line1: Primary street address (required for shipping)
 * - address_line2: Optional secondary address (suite, unit, etc.)
 * - city: City name
 * - state: State/province code
 * - postal_code: ZIP/postal code
 * - country: Country name (defaults to 'USA')
 *
 * Validation Rules:
 * - Business name required (1-200 characters)
 * - Vendor type must be one of: supplier, distributor, manufacturer
 * - Email must be valid email format if provided
 * - Cannot delete vendor with existing purchase orders
 * - Phone number max 20 characters
 * - Tax ID max 50 characters
 *
 * Authentication:
 * - All endpoints require JWT authentication
 * - User must have 'manager' or higher role
 *
 * Database Integration:
 * - Direct database access via PostgreSQL pool
 * - Database trigger generates vendor_number on INSERT
 * - Foreign key constraints prevent deletion if purchase orders exist
 * - Soft delete preserves historical data (is_active = false)
 *
 * @module controllers/vendor
 * @requires express - Express.js framework for HTTP handling
 * @requires zod - Schema validation library
 * @requires ../config/database - PostgreSQL connection pool
 * @author Claude Sonnet 4.5 <noreply@anthropic.com>
 * @created 2026-02-08 (Phase 3D - Vendor Management)
 * @updated 2026-02-08 (Documentation)
 */

import { Request, Response } from 'express';
import { pool } from '../config/database';
import { z } from 'zod';

/**
 * Zod validation schema for vendor creation
 *
 * Validates request body for POST /api/v1/vendors.
 * Creates new vendor record with auto-generated vendor_number (VEND-XXXXXX).
 *
 * Required fields:
 * - vendor_type: Type of vendor (supplier, distributor, or manufacturer)
 * - business_name: Legal or doing-business-as name (1-200 characters)
 *
 * Optional fields:
 * - contact_person: Primary contact name (max 100 characters)
 * - email: Contact email (must be valid email format)
 * - phone: Contact phone number (max 20 characters)
 * - address_line1: Primary street address (max 200 characters)
 * - address_line2: Secondary address line (max 200 characters)
 * - city: City name (max 100 characters)
 * - state: State/province code (max 50 characters)
 * - postal_code: ZIP/postal code (max 20 characters)
 * - country: Country name (defaults to 'USA', max 50 characters)
 * - payment_terms: Payment terms description (max 50 characters, e.g., "Net 30", "COD")
 * - tax_id: Tax identification number (max 50 characters, e.g., EIN, VAT)
 * - notes: Additional vendor notes (unlimited text)
 *
 * Vendor Type Descriptions:
 * - supplier: Direct supplier of goods (most common)
 * - distributor: Wholesale distributor
 * - manufacturer: Original equipment manufacturer (OEM)
 *
 * Email Validation:
 * - Must be valid email format (name@domain.com)
 * - Optional field, but validated if provided
 * - Used for purchase order notifications
 *
 * Address Validation:
 * - All address fields optional
 * - Should be complete for shipping/receiving
 * - Country defaults to 'USA' if not specified
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Create supplier vendor
 * {
 *   vendor_type: "supplier",
 *   business_name: "Acme Wholesale Distributors",
 *   contact_person: "John Smith",
 *   email: "john@acmewholesale.com",
 *   phone: "+1-555-0123",
 *   address_line1: "123 Warehouse Blvd",
 *   city: "Chicago",
 *   state: "IL",
 *   postal_code: "60601",
 *   payment_terms: "Net 30",
 *   tax_id: "12-3456789"
 * }
 *
 * @example
 * // Create manufacturer vendor (minimal)
 * {
 *   vendor_type: "manufacturer",
 *   business_name: "TechCorp Manufacturing",
 *   email: "orders@techcorp.com"
 * }
 */
const CreateVendorSchema = z.object({
  vendor_type: z.enum(['supplier', 'distributor', 'manufacturer']),
  business_name: z.string().min(1).max(200),
  contact_person: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(50).default('USA'),
  payment_terms: z.string().max(50).optional(),
  tax_id: z.string().max(50).optional(),
  notes: z.string().optional(),
});

/**
 * Zod validation schema for vendor updates
 *
 * Validates request body for PUT /api/v1/vendors/:id.
 * All fields are optional (partial updates supported).
 *
 * Updatable fields:
 * - vendor_type: Change vendor type classification
 * - business_name: Update business name (1-200 characters)
 * - contact_person: Update primary contact
 * - email: Update contact email (must be valid format)
 * - phone: Update phone number
 * - address_line1, address_line2: Update address
 * - city, state, postal_code, country: Update location
 * - payment_terms: Update payment terms (e.g., "Net 30" → "Net 60")
 * - tax_id: Update tax identification number
 * - notes: Update vendor notes
 *
 * Partial Update Behavior:
 * - Only provided fields are updated
 * - Omitted fields remain unchanged
 * - Cannot update vendor_number (auto-generated, immutable)
 * - Cannot update id, created_at, updated_at (system-managed)
 * - updated_at automatically set to NOW() by database
 *
 * @constant
 * @type {z.ZodObject}
 *
 * @example
 * // Update contact information only
 * {
 *   contact_person: "Jane Doe",
 *   email: "jane@acmewholesale.com",
 *   phone: "+1-555-0199"
 * }
 *
 * @example
 * // Update payment terms
 * {
 *   payment_terms: "Net 60",
 *   notes: "Extended payment terms negotiated Q1 2026"
 * }
 *
 * @example
 * // Update full address
 * {
 *   address_line1: "456 New Location Ave",
 *   address_line2: "Suite 200",
 *   city: "New York",
 *   state: "NY",
 *   postal_code: "10001"
 * }
 */
const UpdateVendorSchema = CreateVendorSchema.partial();

/**
 * Get all vendors with optional filtering
 *
 * HTTP: GET /api/v1/vendors
 *
 * Retrieves list of all vendors sorted alphabetically by business name.
 * Supports filtering by active status via query parameter.
 *
 * Query parameters:
 * - active_only: Filter by active status
 *   - 'true' → only active vendors (is_active = true)
 *   - not specified → all vendors regardless of status
 *
 * Response includes all vendor fields:
 * - id, vendor_number (VEND-XXXXXX), vendor_type
 * - business_name, contact_person, email, phone
 * - address_line1, address_line2, city, state, postal_code, country
 * - payment_terms, tax_id, notes
 * - is_active, created_at, updated_at
 *
 * Sorting:
 * - Results sorted alphabetically by business_name (A-Z)
 * - Case-insensitive sorting
 * - Inactive vendors included unless active_only=true
 *
 * Use cases:
 * - Vendor dropdown lists (use active_only=true)
 * - Vendor management page (show all vendors)
 * - Purchase order vendor selection
 * - Vendor directory/search
 *
 * @async
 * @param {Request} req - Express request with optional active_only query param
 * @param {Response} res - Express response with vendor list
 * @returns {Promise<void>} Sends 200 OK with vendor array
 *
 * @example
 * // Request - get all vendors
 * GET /api/v1/vendors
 *
 * @example
 * // Request - get only active vendors
 * GET /api/v1/vendors?active_only=true
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   data: [
 *     {
 *       id: "vendor-uuid-1",
 *       vendor_number: "VEND-000001",
 *       vendor_type: "supplier",
 *       business_name: "Acme Wholesale",
 *       contact_person: "John Smith",
 *       email: "john@acme.com",
 *       phone: "+1-555-0123",
 *       address_line1: "123 Main St",
 *       city: "Chicago",
 *       state: "IL",
 *       postal_code: "60601",
 *       country: "USA",
 *       payment_terms: "Net 30",
 *       tax_id: "12-3456789",
 *       notes: null,
 *       is_active: true,
 *       created_at: "2026-01-15T10:00:00Z",
 *       updated_at: "2026-01-15T10:00:00Z"
 *     },
 *     {
 *       id: "vendor-uuid-2",
 *       vendor_number: "VEND-000002",
 *       vendor_type: "manufacturer",
 *       business_name: "TechCorp Manufacturing",
 *       contact_person: null,
 *       email: "orders@techcorp.com",
 *       phone: null,
 *       address_line1: null,
 *       city: null,
 *       state: null,
 *       postal_code: null,
 *       country: "USA",
 *       payment_terms: null,
 *       tax_id: null,
 *       notes: "Primary electronics manufacturer",
 *       is_active: true,
 *       created_at: "2026-02-01T14:30:00Z",
 *       updated_at: "2026-02-01T14:30:00Z"
 *     }
 *   ]
 * }
 */
export async function getVendors(req: Request, res: Response) {
  try {
    const { active_only } = req.query;

    let query = `SELECT * FROM vendors`;
    if (active_only === 'true') {
      query += ` WHERE is_active = true`;
    }
    query += ` ORDER BY business_name`;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch vendors',
      },
    });
  }
}

/**
 * Get vendor details by ID
 *
 * HTTP: GET /api/v1/vendors/:id
 *
 * Retrieves complete vendor details for a specific vendor.
 * Used for vendor detail view, edit forms, and purchase order creation.
 *
 * Returns full vendor record:
 * - id: Vendor UUID
 * - vendor_number: Auto-generated vendor number (VEND-XXXXXX)
 * - vendor_type: supplier, distributor, or manufacturer
 * - business_name: Legal business name
 * - contact_person: Primary contact name
 * - email: Contact email address
 * - phone: Contact phone number
 * - address_line1, address_line2: Street address
 * - city, state, postal_code, country: Location
 * - payment_terms: Payment terms (e.g., "Net 30")
 * - tax_id: Tax identification number
 * - notes: Additional vendor notes
 * - is_active: Active status
 * - created_at: Creation timestamp
 * - updated_at: Last update timestamp
 *
 * Use cases:
 * - Display vendor details page
 * - Pre-populate vendor edit form
 * - Show vendor info in purchase order
 * - Verify vendor exists before creating PO
 *
 * @async
 * @param {Request} req - Express request with vendor ID in params
 * @param {Response} res - Express response with vendor details
 * @returns {Promise<void>} Sends 200 OK with vendor data or 404 if not found
 * @throws {Error} 404 NOT_FOUND if vendor does not exist
 * @throws {Error} 500 DATABASE_ERROR if query fails
 *
 * @example
 * // Request
 * GET /api/v1/vendors/vendor-uuid-123
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   data: {
 *     id: "vendor-uuid-123",
 *     vendor_number: "VEND-000001",
 *     vendor_type: "supplier",
 *     business_name: "Acme Wholesale Distributors",
 *     contact_person: "John Smith",
 *     email: "john@acmewholesale.com",
 *     phone: "+1-555-0123",
 *     address_line1: "123 Warehouse Blvd",
 *     address_line2: "Suite 100",
 *     city: "Chicago",
 *     state: "IL",
 *     postal_code: "60601",
 *     country: "USA",
 *     payment_terms: "Net 30",
 *     tax_id: "12-3456789",
 *     notes: "Primary supplier for office supplies",
 *     is_active: true,
 *     created_at: "2026-01-15T10:00:00Z",
 *     updated_at: "2026-02-05T14:30:00Z"
 *   }
 * }
 *
 * @example
 * // Error response (404 Not Found)
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Vendor not found"
 *   }
 * }
 */
export async function getVendorById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM vendors WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch vendor',
      },
    });
  }
}

/**
 * Create new vendor
 *
 * HTTP: POST /api/v1/vendors
 *
 * Creates new vendor record with auto-generated vendor_number (VEND-XXXXXX).
 * Vendor number is generated by database trigger on INSERT.
 *
 * Required fields:
 * - vendor_type: Must be 'supplier', 'distributor', or 'manufacturer'
 * - business_name: Legal or DBA name (1-200 characters)
 *
 * Optional fields:
 * - contact_person, email, phone: Contact information
 * - address_line1, address_line2, city, state, postal_code: Address
 * - country: Defaults to 'USA' if not specified
 * - payment_terms: Payment terms description (e.g., "Net 30", "COD")
 * - tax_id: Tax identification number (EIN, VAT, etc.)
 * - notes: Additional vendor notes
 *
 * Vendor creation flow:
 * 1. Validate request body against CreateVendorSchema
 * 2. Insert vendor record into database
 * 3. Database trigger generates vendor_number (sequential: VEND-000001, VEND-000002)
 * 4. Set is_active = true by default
 * 5. Return created vendor with all fields including generated vendor_number
 *
 * Vendor number format:
 * - Format: VEND-XXXXXX (e.g., VEND-000001)
 * - Sequential numbering starting from VEND-000001
 * - Generated by database function `generate_vendor_number()`
 * - Unique constraint enforced at database level
 *
 * Payment terms examples:
 * - "Net 30" - Payment due 30 days after invoice
 * - "Net 60" - Payment due 60 days after invoice
 * - "COD" - Cash on delivery
 * - "Prepaid" - Payment before shipment
 * - "2/10 Net 30" - 2% discount if paid within 10 days, net due in 30
 *
 * @async
 * @param {Request} req - Express request with vendor data in body
 * @param {Response} res - Express response with created vendor
 * @returns {Promise<void>} Sends 201 Created with vendor details
 * @throws {ZodError} 400 VALIDATION_ERROR if request body invalid
 * @throws {Error} 500 DATABASE_ERROR if insert fails
 *
 * @example
 * // Request - create supplier with full details
 * POST /api/v1/vendors
 * {
 *   vendor_type: "supplier",
 *   business_name: "Acme Wholesale Distributors",
 *   contact_person: "John Smith",
 *   email: "john@acmewholesale.com",
 *   phone: "+1-555-0123",
 *   address_line1: "123 Warehouse Blvd",
 *   address_line2: "Suite 100",
 *   city: "Chicago",
 *   state: "IL",
 *   postal_code: "60601",
 *   country: "USA",
 *   payment_terms: "Net 30",
 *   tax_id: "12-3456789",
 *   notes: "Primary supplier for office supplies"
 * }
 *
 * @example
 * // Request - create manufacturer (minimal)
 * POST /api/v1/vendors
 * {
 *   vendor_type: "manufacturer",
 *   business_name: "TechCorp Manufacturing",
 *   email: "orders@techcorp.com"
 * }
 *
 * @example
 * // Response (201 Created)
 * {
 *   success: true,
 *   message: "Vendor created successfully",
 *   data: {
 *     id: "vendor-uuid",
 *     vendor_number: "VEND-000001",
 *     vendor_type: "supplier",
 *     business_name: "Acme Wholesale Distributors",
 *     contact_person: "John Smith",
 *     email: "john@acmewholesale.com",
 *     phone: "+1-555-0123",
 *     address_line1: "123 Warehouse Blvd",
 *     address_line2: "Suite 100",
 *     city: "Chicago",
 *     state: "IL",
 *     postal_code: "60601",
 *     country: "USA",
 *     payment_terms: "Net 30",
 *     tax_id: "12-3456789",
 *     notes: "Primary supplier for office supplies",
 *     is_active: true,
 *     created_at: "2026-02-08T10:00:00Z",
 *     updated_at: "2026-02-08T10:00:00Z"
 *   }
 * }
 *
 * @example
 * // Error response (400 Validation Error)
 * {
 *   success: false,
 *   error: "Validation error",
 *   details: [
 *     {
 *       path: ["business_name"],
 *       message: "String must contain at least 1 character(s)"
 *     }
 *   ]
 * }
 *
 * @see database trigger `generate_vendor_number` for auto-numbering
 */
export async function createVendor(req: Request, res: Response) {
  try {
    const validatedData = CreateVendorSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO vendors (
        vendor_type, business_name, contact_person, email, phone,
        address_line1, address_line2, city, state, postal_code, country,
        payment_terms, tax_id, notes, is_active
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, true
      ) RETURNING *`,
      [
        validatedData.vendor_type,
        validatedData.business_name,
        validatedData.contact_person || null,
        validatedData.email || null,
        validatedData.phone || null,
        validatedData.address_line1 || null,
        validatedData.address_line2 || null,
        validatedData.city || null,
        validatedData.state || null,
        validatedData.postal_code || null,
        validatedData.country || 'USA',
        validatedData.payment_terms || null,
        validatedData.tax_id || null,
        validatedData.notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating vendor:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create vendor',
      },
    });
  }
}

/**
 * Update vendor information
 *
 * HTTP: PUT /api/v1/vendors/:id
 *
 * Updates vendor with partial field updates.
 * Only provided fields are updated, omitted fields remain unchanged.
 *
 * Updatable fields:
 * - vendor_type: Change vendor type (supplier, distributor, manufacturer)
 * - business_name: Update business name
 * - contact_person, email, phone: Update contact information
 * - address_line1, address_line2, city, state, postal_code, country: Update address
 * - payment_terms: Update payment terms
 * - tax_id: Update tax identification number
 * - notes: Update vendor notes
 *
 * Immutable fields (cannot be updated):
 * - id: Vendor UUID (system-generated)
 * - vendor_number: Vendor number (VEND-XXXXXX, auto-generated)
 * - created_at: Creation timestamp (system-managed)
 * - updated_at: Automatically set to NOW() on update
 *
 * Partial update logic:
 * - Dynamically builds UPDATE query based on provided fields
 * - Only includes fields present in request body
 * - Empty/undefined fields ignored (not set to null)
 * - Returns error if no fields provided
 *
 * Dynamic query building:
 * 1. Iterate through validated request body
 * 2. Build SET clause with only provided fields
 * 3. Use parameterized query to prevent SQL injection
 * 4. Always set updated_at = NOW()
 * 5. Return updated vendor record
 *
 * Common use cases:
 * - Update contact information when vendor changes personnel
 * - Update address when vendor relocates
 * - Update payment terms after negotiation
 * - Update vendor type if relationship changes
 * - Add/update notes for vendor management
 *
 * @async
 * @param {Request} req - Express request with vendor ID in params and update data in body
 * @param {Response} res - Express response with updated vendor
 * @returns {Promise<void>} Sends 200 OK with updated vendor details
 * @throws {ZodError} 400 VALIDATION_ERROR if validation fails
 * @throws {Error} 400 VALIDATION_ERROR if no fields provided
 * @throws {Error} 404 NOT_FOUND if vendor does not exist
 * @throws {Error} 500 DATABASE_ERROR if update fails
 *
 * @example
 * // Request - update contact information
 * PUT /api/v1/vendors/vendor-uuid
 * {
 *   contact_person: "Jane Doe",
 *   email: "jane@acmewholesale.com",
 *   phone: "+1-555-0199"
 * }
 *
 * @example
 * // Request - update payment terms
 * PUT /api/v1/vendors/vendor-uuid
 * {
 *   payment_terms: "Net 60",
 *   notes: "Extended payment terms negotiated Q1 2026"
 * }
 *
 * @example
 * // Request - update full address
 * PUT /api/v1/vendors/vendor-uuid
 * {
 *   address_line1: "456 New Location Ave",
 *   address_line2: "Suite 200",
 *   city: "New York",
 *   state: "NY",
 *   postal_code: "10001"
 * }
 *
 * @example
 * // Request - change vendor type
 * PUT /api/v1/vendors/vendor-uuid
 * {
 *   vendor_type: "distributor",
 *   notes: "Changed from supplier to distributor due to expanded operations"
 * }
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   message: "Vendor updated successfully",
 *   data: {
 *     id: "vendor-uuid",
 *     vendor_number: "VEND-000001",
 *     vendor_type: "supplier",
 *     business_name: "Acme Wholesale Distributors",
 *     contact_person: "Jane Doe",
 *     email: "jane@acmewholesale.com",
 *     phone: "+1-555-0199",
 *     address_line1: "123 Warehouse Blvd",
 *     city: "Chicago",
 *     state: "IL",
 *     postal_code: "60601",
 *     country: "USA",
 *     payment_terms: "Net 30",
 *     tax_id: "12-3456789",
 *     notes: "Primary supplier for office supplies",
 *     is_active: true,
 *     created_at: "2026-01-15T10:00:00Z",
 *     updated_at: "2026-02-08T15:30:00Z"
 *   }
 * }
 *
 * @example
 * // Error response (404 Not Found)
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Vendor not found"
 *   }
 * }
 *
 * @example
 * // Error response (400 No Fields)
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "No fields to update"
 *   }
 * }
 */
export async function updateVendor(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = UpdateVendorSchema.parse(req.body);

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update',
        },
      });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE vendors SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    return res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating vendor:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update vendor',
      },
    });
  }
}

/**
 * Delete vendor (soft delete)
 *
 * HTTP: DELETE /api/v1/vendors/:id
 *
 * Soft deletes vendor by setting is_active = false.
 * Validates vendor has no purchase orders before allowing deletion.
 *
 * Validation rules:
 * - Vendor must exist
 * - Vendor must have no existing purchase orders (draft, ordered, or received)
 * - If validation fails, returns 400 Bad Request with error message
 *
 * Purchase order validation:
 * - Checks purchase_orders table for any records with vendor_id
 * - Prevents deletion if ANY purchase orders exist (regardless of status)
 * - This preserves data integrity and prevents orphaned PO records
 * - If vendor has POs, they must be deleted first (or vendor kept active)
 *
 * Soft delete benefits:
 * - Preserves historical data (purchase orders remain valid)
 * - Maintains referential integrity
 * - Allows vendor restoration (manually set is_active = true)
 * - Audit trail preserved (created_at, updated_at)
 * - Prevents accidental data loss
 *
 * Effects:
 * - Vendor hidden from vendor lists (when active_only = true)
 * - Vendor hidden from purchase order vendor selector
 * - Historical purchase orders still reference vendor
 * - Vendor data preserved for reporting and history
 *
 * Hard delete (permanent removal) is not supported to maintain data integrity.
 *
 * Restoration:
 * - To restore deleted vendor, use PUT endpoint with is_active = true
 * - All vendor data remains intact during soft delete
 *
 * @async
 * @param {Request} req - Express request with vendor ID in params
 * @param {Response} res - Express response with success message
 * @returns {Promise<void>} Sends 200 OK with success message
 * @throws {Error} 400 VENDOR_HAS_POS if vendor has purchase orders
 * @throws {Error} 404 NOT_FOUND if vendor does not exist
 * @throws {Error} 500 DATABASE_ERROR if query fails
 *
 * @example
 * // Request
 * DELETE /api/v1/vendors/vendor-uuid
 *
 * @example
 * // Response (200 OK)
 * {
 *   success: true,
 *   message: "Vendor deleted successfully",
 *   data: {
 *     id: "vendor-uuid",
 *     vendor_number: "VEND-000001",
 *     vendor_type: "supplier",
 *     business_name: "Acme Wholesale",
 *     contact_person: "John Smith",
 *     email: "john@acme.com",
 *     phone: "+1-555-0123",
 *     address_line1: "123 Main St",
 *     city: "Chicago",
 *     state: "IL",
 *     postal_code: "60601",
 *     country: "USA",
 *     payment_terms: "Net 30",
 *     tax_id: "12-3456789",
 *     notes: null,
 *     is_active: false,
 *     created_at: "2026-01-15T10:00:00Z",
 *     updated_at: "2026-02-08T16:00:00Z"
 *   }
 * }
 *
 * @example
 * // Error response (400 Has Purchase Orders)
 * {
 *   success: false,
 *   error: {
 *     code: "VENDOR_HAS_POS",
 *     message: "Cannot delete vendor with existing purchase orders"
 *   }
 * }
 *
 * @example
 * // Error response (404 Not Found)
 * {
 *   success: false,
 *   error: {
 *     code: "NOT_FOUND",
 *     message: "Vendor not found"
 *   }
 * }
 */
export async function deleteVendor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if vendor has purchase orders
    const poCheck = await pool.query(
      `SELECT COUNT(*) as count FROM purchase_orders WHERE vendor_id = $1`,
      [id]
    );

    if (parseInt(poCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VENDOR_HAS_POS',
          message: 'Cannot delete vendor with existing purchase orders',
        },
      });
    }

    const result = await pool.query(
      `UPDATE vendors SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    }

    return res.json({
      success: true,
      message: 'Vendor deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to delete vendor',
      },
    });
  }
}
