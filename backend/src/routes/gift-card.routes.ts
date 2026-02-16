/**
 * Gift Card Routes
 * API routes for gift card management
 */

import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as giftCardController from '../controllers/gift-card.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/v1/gift-cards
 * Create new gift card
 */
router.post(
  '/',
  requirePermission('gift_cards', 'create'),
  giftCardController.createGiftCard
);

/**
 * GET /api/v1/gift-cards
 * List gift cards with filters
 */
router.get(
  '/',
  requirePermission('gift_cards', 'read'),
  giftCardController.listGiftCards
);

/**
 * GET /api/v1/gift-cards/:number/balance
 * Check gift card balance by number
 * Note: This route must come before /:id to avoid conflict
 */
router.get(
  '/:number/balance',
  requirePermission('gift_cards', 'read'),
  giftCardController.checkBalance
);

/**
 * GET /api/v1/gift-cards/:id/history
 * Get gift card transaction history
 */
router.get(
  '/:id/history',
  requirePermission('gift_cards', 'read'),
  giftCardController.getGiftCardHistory
);

/**
 * GET /api/v1/gift-cards/:id
 * Get gift card by ID
 */
router.get(
  '/:id',
  requirePermission('gift_cards', 'read'),
  giftCardController.getGiftCardById
);

/**
 * PUT /api/v1/gift-cards/:id
 * Update gift card details
 */
router.put(
  '/:id',
  requirePermission('gift_cards', 'update'),
  giftCardController.updateGiftCard
);

/**
 * PUT /api/v1/gift-cards/:id/adjust
 * Adjust gift card balance (admin only)
 */
router.put(
  '/:id/adjust',
  requirePermission('gift_cards', 'update'),
  giftCardController.adjustBalance
);

/**
 * DELETE /api/v1/gift-cards/:id
 * Deactivate gift card
 */
router.delete(
  '/:id',
  requirePermission('gift_cards', 'delete'),
  giftCardController.deactivateGiftCard
);

export default router;
