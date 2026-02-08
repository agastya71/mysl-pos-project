/**
 * Purchase Order Routes
 * API endpoints for PO management
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as purchaseOrderController from '../controllers/purchaseOrder.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/purchase-orders/reorder-suggestions
 * IMPORTANT: This route MUST come before /:id to avoid matching "reorder-suggestions" as an ID
 */
router.get('/reorder-suggestions', purchaseOrderController.getReorderSuggestions);

/**
 * GET /api/v1/purchase-orders
 * Query params: vendor_id, status, order_type, start_date, end_date, search, page, limit
 */
router.get('/', purchaseOrderController.getPOs);

/**
 * GET /api/v1/purchase-orders/:id
 */
router.get('/:id', purchaseOrderController.getPOById);

/**
 * POST /api/v1/purchase-orders
 */
router.post('/', purchaseOrderController.createPO);

/**
 * PUT /api/v1/purchase-orders/:id
 */
router.put('/:id', purchaseOrderController.updatePO);

/**
 * DELETE /api/v1/purchase-orders/:id
 */
router.delete('/:id', purchaseOrderController.deletePO);

/**
 * POST /api/v1/purchase-orders/:id/submit
 */
router.post('/:id/submit', purchaseOrderController.submitPO);

/**
 * POST /api/v1/purchase-orders/:id/approve
 */
router.post('/:id/approve', purchaseOrderController.approvePO);

/**
 * POST /api/v1/purchase-orders/:id/receive
 */
router.post('/:id/receive', purchaseOrderController.receiveItems);

/**
 * POST /api/v1/purchase-orders/:id/cancel
 */
router.post('/:id/cancel', purchaseOrderController.cancelPO);

/**
 * POST /api/v1/purchase-orders/:id/close
 */
router.post('/:id/close', purchaseOrderController.closePO);

export default router;
