import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// All transaction routes require authentication
router.use(authenticateToken);

// Transaction routes with RBAC
router.post('/', requirePermission('transactions', 'create'), (req, res, next) => {
  transactionController.createTransaction(req, res).catch(next);
});

router.get('/', requirePermission('transactions', 'read'), (req, res, next) => {
  transactionController.getTransactions(req, res).catch(next);
});

router.get('/:id', requirePermission('transactions', 'read'), (req, res, next) => {
  (transactionController.getTransactionById as any)(req, res).catch(next);
});

router.put('/:id/void', requirePermission('transactions', 'update'), (req, res, next) => {
  (transactionController.voidTransaction as any)(req, res).catch(next);
});

export default router;
