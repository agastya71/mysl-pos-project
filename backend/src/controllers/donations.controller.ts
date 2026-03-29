import { Request, Response } from 'express';
import { z } from 'zod';
import * as donationsService from '../services/donations.service';

const DonationItemSchema = z.object({
  product_id:        z.string().uuid().optional(),
  sku:               z.string().max(100).optional(),
  product_name:      z.string().min(1, 'Product name is required').max(255),
  category_id:       z.string().uuid().optional(),
  quantity_received: z.number().int().positive('Quantity must be positive'),
  fair_market_value: z.number().nonnegative().optional(),
  condition:         z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']),
  notes:             z.string().max(2000).optional(),
});

const CreateDonationSchema = z.object({
  vendor_id:                  z.string().uuid('Invalid vendor ID'),
  donor_name:                 z.string().min(1, 'Donor name is required').max(255),
  donor_email:                z.string().email().max(255).optional(),
  donor_phone:                z.string().max(20).optional(),
  donor_address:              z.string().max(500).optional(),
  donation_date:              z.string().optional(),
  donation_type:              z.enum(['goods', 'cash', 'mixed']),
  fair_market_value:          z.number().nonnegative('Fair market value must be >= 0'),
  cash_amount:                z.number().nonnegative().optional(),
  tax_receipt_required:       z.boolean().optional(),
  goods_services_provided:    z.boolean().optional(),
  goods_services_description: z.string().max(2000).optional(),
  goods_services_value:       z.number().nonnegative().optional(),
  appraisal_required:         z.boolean().optional(),
  notes:                      z.string().max(2000).optional(),
  internal_notes:             z.string().max(2000).optional(),
  items:                      z.array(DonationItemSchema).optional(),
});

const UpdateDonationSchema = z.object({
  donor_name:                 z.string().min(1).max(255).optional(),
  donor_email:                z.string().email().max(255).optional(),
  donor_phone:                z.string().max(20).optional(),
  donor_address:              z.string().max(500).optional(),
  donation_date:              z.string().optional(),
  donation_type:              z.enum(['goods', 'cash', 'mixed']).optional(),
  fair_market_value:          z.number().nonnegative().optional(),
  cash_amount:                z.number().nonnegative().optional(),
  tax_receipt_required:       z.boolean().optional(),
  goods_services_provided:    z.boolean().optional(),
  goods_services_description: z.string().max(2000).optional(),
  goods_services_value:       z.number().nonnegative().optional(),
  appraisal_required:         z.boolean().optional(),
  appraiser_name:             z.string().max(255).optional(),
  appraisal_date:             z.string().optional(),
  notes:                      z.string().max(2000).optional(),
  internal_notes:             z.string().max(2000).optional(),
});

const SendReceiptSchema = z.object({
  email:  z.string().email().optional(),
  method: z.string().max(50).optional(),
});

function errResponse(res: Response, err: unknown): void {
  const e = err as { statusCode?: number; code?: string; message?: string };
  res.status(e.statusCode || 500).json({
    success: false,
    error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
  });
}

export async function createDonation(req: Request, res: Response): Promise<void> {
  const parsed = CreateDonationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.createDonation(req.user!.userId, parsed.data as any);
    res.status(201).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function listDonations(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      vendor_id:     req.query.vendor_id     as string | undefined,
      donation_type: req.query.donation_type as string | undefined,
      receipt_sent:  req.query.receipt_sent !== undefined
                       ? req.query.receipt_sent === 'true'
                       : undefined,
      start_date:    req.query.start_date    as string | undefined,
      end_date:      req.query.end_date      as string | undefined,
      page:          req.query.page  ? parseInt(req.query.page  as string, 10) : 1,
      limit:         req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await donationsService.listDonations(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getDonation(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.getDonation(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getReceiptByNumber(req: Request, res: Response): Promise<void> {
  try {
    const receipt = await donationsService.getReceiptByNumber(req.params.donationNumber);
    res.status(200).json({ success: true, data: receipt });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function getAnnualSummary(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year, 10);
    const summary = await donationsService.getAnnualSummary(req.params.vendorId, year);
    res.status(200).json({ success: true, data: summary });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function updateDonation(req: Request, res: Response): Promise<void> {
  const parsed = UpdateDonationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.updateDonation(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function generateReceipt(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.generateReceipt(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function sendReceipt(req: Request, res: Response): Promise<void> {
  const parsed = SendReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const donation = await donationsService.sendReceipt(req.params.id, parsed.data.email, parsed.data.method);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}

export async function generateAcknowledgment(req: Request, res: Response): Promise<void> {
  try {
    const donation = await donationsService.generateAcknowledgment(req.params.id);
    res.status(200).json({ success: true, data: donation });
  } catch (err: unknown) { errResponse(res, err); }
}
