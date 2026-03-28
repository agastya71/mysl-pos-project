import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as vpController from '../controllers/vendorPayments.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('vendor_payments', 'read'), vpController.listPayments);
router.post('/batch', requirePermission('vendor_payments', 'create'), vpController.batchPayments);
router.post('/', requirePermission('vendor_payments', 'create'), vpController.createPayment);
router.get('/:id', requirePermission('vendor_payments', 'read'), vpController.getPayment);
router.put('/:id', requirePermission('vendor_payments', 'update'), vpController.updatePayment);
router.post('/:id/approve', requirePermission('vendor_payments', 'approve'), vpController.approvePayment);
router.post('/:id/void', requirePermission('vendor_payments', 'update'), vpController.voidPayment);

export default router;
