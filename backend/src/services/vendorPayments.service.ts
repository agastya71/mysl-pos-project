import { pool } from '../config/database';
import { updateAPBalance } from './accountsPayable.service';
import {
  VendorPayment,
  VendorPaymentWithAllocations,
  CreatePaymentInput,
  UpdatePaymentInput,
  VPListQuery,
  VPListResult,
  BatchPaymentInput,
} from '../types/vendorPayments.types';

async function generatePaymentNumber(client: any): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query(
    `SELECT COUNT(*) + 1 AS next_seq
     FROM vendor_payments
     WHERE EXTRACT(year FROM created_at) = $1
     FOR UPDATE`,
    [year]
  );
  const seq = parseInt(result.rows[0].next_seq, 10);
  return `PMT-${year}-${seq.toString().padStart(4, '0')}`;
}

async function createPaymentWithClient(
  client: any,
  userId: string,
  data: CreatePaymentInput
): Promise<VendorPayment> {
  // Validate vendor exists and is active
  const vendorResult = await client.query(
    'SELECT id, business_name, current_balance FROM vendors WHERE id = $1 AND is_active = true',
    [data.vendor_id]
  );
  if (vendorResult.rowCount === 0) {
    throw new Error('Vendor not found');
  }

  // Generate payment number
  const paymentNumber = await generatePaymentNumber(client);

  // Calculate total from allocations
  const totalAmount = data.invoice_allocations.reduce(
    (sum, alloc) => sum + alloc.allocated_amount,
    0
  );

  // Insert payment record
  const paymentResult = await client.query(
    `INSERT INTO vendor_payments
       (vendor_id, payment_number, payment_date, payment_method, transaction_reference,
        payment_amount, status, notes, processed_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
     RETURNING *`,
    [
      data.vendor_id,
      paymentNumber,
      data.payment_date,
      data.payment_method,
      data.reference_number ?? null,
      totalAmount,
      data.memo ?? null,
      userId,
    ]
  );
  const payment = paymentResult.rows[0] as VendorPayment;

  // Process each allocation
  for (const alloc of data.invoice_allocations) {
    // Lock AP invoice and validate
    const apResult = await client.query(
      `SELECT id, vendor_id, invoice_amount, amount_paid, amount_due, status
       FROM accounts_payable
       WHERE id = $1
       FOR UPDATE`,
      [alloc.ap_invoice_id]
    );

    if (apResult.rowCount === 0) {
      throw new Error('Invoice not found');
    }

    const ap = apResult.rows[0];

    if (ap.vendor_id !== data.vendor_id) {
      throw new Error('Invoice does not belong to this vendor');
    }

    if (parseFloat(alloc.allocated_amount.toString()) > parseFloat(ap.amount_due)) {
      throw new Error('Allocated amount exceeds invoice balance');
    }

    // Insert allocation
    await client.query(
      `INSERT INTO payment_allocations
         (vendor_payment_id, accounts_payable_id, allocated_amount)
       VALUES ($1, $2, $3)`,
      [
        payment.id,
        alloc.ap_invoice_id,
        alloc.allocated_amount,
      ]
    );

    // Update AP balance
    await updateAPBalance(client, alloc.ap_invoice_id, alloc.allocated_amount);
  }

  // Decrement vendor current_balance by total allocated
  await client.query(
    'UPDATE vendors SET current_balance = current_balance - $1 WHERE id = $2',
    [totalAmount, data.vendor_id]
  );

  return payment;
}

