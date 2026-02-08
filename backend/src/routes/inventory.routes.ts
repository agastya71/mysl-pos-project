/**
 * Inventory Routes
 *
 * Routes for inventory management endpoints
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
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
router.post('/adjustments', createAdjustment);
router.get('/adjustments', getAdjustments);
router.get('/adjustments/:id', getAdjustmentById);

// Product history
router.get('/products/:productId/history', getProductHistory);

// Phase 3C: Report routes
router.get('/reports/low-stock', getLowStockReport);
router.get('/reports/out-of-stock', getOutOfStockReport);
router.get('/reports/valuation', getValuationReport);
router.get('/reports/movement', getMovementReport);
router.get('/reports/category-summary', getCategorySummaryReport);

export default router;
