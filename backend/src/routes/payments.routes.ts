/**
 * Payments Routes — Square Terminal checkout endpoints
 *
 * POST /api/v1/payments/terminal/checkout         — create checkout on device
 * GET  /api/v1/payments/terminal/checkout/:id     — poll checkout status
 * POST /api/v1/payments/terminal/checkout/:id/cancel — cancel checkout
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import terminalService from '../services/terminal.service';

const router = Router();

const createCheckoutSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be at least $0.01'),
  idempotencyKey: z.string().uuid('idempotencyKey must be a UUID'),
});

router.use(authenticateToken);

// POST /api/v1/payments/terminal/checkout
router.post('/terminal/checkout', requirePermission('payments', 'create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', validation.error.errors);
    }

    const { amount, idempotencyKey } = validation.data;
    const result = await terminalService.createCheckout(amount, idempotencyKey);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/payments/terminal/checkout/:id
router.get('/terminal/checkout/:id', requirePermission('payments', 'read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await terminalService.getCheckoutStatus(id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payments/terminal/checkout/:id/cancel
router.post('/terminal/checkout/:id/cancel', requirePermission('payments', 'update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await terminalService.cancelCheckout(id);
    res.status(200).json({ success: true, data: { message: 'Checkout cancelled' } });
  } catch (err) {
    next(err);
  }
});

export default router;
