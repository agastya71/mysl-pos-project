import { pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface CreateDonationInput {
  vendor_id: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;
  donation_type: string;
  fair_market_value: number;
  cash_amount?: number;
  tax_receipt_required?: boolean;
  goods_services_provided?: boolean;
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean;
  notes?: string;
  internal_notes?: string;
  items?: Array<{
    product_id?: string;
    sku?: string;
    product_name: string;
    category_id?: string;
    quantity_received: number;
    fair_market_value?: number;
    condition: string;
    notes?: string;
  }>;
}

export interface UpdateDonationInput {
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  donation_date?: string;
  donation_type?: string;
  fair_market_value?: number;
  cash_amount?: number;
  tax_receipt_required?: boolean;
  goods_services_provided?: boolean;
  goods_services_description?: string;
  goods_services_value?: number;
  appraisal_required?: boolean;
  appraiser_name?: string;
  appraisal_date?: string;
  notes?: string;
  internal_notes?: string;
}

export interface ListDonationsQuery {
  vendor_id?: string;
  donation_type?: string;
  receipt_sent?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function createDonation(userId: string, data: CreateDonationInput): Promise<any> {
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

    // Insert donation (trigger auto-generates donation_number)
    const donationResult = await client.query(
      `INSERT INTO donations
         (vendor_id, donor_name, donor_email, donor_phone, donor_address,
          donation_date, donation_type, fair_market_value, cash_amount,
          tax_receipt_required, goods_services_provided, goods_services_description,
          goods_services_value, appraisal_required, notes, internal_notes, processed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        data.vendor_id,
        data.donor_name,
        data.donor_email ?? null,
        data.donor_phone ?? null,
        data.donor_address ?? null,
        data.donation_date ?? null,
        data.donation_type,
        data.fair_market_value,
        data.cash_amount ?? 0,
        data.tax_receipt_required ?? true,
        data.goods_services_provided ?? false,
        data.goods_services_description ?? null,
        data.goods_services_value ?? 0,
        data.appraisal_required ?? false,
        data.notes ?? null,
        data.internal_notes ?? null,
        userId,
      ]
    );
    const donation = donationResult.rows[0];

    // If items provided: create linked receiving, insert items, complete receiving
    if (data.items && data.items.length > 0) {
      // 1. Create inventory_receiving of type 'donation'
      // Generate receiving_number (no DB trigger exists for this table)
      const rcvSeqResult = await client.query(
        `SELECT COUNT(*) + 1 AS next_seq FROM inventory_receiving
         WHERE EXTRACT(year FROM created_at) = $1 FOR UPDATE`,
        [new Date().getFullYear()]
      );
      const rcvSeq = parseInt(rcvSeqResult.rows[0].next_seq, 10);
      const receivingNumber = `RCV-${new Date().getFullYear()}-${rcvSeq.toString().padStart(4, '0')}`;

      const receivingResult = await client.query(
        `INSERT INTO inventory_receiving
           (receiving_number, vendor_id, receiving_type, received_by, is_donation)
         VALUES ($1, $2, 'donation', $3, true)
         RETURNING *`,
        [receivingNumber, data.vendor_id, userId]
      );
      const receiving = receivingResult.rows[0];

      // 2. Insert each item into receiving_items
      for (const item of data.items) {
        const lineTotal = (item.fair_market_value ?? 0) * item.quantity_received;
        await client.query(
          `INSERT INTO receiving_items
             (receiving_id, product_id, sku, product_name, category_id,
              quantity_received, fair_market_value, condition, line_total,
              accepted_quantity, rejected_quantity, add_to_inventory, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,true,$11)`,
          [
            receiving.id,
            item.product_id ?? null,
            item.sku ?? null,
            item.product_name,
            item.category_id ?? null,
            item.quantity_received,
            item.fair_market_value ?? null,
            item.condition,
            lineTotal,
            item.quantity_received,
            item.notes ?? null,
          ]
        );
      }

      // 3. Update receiving totals
      await client.query(
        `UPDATE inventory_receiving
         SET total_items    = (SELECT COUNT(*) FROM receiving_items WHERE receiving_id = $1),
             total_quantity = (SELECT COALESCE(SUM(quantity_received),0) FROM receiving_items WHERE receiving_id = $1),
             total_value    = (SELECT COALESCE(SUM(line_total),0) FROM receiving_items WHERE receiving_id = $1),
             updated_at     = NOW()
         WHERE id = $1`,
        [receiving.id]
      );

      // 4. Create inventory_adjustments for items with product_id
      // Do NOT include adjustment_number — trigger auto-generates it
      // Do NOT manually update products — apply_adjustment_trigger handles it
      for (const item of data.items) {
        if (item.product_id) {
          const productResult = await client.query(
            'SELECT quantity_in_stock FROM products WHERE id = $1',
            [item.product_id]
          );
          const oldQty = productResult.rows[0]?.quantity_in_stock ?? 0;
          const newQty = oldQty + item.quantity_received;
          await client.query(
            `INSERT INTO inventory_adjustments
               (product_id, adjustment_type, quantity_change, old_quantity, new_quantity, reason, adjusted_by)
             VALUES ($1, 'initial', $2, $3, $4, $5, $6)`,
            [item.product_id, item.quantity_received, oldQty, newQty, `Donation: ${donation.donation_number}`, userId]
          );
        }
      }

      // 5. Mark receiving completed, link donation.receiving_id
      await client.query(
        `UPDATE inventory_receiving SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [receiving.id]
      );
      const updatedDonation = await client.query(
        `UPDATE donations SET receiving_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [receiving.id, donation.id]
      );
      await client.query('COMMIT');
      return updatedDonation.rows[0];
    }

    await client.query('COMMIT');
    return donation;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listDonations(query: ListDonationsQuery): Promise<any> {
  const { vendor_id, donation_type, receipt_sent, start_date, end_date, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendor_id)     { conditions.push(`d.vendor_id = $${i++}`);      params.push(vendor_id); }
  if (donation_type) { conditions.push(`d.donation_type = $${i++}`);  params.push(donation_type); }
  if (receipt_sent !== undefined) { conditions.push(`d.tax_receipt_sent = $${i++}`); params.push(receipt_sent); }
  if (start_date)    { conditions.push(`d.donation_date >= $${i++}`); params.push(start_date); }
  if (end_date)      { conditions.push(`d.donation_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS count FROM donations d ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT d.*, v.business_name AS vendor_name
     FROM donations d
     JOIN vendors v ON v.id = d.vendor_id
     ${where}
     ORDER BY d.donation_date DESC, d.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  return {
    donations: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getDonation(id: string): Promise<any> {
  const donationResult = await pool.query(
    `SELECT d.*, v.business_name AS vendor_name
     FROM donations d
     JOIN vendors v ON v.id = d.vendor_id
     WHERE d.id = $1`,
    [id]
  );
  if (donationResult.rowCount === 0) {
    throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
  }
  const donation = donationResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT ri.*
     FROM receiving_items ri
     JOIN inventory_receiving ir ON ir.id = ri.receiving_id
     JOIN donations d ON d.receiving_id = ir.id
     WHERE d.id = $1
     ORDER BY ri.created_at ASC`,
    [id]
  );
  const items: any[] = itemsResult.rows;

  return { ...donation, items };
}

export async function getReceiptByNumber(donationNumber: string): Promise<any> {
  const result = await pool.query(
    `SELECT d.donation_number, d.donor_name, d.donation_date, d.fair_market_value,
            d.tax_receipt_number, d.tax_receipt_date, d.goods_services_provided,
            d.goods_services_value, d.acknowledgment_sent
     FROM donations d
     WHERE d.donation_number = $1`,
    [donationNumber]
  );
  if (result.rowCount === 0) {
    throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
  }
  return result.rows[0];
}

export async function getAnnualSummary(vendorId: string, year: number): Promise<any> {
  const summaryResult = await pool.query(
    `SELECT donation_type,
            COUNT(*) AS count,
            COALESCE(SUM(fair_market_value), 0) AS total_value,
            COUNT(*) FILTER (WHERE tax_receipt_sent = true) AS receipts_sent
     FROM donations
     WHERE vendor_id = $1
       AND EXTRACT(year FROM donation_date) = $2
     GROUP BY donation_type`,
    [vendorId, year]
  );

  const donationRows = await pool.query(
    `SELECT id, donation_number, donation_date, donation_type, fair_market_value, tax_receipt_sent
     FROM donations
     WHERE vendor_id = $1
       AND EXTRACT(year FROM donation_date) = $2
     ORDER BY donation_date ASC`,
    [vendorId, year]
  );

  let totalDonations = 0;
  let totalValue = 0;
  let goodsDonations = 0;
  let cashDonations = 0;
  let mixedDonations = 0;
  let receiptsSent = 0;

  for (const row of summaryResult.rows) {
    const count = parseInt(row.count, 10);
    totalDonations += count;
    totalValue += parseFloat(row.total_value);
    receiptsSent += parseInt(row.receipts_sent, 10);
    if (row.donation_type === 'goods')  goodsDonations  += count;
    if (row.donation_type === 'cash')   cashDonations   += count;
    if (row.donation_type === 'mixed')  mixedDonations  += count;
  }

  return {
    vendor_id: vendorId,
    year,
    total_donations: totalDonations,
    total_value: totalValue,
    goods_donations: goodsDonations,
    cash_donations: cashDonations,
    mixed_donations: mixedDonations,
    receipts_sent: receiptsSent,
    donations: donationRows.rows,
  };
}

export async function updateDonation(id: string, data: UpdateDonationInput): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const existing = fetchResult.rows[0];
    if (existing.tax_receipt_sent) {
      throw new AppError(400, 'DONATION_RECEIPTED', 'Cannot update a receipted donation');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (data.donor_name !== undefined)                { setClauses.push(`donor_name = $${i++}`);                params.push(data.donor_name); }
    if (data.donor_email !== undefined)               { setClauses.push(`donor_email = $${i++}`);               params.push(data.donor_email); }
    if (data.donor_phone !== undefined)               { setClauses.push(`donor_phone = $${i++}`);               params.push(data.donor_phone); }
    if (data.donor_address !== undefined)             { setClauses.push(`donor_address = $${i++}`);             params.push(data.donor_address); }
    if (data.donation_date !== undefined)             { setClauses.push(`donation_date = $${i++}`);             params.push(data.donation_date); }
    if (data.donation_type !== undefined)             { setClauses.push(`donation_type = $${i++}`);             params.push(data.donation_type); }
    if (data.fair_market_value !== undefined)         { setClauses.push(`fair_market_value = $${i++}`);         params.push(data.fair_market_value); }
    if (data.cash_amount !== undefined)               { setClauses.push(`cash_amount = $${i++}`);               params.push(data.cash_amount); }
    if (data.tax_receipt_required !== undefined)      { setClauses.push(`tax_receipt_required = $${i++}`);      params.push(data.tax_receipt_required); }
    if (data.goods_services_provided !== undefined)   { setClauses.push(`goods_services_provided = $${i++}`);   params.push(data.goods_services_provided); }
    if (data.goods_services_description !== undefined){ setClauses.push(`goods_services_description = $${i++}`);params.push(data.goods_services_description); }
    if (data.goods_services_value !== undefined)      { setClauses.push(`goods_services_value = $${i++}`);      params.push(data.goods_services_value); }
    if (data.appraisal_required !== undefined)        { setClauses.push(`appraisal_required = $${i++}`);        params.push(data.appraisal_required); }
    if (data.appraiser_name !== undefined)            { setClauses.push(`appraiser_name = $${i++}`);            params.push(data.appraiser_name); }
    if (data.appraisal_date !== undefined)            { setClauses.push(`appraisal_date = $${i++}`);            params.push(data.appraisal_date); }
    if (data.notes !== undefined)                     { setClauses.push(`notes = $${i++}`);                     params.push(data.notes); }
    if (data.internal_notes !== undefined)            { setClauses.push(`internal_notes = $${i++}`);            params.push(data.internal_notes); }

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await client.query(
      `UPDATE donations SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
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

export async function generateReceipt(id: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const donation = fetchResult.rows[0];
    if (donation.tax_receipt_number) {
      throw new AppError(400, 'RECEIPT_ALREADY_GENERATED', 'Receipt already generated for this donation');
    }

    // Generate RCPT-YYYYMMDD-NNNN
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxResult = await client.query(
      `SELECT MAX(CAST(SUBSTRING(tax_receipt_number FROM 15) AS INTEGER)) AS max_num
       FROM donations
       WHERE tax_receipt_number LIKE 'RCPT-' || $1 || '-%'`,
      [today]
    );
    const nextNum = (maxResult.rows[0].max_num ?? 0) + 1;
    const receiptNumber = `RCPT-${today}-${nextNum.toString().padStart(4, '0')}`;

    const result = await client.query(
      `UPDATE donations
       SET tax_receipt_number = $1,
           tax_receipt_sent   = true,
           tax_receipt_date   = CURRENT_DATE,
           updated_at         = NOW()
       WHERE id = $2
       RETURNING *`,
      [receiptNumber, id]
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

export async function sendReceipt(id: string, email?: string, method?: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }
    const donation = fetchResult.rows[0];

    const deliveryNote = `[RECEIPT SENT${email ? ' to ' + email : ''}${method ? ' via ' + method : ''}]`;
    const newNotes = donation.internal_notes
      ? `${donation.internal_notes} ${deliveryNote}`
      : deliveryNote;

    const result = await client.query(
      `UPDATE donations
       SET tax_receipt_sent = true,
           tax_receipt_date = COALESCE(tax_receipt_date, CURRENT_DATE),
           internal_notes   = $1,
           updated_at       = NOW()
       WHERE id = $2
       RETURNING *`,
      [newNotes, id]
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

export async function generateAcknowledgment(id: string): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM donations WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new AppError(404, 'DONATION_NOT_FOUND', 'Donation not found');
    }

    const result = await client.query(
      `UPDATE donations
       SET acknowledgment_sent = true,
           acknowledgment_date = CURRENT_DATE,
           updated_at          = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
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
