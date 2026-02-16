/**
 * Gift Card Controller
 * HTTP request handlers for gift card endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GiftCardService } from '../services/gift-card.service';
import { AppError } from '../middleware/error.middleware';
import { CreateGiftCardParams } from '../types/gift-card.types';

const giftCardService = new GiftCardService();

// Validation schemas
const createGiftCardSchema = z.object({
  initial_balance: z.number().positive('Initial balance must be positive'),
  recipient_name: z.string().max(100).optional(),
  recipient_email: z.string().email('Invalid email format').optional(),
  recipient_phone: z.string().max(20).optional(),
  expires_at: z.string().datetime().optional(),
  purchased_by_customer_id: z.string().uuid().optional(),
  purchased_transaction_id: z.string().uuid().optional(),
});

const updateGiftCardSchema = z.object({
  recipient_name: z.string().max(100).optional(),
  recipient_email: z.string().email('Invalid email format').optional(),
  recipient_phone: z.string().max(20).optional(),
  expires_at: z.string().datetime().optional(),
  is_active: z.boolean().optional(),
});

const adjustBalanceSchema = z.object({
  amount: z.number(),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * POST /api/v1/gift-cards
 * Create new gift card
 */
export const createGiftCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createGiftCardSchema.parse(req.body) as CreateGiftCardParams;

    const giftCard = await giftCardService.createGiftCard(validatedData);

    res.status(201).json({
      success: true,
      message: 'Gift card created successfully',
      data: giftCard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, 'VALIDATION_ERROR', error.errors[0].message));
    } else {
      next(error);
    }
  }
};

/**
 * GET /api/v1/gift-cards/:id
 * Get gift card by ID
 */
export const getGiftCardById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'INVALID_ID', 'Invalid gift card ID format');
    }

    const giftCard = await giftCardService.getGiftCardById(id);

    if (!giftCard) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    res.json({
      success: true,
      data: giftCard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/gift-cards/:number/balance
 * Check gift card balance by number
 */
export const checkBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { number } = req.params;

    const balanceInfo = await giftCardService.checkBalance(number);

    res.json({
      success: true,
      data: balanceInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/gift-cards
 * List gift cards with filters
 */
export const listGiftCards = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      is_active,
      purchased_by_customer_id,
      min_balance,
      max_balance,
      search,
      page,
      limit,
    } = req.query;

    const filters = {
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      purchased_by_customer_id: purchased_by_customer_id as string | undefined,
      min_balance: min_balance ? parseFloat(min_balance as string) : undefined,
      max_balance: max_balance ? parseFloat(max_balance as string) : undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    };

    const result = await giftCardService.listGiftCards(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/gift-cards/:id
 * Update gift card details
 */
export const updateGiftCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'INVALID_ID', 'Invalid gift card ID format');
    }

    const validatedData = updateGiftCardSchema.parse(req.body);

    const giftCard = await giftCardService.updateGiftCard(id, validatedData);

    res.json({
      success: true,
      message: 'Gift card updated successfully',
      data: giftCard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, 'VALIDATION_ERROR', error.errors[0].message));
    } else {
      next(error);
    }
  }
};

/**
 * PUT /api/v1/gift-cards/:id/adjust
 * Adjust gift card balance
 */
export const adjustBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'INVALID_ID', 'Invalid gift card ID format');
    }

    const validatedData = adjustBalanceSchema.parse(req.body);

    const giftCard = await giftCardService.adjustBalance({
      gift_card_id: id,
      amount: validatedData.amount,
      reason: validatedData.reason,
      user_id: req.user!.userId,
    });

    res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: giftCard,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, 'VALIDATION_ERROR', error.errors[0].message));
    } else {
      next(error);
    }
  }
};

/**
 * DELETE /api/v1/gift-cards/:id
 * Deactivate gift card
 */
export const deactivateGiftCard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'INVALID_ID', 'Invalid gift card ID format');
    }

    await giftCardService.deactivateGiftCard(id);

    res.json({
      success: true,
      message: 'Gift card deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/gift-cards/:id/history
 * Get gift card transaction history
 */
export const getGiftCardHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError(400, 'INVALID_ID', 'Invalid gift card ID format');
    }

    const history = await giftCardService.getGiftCardHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
