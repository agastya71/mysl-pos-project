import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const productController = new ProductController();

// All product routes require authentication
router.use(authenticateToken);

// Product routes
router.post('/', (req, res, next) => {
  productController.createProduct(req, res).catch(next);
});

router.get('/', (req, res, next) => {
  productController.getProducts(req, res).catch(next);
});

router.get('/search', (req, res, next) => {
  productController.searchProducts(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  productController.getProductById(req, res).catch(next);
});

router.put('/:id', (req, res, next) => {
  productController.updateProduct(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  productController.deleteProduct(req, res).catch(next);
});

export default router;
