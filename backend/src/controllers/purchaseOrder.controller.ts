/**
 * Purchase Order Controller
 * Request handlers with Zod validation for PO management
 *
 * Pattern: Mirrors inventory.controller.ts with comprehensive validation
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import * as purchaseOrderService from '../services/purchaseOrder.service';
import { ApiResponse } from '../types/api.types';
import { PurchaseOrderWithDetails } from '../types/purchaseOrder.types';

// Zod schemas for request validation

const POItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity_ordered: z.number().int().positive('Quantity must be positive'),
  unit_cost: z.number().positive('Unit cost must be positive'),
  tax_amount: z.number().nonnegative('Tax amount cannot be negative').optional(),
  notes: z.string().max(1000).optional(),
});

const CreatePOSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  order_type: z.enum(['standard', 'urgent', 'drop_ship']),
  expected_delivery_date: z.string().datetime().optional(),
  shipping_address: z.string().max(500).optional(),
  billing_address: z.string().max(500).optional(),
  payment_terms: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(POItemSchema).min(1, 'At least one item is required'),
  shipping_cost: z.number().nonnegative('Shipping cost cannot be negative').optional(),
  other_charges: z.number().nonnegative('Other charges cannot be negative').optional(),
  discount_amount: z.number().nonnegative('Discount amount cannot be negative').optional(),
});

const UpdatePOItemSchema = z.object({
  id: z.string().uuid().optional(), // If present, updates existing item
  product_id: z.string().uuid('Invalid product ID'),
  quantity_ordered: z.number().int().positive('Quantity must be positive'),
  unit_cost: z.number().positive('Unit cost must be positive'),
  tax_amount: z.number().nonnegative('Tax amount cannot be negative').optional(),
  notes: z.string().max(1000).optional(),
});

const UpdatePOSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID').optional(),
  order_type: z.enum(['standard', 'urgent', 'drop_ship']).optional(),
  expected_delivery_date: z.string().datetime().optional(),
  shipping_address: z.string().max(500).optional(),
  billing_address: z.string().max(500).optional(),
  payment_terms: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(UpdatePOItemSchema).optional(),
  shipping_cost: z.number().nonnegative('Shipping cost cannot be negative').optional(),
  other_charges: z.number().nonnegative('Other charges cannot be negative').optional(),
  discount_amount: z.number().nonnegative('Discount amount cannot be negative').optional(),
});

const ReceiveItemSchema = z.object({
  item_id: z.string().uuid('Invalid item ID'),
  quantity_received: z.number().int().positive('Quantity must be positive'),
  notes: z.string().max(1000).optional(),
});

const ReceiveItemsSchema = z.object({
  items: z.array(ReceiveItemSchema).min(1, 'At least one item is required'),
});

const CancelPOSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

/**
 * POST /api/v1/purchase-orders
 * Creates a new purchase order
 */
export async function createPO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const validated = CreatePOSchema.parse(req.body) as any;
    const userId = req.user!.userId;

    const po = await purchaseOrderService.createPO(userId, validated);

    return res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: po,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create purchase order',
    });
  }
}

/**
 * GET /api/v1/purchase-orders
 * Lists purchase orders with filters and pagination
 */
export async function getPOs(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<{
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>>> {
  try {
    const query = {
      vendor_id: req.query.vendor_id as string | undefined,
      status: req.query.status as any,
      order_type: req.query.order_type as any,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const result = await purchaseOrderService.getPOs(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve purchase orders',
    });
  }
}

/**
 * GET /api/v1/purchase-orders/:id
 * Retrieves purchase order by ID
 */
export async function getPOById(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;

    const po = await purchaseOrderService.getPOById(id);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: po,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve purchase order',
    });
  }
}

/**
 * PUT /api/v1/purchase-orders/:id
 * Updates a draft purchase order
 */
export async function updatePO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;
    const validated = UpdatePOSchema.parse(req.body) as any;

    const po = await purchaseOrderService.updatePO(id, validated);

    return res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: po,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update purchase order',
    });
  }
}

/**
 * DELETE /api/v1/purchase-orders/:id
 * Deletes a draft purchase order
 */
export async function deletePO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<null>>> {
  try {
    const { id } = req.params;

    await purchaseOrderService.deletePO(id);

    return res.status(200).json({
      success: true,
      message: 'Purchase order deleted successfully',
      data: null,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to delete purchase order',
    });
  }
}

/**
 * POST /api/v1/purchase-orders/:id/submit
 * Submits draft PO for approval
 */
export async function submitPO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;

    const po = await purchaseOrderService.submitPO(id);

    return res.status(200).json({
      success: true,
      message: 'Purchase order submitted for approval',
      data: po,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to submit purchase order',
    });
  }
}

/**
 * POST /api/v1/purchase-orders/:id/approve
 * Approves submitted PO
 */
export async function approvePO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const po = await purchaseOrderService.approvePO(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Purchase order approved',
      data: po,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to approve purchase order',
    });
  }
}

/**
 * POST /api/v1/purchase-orders/:id/receive
 * Records received quantities for items
 */
export async function receiveItems(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;
    const validated = ReceiveItemsSchema.parse(req.body) as { items: { item_id: string; quantity_received: number; notes?: string; }[] };
    const userId = req.user!.userId;

    const po = await purchaseOrderService.receiveItems(id, validated, userId);

    return res.status(200).json({
      success: true,
      message: 'Items received successfully',
      data: po,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to receive items',
    });
  }
}

/**
 * POST /api/v1/purchase-orders/:id/cancel
 * Cancels purchase order with reason
 */
export async function cancelPO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;
    const validated = CancelPOSchema.parse(req.body);

    const po = await purchaseOrderService.cancelPO(id, validated.reason);

    return res.status(200).json({
      success: true,
      message: 'Purchase order cancelled',
      data: po,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to cancel purchase order',
    });
  }
}

/**
 * POST /api/v1/purchase-orders/:id/close
 * Closes a received purchase order
 */
export async function closePO(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<PurchaseOrderWithDetails>>> {
  try {
    const { id } = req.params;

    const po = await purchaseOrderService.closePO(id);

    return res.status(200).json({
      success: true,
      message: 'Purchase order closed',
      data: po,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to close purchase order',
    });
  }
}

/**
 * GET /api/v1/purchase-orders/reorder-suggestions
 * Retrieves reorder suggestions grouped by vendor
 */
export async function getReorderSuggestions(
  req: Request,
  res: Response
): Promise<Response<ApiResponse<any>>> {
  try {
    const suggestions = await purchaseOrderService.getReorderSuggestions();

    return res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve reorder suggestions',
    });
  }
}
