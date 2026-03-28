import { Request, Response } from 'express';
import { z } from 'zod';
import * as vpService from '../services/vendorPayments.service';

const InvoiceAllocationSchema = z.object({
  ap_invoice_id: z.string().uuid('Invalid AP invoice ID'),
  allocated_amount: z.number().positive('Allocated amount must be positive'),
  discount_taken: z.number().nonnegative().optional(),
});

const CreatePaymentSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash', 'other']),
  reference_number: z.string().max(100).optional(),
  memo: z.string().max(1000).optional(),
  invoice_allocations: z.array(InvoiceAllocationSchema).min(1, 'At least one allocation is required'),
});

const UpdatePaymentSchema = z.object({
  payment_date: z.string().optional(),
  payment_method: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash', 'other']).optional(),
  reference_number: z.string().max(100).optional(),
  memo: z.string().max(1000).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const BatchPaymentSchema = z.object({
  payments: z.array(CreatePaymentSchema).min(1, 'At least one payment is required'),
});

export async function createPayment(req: Request, res: Response): Promise<void> {
  const parsed = CreatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payment = await vpService.createPayment(req.user!.userId, parsed.data as any);
    res.status(201).json({ success: true, data: payment });
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

export async function batchPayments(req: Request, res: Response): Promise<void> {
  const parsed = BatchPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payments = await vpService.batchPayments(req.user!.userId, parsed.data as any);
    res.status(201).json({ success: true, data: payments });
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

export async function listPayments(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      vendor_id: req.query.vendor_id as string | undefined,
      status: req.query.status as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await vpService.listPayments(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  try {
    const payment = await vpService.getPayment(req.params.id);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function updatePayment(req: Request, res: Response): Promise<void> {
  const parsed = UpdatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const payment = await vpService.updatePayment(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: payment });
  } catch (err: any) {
    if (err.message?.toLowerCase().includes('not found')) {
      res.status(404).json({ success: false, error: { message: err.message } });
    } else {
      res.status(500).json({ success: false, error: { message: 'Internal server error' } });
    }
  }
}

export async function approvePayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const payment = await vpService.approvePayment(id, req.user!.userId);
    res.status(200).json({ success: true, data: payment });
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

export async function voidPayment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const payment = await vpService.voidPayment(id);
    res.status(200).json({ success: true, data: payment });
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
