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

// Stubs — implemented in Tasks 4-6
export async function getInvoice(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
export async function listInvoices(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
export async function updateInvoice(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
export async function cancelInvoice(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
export async function getAgingReport(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
export async function getDueThisWeek(req: Request, res: Response): Promise<void> {
  res.status(501).json({ success: false, error: { message: 'Not yet implemented' } });
}
