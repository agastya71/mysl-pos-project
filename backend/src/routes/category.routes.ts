import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const productController = new ProductController();

// All category routes require authentication
router.use(authenticateToken);

// Category routes
router.get('/', (req, res, next) => {
  productController.getCategories(req, res).catch(next);
});

export default router;
