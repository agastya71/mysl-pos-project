import { Request, Response } from 'express';
import { z } from 'zod';
import { CreateInvoiceInput } from '../types/accountsPayable.types';
import * as apService from '../services/accountsPayable.service';

const CreateInvoiceSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  purchase_order_id: z.string().uuid('Invalid PO ID').optional(),
  invoice_number: z.string().max(100).optional(),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  invoice_amount: z.number().positive('Invoice amount must be positive'),
  discount_available: z.number().nonnegative().optional(),
  discount_date: z.string().optional(),
  payment_terms: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
});

const UpdateInvoiceSchema = z.object({
  due_date: z.string().optional(),
  payment_terms: z.string().max(100).optional(),
  discount_available: z.number().nonnegative().optional(),
  discount_date: z.string().optional(),
  notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const CancelInvoiceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const parsed = CreateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const input: CreateInvoiceInput = parsed.data as CreateInvoiceInput;
    const invoice = await apService.createInvoice(req.user!.userId, input);
    res.status(201).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  try {
    const invoice = await apService.getInvoice(req.params.id);
    res.status(200).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      vendor_id: req.query.vendor_id as string | undefined,
      status: req.query.status as string | undefined,
      overdue: req.query.overdue as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await apService.listInvoices(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function updateInvoice(req: Request, res: Response): Promise<void> {
  const parsed = UpdateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const invoice = await apService.updateInvoice(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function cancelInvoice(req: Request, res: Response): Promise<void> {
  const parsed = CancelInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const invoice = await apService.cancelInvoice(req.params.id, parsed.data.reason);
    res.status(200).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else if (err.message) {
      res.status(400).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function getAgingReport(req: Request, res: Response): Promise<void> {
  try {
    const vendorId = req.query.vendor_id as string | undefined;
    const asOfDate = req.query.as_of_date as string | undefined;
    const report = await apService.getAgingReport(vendorId, asOfDate);
    res.status(200).json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function getDueThisWeek(req: Request, res: Response): Promise<void> {
  try {
    const invoices = await apService.getDueThisWeek();
    res.status(200).json({ success: true, data: invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}
