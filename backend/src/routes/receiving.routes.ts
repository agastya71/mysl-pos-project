import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as receivingController from '../controllers/receiving.controller';

const router = Router();

router.use(authenticateToken);

// Item-level routes MUST come before /:id to prevent Express matching 'items' as an ID param
router.put('/items/:id', requirePermission('receiving', 'update'), receivingController.updateItem);
router.delete('/items/:id', requirePermission('receiving', 'update'), receivingController.deleteItem);

router.get('/', requirePermission('receiving', 'read'), receivingController.listReceivings);
router.post('/', requirePermission('receiving', 'create'), receivingController.createReceiving);
router.get('/:id', requirePermission('receiving', 'read'), receivingController.getReceiving);
router.put('/:id', requirePermission('receiving', 'update'), receivingController.updateReceiving);
router.post('/:id/complete', requirePermission('receiving', 'complete'), receivingController.completeReceiving);
router.post('/:id/cancel', requirePermission('receiving', 'cancel'), receivingController.cancelReceiving);
router.post('/:id/items', requirePermission('receiving', 'update'), receivingController.addItem);

export default router;
