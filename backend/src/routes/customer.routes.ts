import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';

const router = Router();

// Search must come before /:id to avoid treating 'search' as an ID
router.get('/search', customerController.searchCustomers.bind(customerController));

// CRUD routes
router.get('/', customerController.getCustomers.bind(customerController));
router.get('/:id', customerController.getCustomerById.bind(customerController));
router.post('/', customerController.createCustomer.bind(customerController));
router.put('/:id', customerController.updateCustomer.bind(customerController));
router.delete('/:id', customerController.deleteCustomer.bind(customerController));

export default router;
