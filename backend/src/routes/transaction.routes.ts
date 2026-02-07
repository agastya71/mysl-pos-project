import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// All transaction routes require authentication
router.use(authenticateToken);

// Transaction routes
router.post('/', (req, res, next) => {
  transactionController.createTransaction(req, res).catch(next);
});

router.get('/', (req, res, next) => {
  transactionController.getTransactions(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  transactionController.getTransactionById(req, res).catch(next);
});

router.put('/:id/void', (req, res, next) => {
  transactionController.voidTransaction(req, res).catch(next);
});

export default router;
