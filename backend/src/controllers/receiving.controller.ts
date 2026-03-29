import { Request, Response } from 'express';
import { z } from 'zod';
import * as receivingService from '../services/receiving.service';
import type {
  CreateReceivingInput,
  AddItemInput,
} from '../services/receiving.service';

const CreateReceivingSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  receiving_type: z.enum(['purchase', 'donation', 'consignment', 'transfer', 'adjustment']),
  purchase_order_id: z.string().uuid('Invalid PO ID').optional(),
  shipping_carrier: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  packing_slip_number: z.string().max(100).optional(),
  condition_notes: z.string().max(2000).optional(),
  discrepancy_notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  is_donation: z.boolean().optional(),
  donation_date: z.string().optional(),
  fair_market_value: z.number().nonnegative().optional(),
});

const UpdateReceivingSchema = z.object({
  shipping_carrier: z.string().max(100).optional(),
  tracking_number: z.string().max(100).optional(),
  packing_slip_number: z.string().max(100).optional(),
  condition_notes: z.string().max(2000).optional(),
  discrepancy_notes: z.string().max(2000).optional(),
  internal_notes: z.string().max(2000).optional(),
  is_donation: z.boolean().optional(),
  donation_receipt_sent: z.boolean().optional(),
  donation_receipt_number: z.string().max(50).optional(),
  donation_date: z.string().optional(),
  fair_market_value: z.number().nonnegative().optional(),
});

const AddItemSchema = z.object({
  purchase_order_item_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  product_name: z.string().min(1, 'Product name is required').max(255),
  product_description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  quantity_received: z.number().int().positive('Quantity must be positive'),
  unit_cost: z.number().nonnegative().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']),
  accepted_quantity: z.number().int().nonnegative().optional(),
  rejected_quantity: z.number().int().nonnegative().optional(),
  rejection_reason: z.string().max(500).optional(),
  add_to_inventory: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const UpdateItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  sku: z.string().max(100).optional(),
  product_name: z.string().max(255).optional(),
  product_description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional(),
  quantity_received: z.number().int().positive().optional(),
  unit_cost: z.number().nonnegative().optional(),
  fair_market_value: z.number().nonnegative().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor', 'damaged']).optional(),
  accepted_quantity: z.number().int().nonnegative().optional(),
  rejected_quantity: z.number().int().nonnegative().optional(),
  rejection_reason: z.string().max(500).optional(),
  add_to_inventory: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const CancelReceivingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

export async function createReceiving(req: Request, res: Response): Promise<void> {
  const parsed = CreateReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.createReceiving(req.user!.userId, parsed.data as CreateReceivingInput);
    res.status(201).json({ success: true, data: receiving });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function listReceivings(req: Request, res: Response): Promise<void> {
  try {
    const query = {
      status: req.query.status as string | undefined,
      vendor_id: req.query.vendor_id as string | undefined,
      receiving_type: req.query.receiving_type as string | undefined,
      purchase_order_id: req.query.purchase_order_id as string | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };
    const result = await receivingService.listReceivings(query);
    res.status(200).json({ success: true, data: result });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
}

export async function getReceiving(req: Request, res: Response): Promise<void> {
  try {
    const receiving = await receivingService.getReceiving(req.params.id);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function updateReceiving(req: Request, res: Response): Promise<void> {
  const parsed = UpdateReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.updateReceiving(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function completeReceiving(req: Request, res: Response): Promise<void> {
  try {
    const receiving = await receivingService.completeReceiving(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function cancelReceiving(req: Request, res: Response): Promise<void> {
  const parsed = CancelReceivingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const receiving = await receivingService.cancelReceiving(req.params.id, parsed.data.reason);
    res.status(200).json({ success: true, data: receiving });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const item = await receivingService.addItem(req.params.id, parsed.data as AddItemInput);
    res.status(201).json({ success: true, data: item });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const parsed = UpdateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: 'Validation error', details: parsed.error.issues } });
    return;
  }
  try {
    const item = await receivingService.updateItem(req.params.id, parsed.data);
    res.status(200).json({ success: true, data: item });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  try {
    await receivingService.deleteItem(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Item deleted' } });
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    res.status(e.statusCode || 500).json({
      success: false,
      error: { code: e.code || 'INTERNAL_ERROR', message: e.message || 'Internal server error' },
    });
  }
}
