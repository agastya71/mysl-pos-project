/**
 * Purchase Order Routes
 * API endpoints for PO management
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as purchaseOrderController from '../controllers/purchaseOrder.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/purchase-orders/reorder-suggestions
 * IMPORTANT: This route MUST come before /:id to avoid matching "reorder-suggestions" as an ID
 */
router.get('/reorder-suggestions', requirePermission('purchase_orders', 'read'), purchaseOrderController.getReorderSuggestions);

/**
 * GET /api/v1/purchase-orders
 * Query params: vendor_id, status, order_type, start_date, end_date, search, page, limit
 */
router.get('/', requirePermission('purchase_orders', 'read'), purchaseOrderController.getPOs);

/**
 * GET /api/v1/purchase-orders/:id
 */
router.get('/:id', requirePermission('purchase_orders', 'read'), purchaseOrderController.getPOById);

/**
 * POST /api/v1/purchase-orders
 */
router.post('/', requirePermission('purchase_orders', 'create'), purchaseOrderController.createPO);

/**
 * PUT /api/v1/purchase-orders/:id
 */
router.put('/:id', requirePermission('purchase_orders', 'update'), purchaseOrderController.updatePO);

/**
 * DELETE /api/v1/purchase-orders/:id
 */
router.delete('/:id', requirePermission('purchase_orders', 'delete'), purchaseOrderController.deletePO);

/**
 * POST /api/v1/purchase-orders/:id/submit
 */
router.post('/:id/submit', requirePermission('purchase_orders', 'update'), purchaseOrderController.submitPO);

/**
 * POST /api/v1/purchase-orders/:id/approve
 */
router.post('/:id/approve', requirePermission('purchase_orders', 'approve'), purchaseOrderController.approvePO);

/**
 * POST /api/v1/purchase-orders/:id/receive
 */
router.post('/:id/receive', requirePermission('purchase_orders', 'receive'), purchaseOrderController.receiveItems);

/**
 * POST /api/v1/purchase-orders/:id/cancel
 */
router.post('/:id/cancel', requirePermission('purchase_orders', 'cancel'), purchaseOrderController.cancelPO);

/**
 * POST /api/v1/purchase-orders/:id/close
 */
router.post('/:id/close', requirePermission('purchase_orders', 'update'), purchaseOrderController.closePO);

export default router;
