/**
 * Inventory Routes
 *
 * Routes for inventory management endpoints
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import {
  createAdjustment,
  getAdjustments,
  getAdjustmentById,
  getProductHistory,
  getLowStockReport,
  getOutOfStockReport,
  getValuationReport,
  getMovementReport,
  getCategorySummaryReport,
} from '../controllers/inventory.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Adjustment routes
router.post('/adjustments', requirePermission('inventory', 'adjust'), createAdjustment);
router.get('/adjustments', requirePermission('inventory', 'read'), getAdjustments);
router.get('/adjustments/:id', requirePermission('inventory', 'read'), getAdjustmentById);

// Product history
router.get('/products/:productId/history', requirePermission('inventory', 'read'), getProductHistory);

// Phase 3C: Report routes
router.get('/reports/low-stock', requirePermission('inventory', 'reports'), getLowStockReport);
router.get('/reports/out-of-stock', requirePermission('inventory', 'reports'), getOutOfStockReport);
router.get('/reports/valuation', requirePermission('inventory', 'reports'), getValuationReport);
router.get('/reports/movement', requirePermission('inventory', 'reports'), getMovementReport);
router.get('/reports/category-summary', requirePermission('inventory', 'reports'), getCategorySummaryReport);

export default router;
