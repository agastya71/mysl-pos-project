/**
 * Reconciliation Routes
 *
 * GET  /api/v1/reconciliation?date=YYYY-MM-DD  — Fetch cached report (stub: re-runs for simplicity)
 * POST /api/v1/reconciliation/run              — Run reconciliation for a given date
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import reconciliationService from '../services/reconciliation.service';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

const router = Router();

router.use(authenticateToken);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

router.get('/', requirePermission('transactions', 'read'), (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const validation = dateSchema.safeParse(date);
      if (!validation.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD');
      }

      const report = await reconciliationService.runDailyReconciliation(validation.data);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  })();
});

router.post('/run', requirePermission('transactions', 'read'), (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const date = (req.body.date as string) || new Date().toISOString().slice(0, 10);
      const validation = dateSchema.safeParse(date);
      if (!validation.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD');
      }

      const report = await reconciliationService.runDailyReconciliation(validation.data);

      res.status(200).json({
        success: true,
        message: 'Reconciliation completed',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  })();
});

export default router;
