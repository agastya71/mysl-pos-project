import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();
const productController = new ProductController();

// All product routes require authentication
router.use(authenticateToken);

// Product routes with RBAC
router.post('/', requirePermission('products', 'create'), (req, res, next) => {
  productController.createProduct(req, res).catch(next);
});

router.get('/', requirePermission('products', 'read'), (req, res, next) => {
  productController.getProducts(req, res).catch(next);
});

router.get('/search', requirePermission('products', 'read'), (req, res, next) => {
  productController.searchProducts(req, res).catch(next);
});

router.get('/:id', requirePermission('products', 'read'), (req, res, next) => {
  (productController.getProductById as any)(req, res).catch(next);
});

router.put('/:id', requirePermission('products', 'update'), (req, res, next) => {
  (productController.updateProduct as any)(req, res).catch(next);
});

router.delete('/:id', requirePermission('products', 'delete'), (req, res, next) => {
  (productController.deleteProduct as any)(req, res).catch(next);
});

export default router;
