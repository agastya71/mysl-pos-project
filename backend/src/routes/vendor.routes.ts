/**
 * Vendor Routes
 * API endpoints for vendor management (CRUD)
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as vendorController from '../controllers/vendor.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/vendors
 * Get all vendors (query: active_only=true to filter)
 */
router.get('/', vendorController.getVendors);

/**
 * GET /api/v1/vendors/:id
 * Get vendor by ID
 */
router.get('/:id', vendorController.getVendorById);

/**
 * POST /api/v1/vendors
 * Create new vendor
 */
router.post('/', vendorController.createVendor);

/**
 * PUT /api/v1/vendors/:id
 * Update vendor
 */
router.put('/:id', vendorController.updateVendor);

/**
 * DELETE /api/v1/vendors/:id
 * Soft delete vendor
 */
router.delete('/:id', vendorController.deleteVendor);

export default router;
