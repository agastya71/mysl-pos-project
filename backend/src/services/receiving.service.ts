import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface CreateReceivingInput {
  vendor_id: string;
  receiving_type: string;
  purchase_order_id?: string;
  shipping_carrier?: string;
  tracking_number?: string;
  packing_slip_number?: string;
  condition_notes?: string;
  discrepancy_notes?: string;
  internal_notes?: string;
  is_donation?: boolean;
  donation_date?: string;
  fair_market_value?: number;
}

export interface UpdateReceivingInput {
  shipping_carrier?: string;
  tracking_number?: string;
  packing_slip_number?: string;
  condition_notes?: string;
  discrepancy_notes?: string;
  internal_notes?: string;
  is_donation?: boolean;
  donation_receipt_sent?: boolean;
  donation_receipt_number?: string;
  donation_date?: string;
  fair_market_value?: number;
}

export interface AddItemInput {
  purchase_order_item_id?: string;
  product_id?: string;
  sku?: string;
  product_name: string;
  product_description?: string;
  category_id?: string;
  quantity_received: number;
  unit_cost?: number;
  fair_market_value?: number;
  condition: string;
  accepted_quantity?: number;
  rejected_quantity?: number;
  rejection_reason?: string;
  add_to_inventory?: boolean;
  notes?: string;
}

export interface UpdateItemInput {
  product_id?: string;
  sku?: string;
  product_name?: string;
  product_description?: string;
  category_id?: string;
  quantity_received?: number;
  unit_cost?: number;
  fair_market_value?: number;
  condition?: string;
  accepted_quantity?: number;
  rejected_quantity?: number;
  rejection_reason?: string;
  add_to_inventory?: boolean;
  notes?: string;
}

