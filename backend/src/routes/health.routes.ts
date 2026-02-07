import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

router.get('/', (req, res, next) => {
  healthController.check(req, res).catch(next);
});

export default router;
