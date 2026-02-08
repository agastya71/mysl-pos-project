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

export default router;
