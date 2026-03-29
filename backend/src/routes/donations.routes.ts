import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';
import * as donationsController from '../controllers/donations.controller';

const router = Router();

router.use(authenticateToken);

// Static sub-paths MUST come before /:id
router.get('/annual-summary/:vendorId/:year', requirePermission('donations', 'read'),   donationsController.getAnnualSummary);
router.get('/receipts/:donationNumber',        requirePermission('donations', 'read'),   donationsController.getReceiptByNumber);

router.get('/',    requirePermission('donations', 'read'),   donationsController.listDonations);
router.post('/',   requirePermission('donations', 'create'), donationsController.createDonation);
router.get('/:id', requirePermission('donations', 'read'),   donationsController.getDonation);
router.put('/:id', requirePermission('donations', 'update'), donationsController.updateDonation);

router.post('/:id/generate-receipt',        requirePermission('donations', 'receipt'), donationsController.generateReceipt);
router.post('/:id/send-receipt',            requirePermission('donations', 'receipt'), donationsController.sendReceipt);
router.post('/:id/generate-acknowledgment', requirePermission('donations', 'receipt'), donationsController.generateAcknowledgment);

export default router;
