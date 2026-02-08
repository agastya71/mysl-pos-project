/**
 * Vendor Controller
 * CRUD operations for vendor management
 */

import { Request, Response } from 'express';
import { pool } from '../config/database';
import { z } from 'zod';

// Validation schemas
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

const UpdateVendorSchema = CreateVendorSchema.partial();

/**
 * GET /api/v1/vendors
 * Get all vendors (or filter by active status)
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

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch vendors',
      },
    });
  }
}

/**
 * GET /api/v1/vendors/:id
 * Get vendor by ID
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

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch vendor',
      },
    });
  }
}

/**
 * POST /api/v1/vendors
 * Create new vendor
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

    res.status(201).json({
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
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create vendor',
      },
    });
  }
}

/**
 * PUT /api/v1/vendors/:id
 * Update vendor
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update vendor',
      },
    });
  }
}

/**
 * DELETE /api/v1/vendors/:id
 * Soft delete vendor (set is_active = false)
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

    res.json({
      success: true,
      message: 'Vendor deleted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to delete vendor',
      },
    });
  }
}