export interface ListReceivingQuery {
  status?: string;
  vendor_id?: string;
  receiving_type?: string;
  purchase_order_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function createReceiving(
  userId: string,
  data: CreateReceivingInput
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate vendor exists
    const vendorResult = await client.query(
      'SELECT id, business_name FROM vendors WHERE id = $1 AND is_active = true',
      [data.vendor_id]
    );
    if (vendorResult.rowCount === 0) {
      throw new AppError(400, 'VENDOR_NOT_FOUND', 'Vendor not found');
    }

    const result = await client.query(
      `INSERT INTO inventory_receiving
         (vendor_id, purchase_order_id, receiving_type, received_by,
          shipping_carrier, tracking_number, packing_slip_number,
          condition_notes, discrepancy_notes, internal_notes,
          is_donation, donation_date, fair_market_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.vendor_id,
        data.purchase_order_id ?? null,
        data.receiving_type,
        userId,
        data.shipping_carrier ?? null,
        data.tracking_number ?? null,
        data.packing_slip_number ?? null,
        data.condition_notes ?? null,
        data.discrepancy_notes ?? null,
        data.internal_notes ?? null,
        data.is_donation ?? false,
        data.donation_date ?? null,
        data.fair_market_value ?? null,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listReceivings(query: ListReceivingQuery): Promise<any> {
  const {
    status,
    vendor_id,
    receiving_type,
    purchase_order_id,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = query;

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (status) { conditions.push(`ir.status = $${i++}`); params.push(status); }
  if (vendor_id) { conditions.push(`ir.vendor_id = $${i++}`); params.push(vendor_id); }
  if (receiving_type) { conditions.push(`ir.receiving_type = $${i++}`); params.push(receiving_type); }
  if (purchase_order_id) { conditions.push(`ir.purchase_order_id = $${i++}`); params.push(purchase_order_id); }
  if (start_date) { conditions.push(`ir.received_date >= $${i++}`); params.push(start_date); }
  if (end_date) { conditions.push(`ir.received_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM inventory_receiving ir ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT ir.*, v.business_name AS vendor_name
     FROM inventory_receiving ir
     JOIN vendors v ON v.id = ir.vendor_id
     ${where}
     ORDER BY ir.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  return {
    receivings: dataResult.rows,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getReceiving(id: string): Promise<any> {
  const receivingResult = await pool.query(
    `SELECT ir.*, v.business_name AS vendor_name
     FROM inventory_receiving ir
     JOIN vendors v ON v.id = ir.vendor_id
     WHERE ir.id = $1`,
    [id]
  );

  if (receivingResult.rowCount === 0) {
    throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
  }

  const itemsResult = await pool.query(
    `SELECT * FROM receiving_items WHERE receiving_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  return {
    ...receivingResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function updateReceiving(
  id: string,
  data: UpdateReceivingInput
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const existing = fetchResult.rows[0];
    if (existing.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (existing.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.shipping_carrier !== undefined) { setClauses.push(`shipping_carrier = $${i++}`); params.push(data.shipping_carrier); }
    if (data.tracking_number !== undefined) { setClauses.push(`tracking_number = $${i++}`); params.push(data.tracking_number); }
    if (data.packing_slip_number !== undefined) { setClauses.push(`packing_slip_number = $${i++}`); params.push(data.packing_slip_number); }
    if (data.condition_notes !== undefined) { setClauses.push(`condition_notes = $${i++}`); params.push(data.condition_notes); }
    if (data.discrepancy_notes !== undefined) { setClauses.push(`discrepancy_notes = $${i++}`); params.push(data.discrepancy_notes); }
    if (data.internal_notes !== undefined) { setClauses.push(`internal_notes = $${i++}`); params.push(data.internal_notes); }
    if (data.is_donation !== undefined) { setClauses.push(`is_donation = $${i++}`); params.push(data.is_donation); }
    if (data.donation_receipt_sent !== undefined) { setClauses.push(`donation_receipt_sent = $${i++}`); params.push(data.donation_receipt_sent); }
    if (data.donation_receipt_number !== undefined) { setClauses.push(`donation_receipt_number = $${i++}`); params.push(data.donation_receipt_number); }
    if (data.donation_date !== undefined) { setClauses.push(`donation_date = $${i++}`); params.push(data.donation_date); }
    if (data.fair_market_value !== undefined) { setClauses.push(`fair_market_value = $${i++}`); params.push(data.fair_market_value); }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await client.query(
      `UPDATE inventory_receiving SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function completeReceiving(id: string, userId: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check status
    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = fetchResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    // 2. Check items exist
    const itemsResult = await client.query(
      'SELECT * FROM receiving_items WHERE receiving_id = $1',
      [id]
    );
    if (itemsResult.rowCount === 0) {
      throw new AppError(400, 'RECEIVING_NO_ITEMS', 'Receiving has no items');
    }
    const items = itemsResult.rows;

    // 3. Create inventory adjustments for eligible items
    // Trigger auto-updates products.quantity_in_stock and auto-generates adjustment_number
    for (const item of items) {
      if (item.add_to_inventory && item.product_id && (item.accepted_quantity || 0) > 0) {
        // Fetch current stock
        const productResult = await client.query(
          'SELECT quantity_in_stock FROM products WHERE id = $1',
          [item.product_id]
        );
        const oldQuantity = productResult.rows[0]?.quantity_in_stock ?? 0;
        const quantityChange = item.accepted_quantity;
        const newQuantity = oldQuantity + quantityChange;

        // INSERT into inventory_adjustments
        // Do NOT include adjustment_number — trigger auto-generates it
        // Do NOT manually update products — apply_adjustment_trigger handles it
        await client.query(
          `INSERT INTO inventory_adjustments
             (product_id, adjustment_type, quantity_change, old_quantity, new_quantity, reason, notes, adjusted_by)
           VALUES ($1, 'receiving', $2, $3, $4, $5, $6, $7)`,
          [
            item.product_id,
            quantityChange,
            oldQuantity,
            newQuantity,
            `Received via ${receiving.receiving_number}`,
            item.notes ?? null,
            userId,
          ]
        );

        // Mark item as inventory_added
        await client.query(
          'UPDATE receiving_items SET inventory_added = true, updated_at = NOW() WHERE id = $1',
          [item.id]
        );
      }
    }

    // 4. Update receiving status
    await client.query(
      `UPDATE inventory_receiving SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // 5. Update PO status if linked
    if (receiving.purchase_order_id) {
      const poItemsResult = await client.query(
        'SELECT id, quantity_ordered FROM purchase_order_items WHERE purchase_order_id = $1',
        [receiving.purchase_order_id]
      );

      const receivedSumsResult = await client.query(
        `SELECT ri.purchase_order_item_id, SUM(ri.accepted_quantity) AS total_received
         FROM receiving_items ri
         JOIN inventory_receiving ir ON ir.id = ri.receiving_id
         WHERE ir.purchase_order_id = $1
           AND ir.status = 'completed'
           AND ri.purchase_order_item_id IS NOT NULL
         GROUP BY ri.purchase_order_item_id`,
        [receiving.purchase_order_id]
      );

      const receivedMap: Record<string, number> = {};
      for (const row of receivedSumsResult.rows) {
        receivedMap[row.purchase_order_item_id] = parseInt(row.total_received, 10);
      }

      let allFullyReceived = true;
      for (const poItem of poItemsResult.rows) {
        const received = receivedMap[poItem.id] || 0;
        if (received < poItem.quantity_ordered) {
          allFullyReceived = false;
          break;
        }
      }

      const newPoStatus = allFullyReceived ? 'received' : 'partially_received';
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [newPoStatus, receiving.purchase_order_id]
      );
    }

    // 6. Return updated receiving with items
    const updatedReceiving = await client.query(
      `SELECT ir.*, v.business_name AS vendor_name
       FROM inventory_receiving ir
       JOIN vendors v ON v.id = ir.vendor_id
       WHERE ir.id = $1`,
      [id]
    );

    const updatedItems = await client.query(
      'SELECT * FROM receiving_items WHERE receiving_id = $1 ORDER BY created_at ASC',
      [id]
    );

    await client.query('COMMIT');
    return {
      ...updatedReceiving.rows[0],
      items: updatedItems.rows,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelReceiving(id: string, reason: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = fetchResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const cancelledNotes = `[CANCELLED: ${reason}] ${receiving.internal_notes || ''}`.trim();

    const result = await client.query(
      `UPDATE inventory_receiving
       SET status = 'cancelled', internal_notes = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [cancelledNotes, id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addItem(receivingId: string, data: AddItemInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check receiving exists and is in_progress
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [receivingId]
    );
    if (receivingResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_NOT_FOUND', 'Receiving not found');
    }
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const lineTotal = (data.unit_cost ?? 0) * data.quantity_received;
    const acceptedQty = data.accepted_quantity ?? data.quantity_received;
    const rejectedQty = data.rejected_quantity ?? 0;

    const itemResult = await client.query(
      `INSERT INTO receiving_items
         (receiving_id, purchase_order_item_id, product_id, sku, product_name,
          product_description, category_id, quantity_received, unit_cost,
          fair_market_value, condition, line_total, accepted_quantity,
          rejected_quantity, rejection_reason, add_to_inventory, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        receivingId,
        data.purchase_order_item_id ?? null,
        data.product_id ?? null,
        data.sku ?? null,
        data.product_name,
        data.product_description ?? null,
        data.category_id ?? null,
        data.quantity_received,
        data.unit_cost ?? 0,
        data.fair_market_value ?? null,
        data.condition,
        lineTotal,
        acceptedQty,
        rejectedQty,
        data.rejection_reason ?? null,
        data.add_to_inventory ?? true,
        data.notes ?? null,
      ]
    );

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [receivingId]
    );

    await client.query('COMMIT');
    return itemResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateItem(itemId: string, data: UpdateItemInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch item
    const itemResult = await client.query(
      'SELECT * FROM receiving_items WHERE id = $1',
      [itemId]
    );
    if (itemResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_ITEM_NOT_FOUND', 'Receiving item not found');
    }
    const item = itemResult.rows[0];

    // Check receiving status
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [item.receiving_id]
    );
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.product_id !== undefined) { setClauses.push(`product_id = $${i++}`); params.push(data.product_id); }
    if (data.sku !== undefined) { setClauses.push(`sku = $${i++}`); params.push(data.sku); }
    if (data.product_name !== undefined) { setClauses.push(`product_name = $${i++}`); params.push(data.product_name); }
    if (data.product_description !== undefined) { setClauses.push(`product_description = $${i++}`); params.push(data.product_description); }
    if (data.category_id !== undefined) { setClauses.push(`category_id = $${i++}`); params.push(data.category_id); }
    if (data.quantity_received !== undefined) { setClauses.push(`quantity_received = $${i++}`); params.push(data.quantity_received); }
    if (data.unit_cost !== undefined) { setClauses.push(`unit_cost = $${i++}`); params.push(data.unit_cost); }
    if (data.fair_market_value !== undefined) { setClauses.push(`fair_market_value = $${i++}`); params.push(data.fair_market_value); }
    if (data.condition !== undefined) { setClauses.push(`condition = $${i++}`); params.push(data.condition); }
    if (data.accepted_quantity !== undefined) { setClauses.push(`accepted_quantity = $${i++}`); params.push(data.accepted_quantity); }
    if (data.rejected_quantity !== undefined) { setClauses.push(`rejected_quantity = $${i++}`); params.push(data.rejected_quantity); }
    if (data.rejection_reason !== undefined) { setClauses.push(`rejection_reason = $${i++}`); params.push(data.rejection_reason); }
    if (data.add_to_inventory !== undefined) { setClauses.push(`add_to_inventory = $${i++}`); params.push(data.add_to_inventory); }
    if (data.notes !== undefined) { setClauses.push(`notes = $${i++}`); params.push(data.notes); }

    // Recalculate line_total if unit_cost or quantity_received changed
    const newQty = data.quantity_received ?? item.quantity_received;
    const newCost = data.unit_cost ?? parseFloat(item.unit_cost);
    setClauses.push(`line_total = $${i++}`);
    params.push(newQty * newCost);

    setClauses.push('updated_at = NOW()');
    params.push(itemId);

    const result = await client.query(
      `UPDATE receiving_items SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [item.receiving_id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch item
    const itemResult = await client.query(
      'SELECT * FROM receiving_items WHERE id = $1',
      [itemId]
    );
    if (itemResult.rowCount === 0) {
      throw new AppError(404, 'RECEIVING_ITEM_NOT_FOUND', 'Receiving item not found');
    }
    const item = itemResult.rows[0];

    // Check receiving status
    const receivingResult = await client.query(
      'SELECT * FROM inventory_receiving WHERE id = $1',
      [item.receiving_id]
    );
    const receiving = receivingResult.rows[0];
    if (receiving.status === 'completed') {
      throw new AppError(400, 'RECEIVING_ALREADY_COMPLETED', 'Receiving is already completed');
    }
    if (receiving.status === 'cancelled') {
      throw new AppError(400, 'RECEIVING_ALREADY_CANCELLED', 'Receiving is already cancelled');
    }

    await client.query('DELETE FROM receiving_items WHERE id = $1', [itemId]);

    // Recalculate receiving totals
    await client.query(
      `UPDATE inventory_receiving
       SET total_items = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
           total_quantity = (SELECT COALESCE(SUM(quantity_received), 0) FROM receiving_items WHERE receiving_id = $1),
           total_value = (SELECT COALESCE(SUM(line_total), 0) FROM receiving_items WHERE receiving_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [item.receiving_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
