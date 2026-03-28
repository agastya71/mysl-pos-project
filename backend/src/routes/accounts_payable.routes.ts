import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as apController from '../controllers/accountsPayable.controller';

const router = Router();

router.use(authenticateToken);

// Static routes MUST be before /:id to prevent Express treating them as ID params
router.get('/aging-report', requirePermission('accounts_payable', 'read'), apController.getAgingReport);
router.get('/due-this-week', requirePermission('accounts_payable', 'read'), apController.getDueThisWeek);

router.get('/', requirePermission('accounts_payable', 'read'), apController.listInvoices);
router.post('/', requirePermission('accounts_payable', 'create'), apController.createInvoice);
router.get('/:id', requirePermission('accounts_payable', 'read'), apController.getInvoice);
router.put('/:id', requirePermission('accounts_payable', 'update'), apController.updateInvoice);
router.post('/:id/cancel', requirePermission('accounts_payable', 'update'), apController.cancelInvoice);

export default router;
