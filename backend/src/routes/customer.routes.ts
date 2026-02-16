import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// All customer routes require authentication
router.use(authenticateToken);

// Search must come before /:id to avoid treating 'search' as an ID
router.get('/search', requirePermission('customers', 'read'), customerController.searchCustomers.bind(customerController));

// CRUD routes with RBAC
router.get('/', requirePermission('customers', 'read'), customerController.getCustomers.bind(customerController));
router.get('/:id', requirePermission('customers', 'read'), customerController.getCustomerById.bind(customerController));
router.post('/', requirePermission('customers', 'create'), customerController.createCustomer.bind(customerController));
router.put('/:id', requirePermission('customers', 'update'), customerController.updateCustomer.bind(customerController));
router.delete('/:id', requirePermission('customers', 'delete'), customerController.deleteCustomer.bind(customerController));

export default router;
