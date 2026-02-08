import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';
import customerRoutes from './customer.routes';
import inventoryRoutes from './inventory.routes';
import vendorRoutes from './vendor.routes';
import purchaseOrderRoutes from './purchaseOrder.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/vendors', vendorRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

export default router;
