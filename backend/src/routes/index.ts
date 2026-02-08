import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';
import customerRoutes from './customer.routes';
import inventoryRoutes from './inventory.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
