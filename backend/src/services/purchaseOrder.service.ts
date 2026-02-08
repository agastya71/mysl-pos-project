/**
 * Purchase Order Service
 * Business logic for PO management: CRUD, status workflow, receiving, reorder suggestions
 *
 * Pattern: Mirrors inventory.service.ts structure with validation and transactions
 */

import { pool } from '../config/database';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderWithDetails,
  CreatePORequest,
  UpdatePORequest,
  ReceiveItemsRequest,
  POListQuery,
  POStatus,
  ReorderSuggestion,
  ReorderSuggestionsByVendor,
} from '../types/purchaseOrder.types';

/**
 * Creates a new purchase order with line items
 * Status: draft (requires submission and approval before receiving)
 *
 * Validates:
 * - Vendor exists
 * - All products exist
 * - At least 1 line item
 * - Calculates financial totals
 *
 * @param userId - ID of user creating PO
 * @param data - PO details with line items
 * @returns Created PO with details
 */
export async function createPO(
  userId: string,
  data: CreatePORequest
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate vendor exists
    const vendorResult = await client.query(
      'SELECT id, business_name, contact_person FROM vendors WHERE id = $1 AND is_active = true',
      [data.vendor_id]
    );

    if (vendorResult.rowCount === 0) {
      throw new Error('Vendor not found or inactive');
    }

    const vendor = vendorResult.rows[0];

    // Validate items array
    if (!data.items || data.items.length === 0) {
      throw new Error('At least one line item is required');
    }

    // Validate all products exist and fetch details
    const productIds = data.items.map((item) => item.product_id);
    const productsResult = await client.query(
      `SELECT id, sku, name, base_price
       FROM products
       WHERE id = ANY($1::uuid[])`,
      [productIds]
    );

    if (productsResult.rowCount !== productIds.length) {
      throw new Error('One or more products not found');
    }

    const productsMap = new Map<string, { id: string; sku: string; name: string; base_price: string }>(
      productsResult.rows.map((p) => [p.id, p])
    );

    // Calculate subtotal from line items
    let subtotal = 0;
    let totalTax = 0;

    data.items.forEach((item) => {
      const lineSubtotal = item.unit_cost * item.quantity_ordered;
      const lineTax = item.tax_amount || 0;
      subtotal += lineSubtotal;
      totalTax += lineTax;
    });

    // Calculate total amount
    const shippingCost = data.shipping_cost || 0;
    const otherCharges = data.other_charges || 0;
    const discountAmount = data.discount_amount || 0;
    const totalAmount = subtotal + totalTax + shippingCost + otherCharges - discountAmount;

    // Insert purchase order
    const poResult = await client.query(
      `INSERT INTO purchase_orders (
        vendor_id, order_type, status, order_date,
        expected_delivery_date, subtotal_amount, tax_amount,
        shipping_cost, other_charges, discount_amount, total_amount,
        shipping_address, billing_address, payment_terms, payment_status,
        amount_paid, created_by, notes
      ) VALUES (
        $1, $2, 'draft', CURRENT_DATE,
        $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, 'pending',
        0, $13, $14
      ) RETURNING *`,
      [
        data.vendor_id,
        data.order_type,
        data.expected_delivery_date || null,
        subtotal,
        totalTax,
        shippingCost,
        otherCharges,
        discountAmount,
        totalAmount,
        data.shipping_address || null,
        data.billing_address || null,
        data.payment_terms || null,
        userId,
        data.notes || null,
      ]
    );

    const po: PurchaseOrder = poResult.rows[0];

    // Insert line items
    const items: PurchaseOrderItem[] = [];

    for (const item of data.items) {
      const product = productsMap.get(item.product_id)!;
      const lineTotal = item.unit_cost * item.quantity_ordered + (item.tax_amount || 0);

      const itemResult = await client.query(
        `INSERT INTO purchase_order_items (
          purchase_order_id, product_id, sku, product_name,
          quantity_ordered, quantity_received, unit_cost,
          tax_amount, line_total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          po.id,
          item.product_id,
          product.sku,
          product.name,
          item.quantity_ordered,
          0, // quantity_received starts at 0
          item.unit_cost,
          item.tax_amount || 0,
          lineTotal,
          item.notes || null,
        ]
      );

      items.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    // Fetch creator name
    const userResult = await client.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    // Return PO with details
    return {
      ...po,
      items,
      vendor_name: vendor.business_name,
      vendor_contact: vendor.contact_person,
      created_by_name: userResult.rows[0].username,
      approved_by_name: null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves purchase order by ID with full details
 * Includes line items, vendor info, and user names
 *
 * @param poId - Purchase order ID
 * @returns PO with details or null if not found
 */
export async function getPOById(
  poId: string
): Promise<PurchaseOrderWithDetails | null> {
  const client = await pool.connect();

  try {
    // Fetch PO with vendor and user info
    const poResult = await client.query(
      `SELECT
        po.*,
        v.business_name as vendor_name,
        v.contact_person as vendor_contact,
        u1.username as created_by_name,
        u2.username as approved_by_name
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       JOIN users u1 ON po.created_by = u1.id
       LEFT JOIN users u2 ON po.approved_by = u2.id
       WHERE po.id = $1`,
      [poId]
    );

    if (poResult.rowCount === 0) {
      return null;
    }

    const po = poResult.rows[0];

    // Fetch line items
    const itemsResult = await client.query(
      `SELECT * FROM purchase_order_items
       WHERE purchase_order_id = $1
       ORDER BY created_at`,
      [poId]
    );

    return {
      ...po,
      items: itemsResult.rows,
    };
  } finally {
    client.release();
  }
}

/**
 * Lists purchase orders with filters and pagination
 *
 * Filters:
 * - vendor_id: Filter by vendor
 * - status: Filter by status
 * - order_type: Filter by type
 * - start_date/end_date: Filter by order date range
 * - search: Search PO number
 *
 * @param query - Filter and pagination parameters
 * @returns Paginated list of POs with details
 */
export async function getPOs(query: POListQuery): Promise<{
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;

  if (query.vendor_id) {
    conditions.push(`po.vendor_id = $${paramIndex++}`);
    params.push(query.vendor_id);
  }

  if (query.status) {
    conditions.push(`po.status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.order_type) {
    conditions.push(`po.order_type = $${paramIndex++}`);
    params.push(query.order_type);
  }

  if (query.start_date) {
    conditions.push(`po.order_date >= $${paramIndex++}`);
    params.push(query.start_date);
  }

  if (query.end_date) {
    conditions.push(`po.order_date <= $${paramIndex++}`);
    params.push(query.end_date);
  }

  if (query.search) {
    conditions.push(`po.po_number ILIKE $${paramIndex++}`);
    params.push(`%${query.search}%`);
  }

  const whereClause = conditions.join(' AND ');

  // Count total
  const countResult = await pool.query(
    `SELECT COUNT(*) as total
     FROM purchase_orders po
     WHERE ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  // Fetch POs with details
  const posResult = await pool.query(
    `SELECT
      po.*,
      v.business_name as vendor_name,
      v.contact_person as vendor_contact,
      u1.username as created_by_name,
      u2.username as approved_by_name,
      COUNT(poi.id) as item_count
     FROM purchase_orders po
     JOIN vendors v ON po.vendor_id = v.id
     JOIN users u1 ON po.created_by = u1.id
     LEFT JOIN users u2 ON po.approved_by = u2.id
     LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
     WHERE ${whereClause}
     GROUP BY po.id, v.business_name, v.contact_person, u1.username, u2.username
     ORDER BY po.order_date DESC, po.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  // Fetch items for each PO
  const posWithDetails: PurchaseOrderWithDetails[] = [];

  for (const po of posResult.rows) {
    const itemsResult = await pool.query(
      `SELECT * FROM purchase_order_items
       WHERE purchase_order_id = $1
       ORDER BY created_at`,
      [po.id]
    );

    posWithDetails.push({
      ...po,
      items: itemsResult.rows,
    });
  }

  return {
    data: posWithDetails,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Updates a draft purchase order
 * Only draft POs can be updated
 *
 * Can update:
 * - PO details (vendor, dates, addresses, etc.)
 * - Line items (add, update, remove)
 * - Financial totals are recalculated
 *
 * @param poId - Purchase order ID
 * @param data - Update payload
 * @returns Updated PO with details
 */
export async function updatePO(
  poId: string,
  data: UpdatePORequest
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch current PO
    const poResult = await client.query(
      'SELECT * FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const currentPO: PurchaseOrder = poResult.rows[0];

    // Only draft POs can be updated
    if (currentPO.status !== 'draft') {
      throw new Error('Only draft purchase orders can be updated');
    }

    // Validate vendor if changed
    if (data.vendor_id) {
      const vendorResult = await client.query(
        'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
        [data.vendor_id]
      );

      if (vendorResult.rowCount === 0) {
        throw new Error('Vendor not found or inactive');
      }
    }

    // Handle line items updates
    if (data.items) {
      // Delete existing items (we'll recreate)
      await client.query(
        'DELETE FROM purchase_order_items WHERE purchase_order_id = $1',
        [poId]
      );

      // Validate products
      const productIds = data.items.map((item) => item.product_id);
      const productsResult = await client.query(
        `SELECT id, sku, name FROM products WHERE id = ANY($1::uuid[])`,
        [productIds]
      );

      if (productsResult.rowCount !== productIds.length) {
        throw new Error('One or more products not found');
      }

      const productsMap = new Map<string, { id: string; sku: string; name: string }>(
        productsResult.rows.map((p) => [p.id, p])
      );

      // Insert updated items
      for (const item of data.items) {
        const product = productsMap.get(item.product_id)!;
        const lineTotal =
          item.unit_cost * item.quantity_ordered + (item.tax_amount || 0);

        await client.query(
          `INSERT INTO purchase_order_items (
            purchase_order_id, product_id, sku, product_name,
            quantity_ordered, quantity_received, unit_cost,
            tax_amount, line_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            poId,
            item.product_id,
            product.sku,
            product.name,
            item.quantity_ordered,
            0,
            item.unit_cost,
            item.tax_amount || 0,
            lineTotal,
            item.notes || null,
          ]
        );
      }
    }

    // Recalculate totals from current items
    const itemsResult = await client.query(
      `SELECT
        SUM(unit_cost * quantity_ordered) as subtotal,
        SUM(tax_amount) as total_tax
       FROM purchase_order_items
       WHERE purchase_order_id = $1`,
      [poId]
    );

    const subtotal = parseFloat(itemsResult.rows[0].subtotal || '0');
    const totalTax = parseFloat(itemsResult.rows[0].total_tax || '0');
    const shippingCost = data.shipping_cost !== undefined ? data.shipping_cost : currentPO.shipping_cost;
    const otherCharges = data.other_charges !== undefined ? data.other_charges : currentPO.other_charges;
    const discountAmount = data.discount_amount !== undefined ? data.discount_amount : currentPO.discount_amount;
    const totalAmount = subtotal + totalTax + shippingCost + otherCharges - discountAmount;

    // Update PO
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (data.vendor_id) {
      updateFields.push(`vendor_id = $${paramIndex++}`);
      updateParams.push(data.vendor_id);
    }

    if (data.order_type) {
      updateFields.push(`order_type = $${paramIndex++}`);
      updateParams.push(data.order_type);
    }

    if (data.expected_delivery_date !== undefined) {
      updateFields.push(`expected_delivery_date = $${paramIndex++}`);
      updateParams.push(data.expected_delivery_date || null);
    }

    if (data.shipping_address !== undefined) {
      updateFields.push(`shipping_address = $${paramIndex++}`);
      updateParams.push(data.shipping_address || null);
    }

    if (data.billing_address !== undefined) {
      updateFields.push(`billing_address = $${paramIndex++}`);
      updateParams.push(data.billing_address || null);
    }

    if (data.payment_terms !== undefined) {
      updateFields.push(`payment_terms = $${paramIndex++}`);
      updateParams.push(data.payment_terms || null);
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateParams.push(data.notes || null);
    }

    // Always update totals
    updateFields.push(`subtotal_amount = $${paramIndex++}`);
    updateParams.push(subtotal);

    updateFields.push(`tax_amount = $${paramIndex++}`);
    updateParams.push(totalTax);

    updateFields.push(`shipping_cost = $${paramIndex++}`);
    updateParams.push(shippingCost);

    updateFields.push(`other_charges = $${paramIndex++}`);
    updateParams.push(otherCharges);

    updateFields.push(`discount_amount = $${paramIndex++}`);
    updateParams.push(discountAmount);

    updateFields.push(`total_amount = $${paramIndex++}`);
    updateParams.push(totalAmount);

    updateFields.push(`updated_at = NOW()`);

    await client.query(
      `UPDATE purchase_orders
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}`,
      [...updateParams, poId]
    );

    await client.query('COMMIT');

    // Return updated PO with details
    return (await getPOById(poId))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes a draft purchase order
 * Only draft POs can be deleted (CASCADE deletes items)
 *
 * @param poId - Purchase order ID
 */
export async function deletePO(poId: string): Promise<void> {
  const client = await pool.connect();

  try {
    const poResult = await client.query(
      'SELECT status FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted');
    }

    await client.query('DELETE FROM purchase_orders WHERE id = $1', [poId]);
  } finally {
    client.release();
  }
}

/**
 * Submits draft PO for approval
 * Status: draft → submitted
 *
 * @param poId - Purchase order ID
 * @returns Updated PO
 */
export async function submitPO(
  poId: string
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    const poResult = await client.query(
      'SELECT status FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status !== 'draft') {
      throw new Error('Only draft purchase orders can be submitted');
    }

    // Validate has items
    const itemsResult = await client.query(
      'SELECT COUNT(*) as count FROM purchase_order_items WHERE purchase_order_id = $1',
      [poId]
    );

    if (parseInt(itemsResult.rows[0].count, 10) === 0) {
      throw new Error('Cannot submit purchase order without line items');
    }

    await client.query(
      `UPDATE purchase_orders
       SET status = 'submitted', updated_at = NOW()
       WHERE id = $1`,
      [poId]
    );

    return (await getPOById(poId))!;
  } finally {
    client.release();
  }
}

/**
 * Approves submitted PO
 * Status: submitted → approved
 *
 * @param poId - Purchase order ID
 * @param userId - ID of user approving
 * @returns Updated PO
 */
export async function approvePO(
  poId: string,
  userId: string
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    const poResult = await client.query(
      'SELECT status FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status !== 'submitted') {
      throw new Error('Only submitted purchase orders can be approved');
    }

    await client.query(
      `UPDATE purchase_orders
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [userId, poId]
    );

    return (await getPOById(poId))!;
  } finally {
    client.release();
  }
}

/**
 * Records received quantities for PO items
 * Updates quantity_received, triggers auto-update of:
 * - Product inventory (via receive_po_items trigger)
 * - PO status (via update_po_status trigger)
 *
 * Validates:
 * - PO is approved or partially_received
 * - Received quantities don't exceed ordered
 *
 * @param poId - Purchase order ID
 * @param data - Items with quantities to receive
 * @param userId - ID of user receiving
 * @returns Updated PO
 */
export async function receiveItems(
  poId: string,
  data: ReceiveItemsRequest,
  userId: string
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const poResult = await client.query(
      'SELECT status FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status !== 'approved' && status !== 'partially_received') {
      throw new Error('Can only receive items for approved or partially received purchase orders');
    }

    // Validate and update each item
    for (const item of data.items) {
      const itemResult = await client.query(
        `SELECT quantity_ordered, quantity_received
         FROM purchase_order_items
         WHERE id = $1 AND purchase_order_id = $2`,
        [item.item_id, poId]
      );

      if (itemResult.rowCount === 0) {
        throw new Error(`Item ${item.item_id} not found in purchase order`);
      }

      const currentItem = itemResult.rows[0];
      const newReceived = currentItem.quantity_received + item.quantity_received;

      if (newReceived > currentItem.quantity_ordered) {
        throw new Error(
          `Cannot receive more than ordered quantity for item ${item.item_id}`
        );
      }

      // Update item (triggers inventory update and PO status update)
      await client.query(
        `UPDATE purchase_order_items
         SET quantity_received = $1,
             notes = COALESCE($2, notes),
             updated_at = NOW()
         WHERE id = $3`,
        [newReceived, item.notes, item.item_id]
      );
    }

    await client.query('COMMIT');

    return (await getPOById(poId))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancels a purchase order with reason
 * Can cancel at any status except closed
 *
 * @param poId - Purchase order ID
 * @param reason - Cancellation reason
 * @returns Updated PO
 */
export async function cancelPO(
  poId: string,
  reason: string
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    const poResult = await client.query(
      'SELECT status, notes FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status === 'closed' || status === 'cancelled') {
      throw new Error('Cannot cancel closed or already cancelled purchase order');
    }

    const currentNotes = poResult.rows[0].notes || '';
    const updatedNotes = currentNotes
      ? `${currentNotes}\n\nCANCELLED: ${reason}`
      : `CANCELLED: ${reason}`;

    await client.query(
      `UPDATE purchase_orders
       SET status = 'cancelled',
           notes = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [updatedNotes, poId]
    );

    return (await getPOById(poId))!;
  } finally {
    client.release();
  }
}

/**
 * Closes a received purchase order
 * Status: received → closed
 *
 * @param poId - Purchase order ID
 * @returns Updated PO
 */
export async function closePO(
  poId: string
): Promise<PurchaseOrderWithDetails> {
  const client = await pool.connect();

  try {
    const poResult = await client.query(
      'SELECT status FROM purchase_orders WHERE id = $1',
      [poId]
    );

    if (poResult.rowCount === 0) {
      throw new Error('Purchase order not found');
    }

    const status: POStatus = poResult.rows[0].status;

    if (status !== 'received') {
      throw new Error('Only fully received purchase orders can be closed');
    }

    await client.query(
      `UPDATE purchase_orders
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [poId]
    );

    return (await getPOById(poId))!;
  } finally {
    client.release();
  }
}

/**
 * Retrieves reorder suggestions grouped by vendor
 * Finds products where quantity_in_stock <= reorder_level
 *
 * @returns Suggestions grouped by vendor
 */
export async function getReorderSuggestions(): Promise<ReorderSuggestionsByVendor[]> {
  const result = await pool.query(
    `SELECT
      p.id as product_id,
      p.sku,
      p.name as product_name,
      p.quantity_in_stock,
      p.reorder_level,
      p.reorder_quantity,
      p.vendor_id,
      v.business_name as vendor_name,
      v.contact_person as vendor_contact,
      COALESCE(
        (SELECT unit_cost
         FROM purchase_order_items poi
         WHERE poi.product_id = p.id
         ORDER BY poi.created_at DESC
         LIMIT 1),
        p.base_price
      ) as unit_cost
     FROM products p
     JOIN vendors v ON p.vendor_id = v.id
     WHERE p.quantity_in_stock <= p.reorder_level
       AND p.is_active = true
       AND v.is_active = true
     ORDER BY v.business_name, p.name`
  );

  // Group by vendor
  const vendorMap = new Map<string, ReorderSuggestionsByVendor>();

  for (const row of result.rows) {
    if (!vendorMap.has(row.vendor_id)) {
      vendorMap.set(row.vendor_id, {
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
        vendor_contact: row.vendor_contact,
        products: [],
        total_items: 0,
        estimated_total: 0,
      });
    }

    const vendor = vendorMap.get(row.vendor_id)!;
    const suggestion: ReorderSuggestion = {
      product_id: row.product_id,
      sku: row.sku,
      product_name: row.product_name,
      quantity_in_stock: row.quantity_in_stock,
      reorder_level: row.reorder_level,
      reorder_quantity: row.reorder_quantity,
      vendor_id: row.vendor_id,
      vendor_name: row.vendor_name,
      unit_cost: row.unit_cost ? parseFloat(row.unit_cost) : null,
    };

    vendor.products.push(suggestion);
    vendor.total_items += suggestion.reorder_quantity;
    vendor.estimated_total += suggestion.reorder_quantity * (suggestion.unit_cost || 0);
  }

  return Array.from(vendorMap.values());
}
