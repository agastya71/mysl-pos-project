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
       (vendor_id, payment_number, payment_date, payment_method, reference_number,
        total_amount, status, memo, created_by)
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
         (payment_id, ap_invoice_id, allocated_amount, discount_taken)
       VALUES ($1, $2, $3, $4)`,
      [
        payment.id,
        alloc.ap_invoice_id,
        alloc.allocated_amount,
        alloc.discount_taken ?? 0,
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
     SET status = 'cleared', approved_by = $1, approved_at = NOW(), updated_at = NOW()
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
      'SELECT ap_invoice_id, allocated_amount FROM payment_allocations WHERE payment_id = $1',
      [paymentId]
    );

    let totalReversed = 0;
    for (const alloc of allocResult.rows) {
      const amount = parseFloat(alloc.allocated_amount);
      await updateAPBalance(client, alloc.ap_invoice_id, -amount);
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
  throw new Error('Not yet implemented');
}

export async function getPayment(paymentId: string): Promise<VendorPaymentWithAllocations> {
  throw new Error('Not yet implemented');
}

export async function updatePayment(
  paymentId: string,
  data: UpdatePaymentInput
): Promise<VendorPayment> {
  throw new Error('Not yet implemented');
}