export async function createPayment(
  userId: string,
  data: CreatePaymentInput
): Promise<VendorPayment> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = await createPaymentWithClient(client, userId, data);
    await client.query('COMMIT');
    return payment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function batchPayments(
  userId: string,
  data: BatchPaymentInput
): Promise<VendorPayment[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payments: VendorPayment[] = [];
    for (const paymentData of data.payments) {
      const payment = await createPaymentWithClient(client, userId, paymentData);
      payments.push(payment);
    }
    await client.query('COMMIT');
    return payments;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function approvePayment(
  paymentId: string,
  userId: string
): Promise<VendorPayment> {
  const fetchResult = await pool.query(
    'SELECT * FROM vendor_payments WHERE id = $1',
    [paymentId]
  );
  if (fetchResult.rowCount === 0) {
    throw new Error('Payment not found');
  }
  const payment = fetchResult.rows[0] as VendorPayment;
  if (payment.status !== 'pending') {
    throw new Error('Only pending payments can be approved');
  }

  const updateResult = await pool.query(
    `UPDATE vendor_payments
     SET status = 'cleared', approved_by = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [userId, paymentId]
  );
  return updateResult.rows[0] as VendorPayment;
}

export async function voidPayment(paymentId: string): Promise<VendorPayment> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM vendor_payments WHERE id = $1',
      [paymentId]
    );
    if (fetchResult.rowCount === 0) {
      throw new Error('Payment not found');
    }
    const payment = fetchResult.rows[0] as VendorPayment;
    if (payment.status === 'void' || payment.status === 'cancelled') {
      throw new Error('Payment cannot be voided');
    }

    // Fetch allocations to reverse
    const allocResult = await client.query(
      'SELECT accounts_payable_id, allocated_amount FROM payment_allocations WHERE vendor_payment_id = $1',
      [paymentId]
    );

    let totalReversed = 0;
    for (const alloc of allocResult.rows) {
      const amount = parseFloat(alloc.allocated_amount);
      await updateAPBalance(client, alloc.accounts_payable_id, -amount);
      totalReversed += amount;
    }

    // Restore vendor balance
    if (totalReversed > 0) {
      await client.query(
        'UPDATE vendors SET current_balance = current_balance + $1 WHERE id = $2',
        [totalReversed, payment.vendor_id]
      );
    }

    // Mark payment void
    const updateResult = await client.query(
      `UPDATE vendor_payments SET status = 'void', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [paymentId]
    );

    await client.query('COMMIT');
    return updateResult.rows[0] as VendorPayment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listPayments(query: VPListQuery): Promise<VPListResult> {
  const {
    vendor_id,
    status,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = query;

  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendor_id) { conditions.push(`vendor_id = $${i++}`); params.push(vendor_id); }
  if (status) { conditions.push(`status = $${i++}`); params.push(status); }
  if (start_date) { conditions.push(`payment_date >= $${i++}`); params.push(start_date); }
  if (end_date) { conditions.push(`payment_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM vendor_payments ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM vendor_payments ${where}
     ORDER BY payment_date DESC, created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  const totalAmount = dataResult.rows.reduce(
    (sum: number, p: any) => sum + parseFloat(p.payment_amount || '0'),
    0
  );

  return {
    payments: dataResult.rows as VendorPayment[],
    total,
    total_amount: totalAmount,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getPayment(paymentId: string): Promise<VendorPaymentWithAllocations> {
  const result = await pool.query(
    `SELECT
       vp.*,
       v.vendor_number, v.business_name,
       pa.id AS alloc_id,
       pa.accounts_payable_id,
       ap.ap_number,
       ap.invoice_number,
       pa.allocated_amount
     FROM vendor_payments vp
     JOIN vendors v ON v.id = vp.vendor_id
     LEFT JOIN payment_allocations pa ON pa.vendor_payment_id = vp.id
     LEFT JOIN accounts_payable ap ON ap.id = pa.accounts_payable_id
     WHERE vp.id = $1`,
    [paymentId]
  );

  if (result.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const first = result.rows[0];
  const payment: VendorPaymentWithAllocations = {
    id: first.id,
    payment_number: first.payment_number,
    vendor_id: first.vendor_id,
    payment_date: first.payment_date,
    payment_method: first.payment_method,
    transaction_reference: first.transaction_reference,
    payment_amount: first.payment_amount,
    status: first.status,
    notes: first.notes,
    approved_by: first.approved_by,
    processed_by: first.processed_by,
    created_at: first.created_at,
    updated_at: first.updated_at,
    vendor: {
      id: first.vendor_id,
      vendor_number: first.vendor_number,
      business_name: first.business_name,
    },
    allocations: result.rows
      .filter((r: any) => r.alloc_id !== null)
      .map((r: any) => ({
        id: r.alloc_id,
        accounts_payable_id: r.accounts_payable_id,
        ap_number: r.ap_number,
        invoice_number: r.invoice_number,
        allocated_amount: r.allocated_amount,
      })),
  };

  return payment;
}

export async function updatePayment(
  paymentId: string,
  data: UpdatePaymentInput
): Promise<VendorPayment> {
  const existing = await pool.query(
    'SELECT * FROM vendor_payments WHERE id = $1',
    [paymentId]
  );
  if (existing.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (data.payment_date !== undefined) { setClauses.push(`payment_date = $${i++}`); params.push(data.payment_date); }
  if (data.payment_method !== undefined) { setClauses.push(`payment_method = $${i++}`); params.push(data.payment_method); }
  if (data.reference_number !== undefined) { setClauses.push(`transaction_reference = $${i++}`); params.push(data.reference_number); }
  if (data.memo !== undefined) { setClauses.push(`notes = $${i++}`); params.push(data.memo); }

  setClauses.push(`updated_at = NOW()`);
  params.push(paymentId);

  const result = await pool.query(
    `UPDATE vendor_payments SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return result.rows[0] as VendorPayment;
}
