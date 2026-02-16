import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { loginLimiter, refreshLimiter } from '../middleware/rateLimit.middleware';

const router = Router();
const authController = new AuthController();

router.post('/login', loginLimiter, (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post('/refresh', refreshLimiter, (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

router.post('/logout', authenticateToken, (req, res, next) => {
  authController.logout(req, res).catch(next);
});

export default router;
