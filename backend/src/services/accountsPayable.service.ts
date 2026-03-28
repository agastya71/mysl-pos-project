import { pool } from '../config/database';
import {
  APInvoice,
  APInvoiceWithDetails,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  APListQuery,
  APListResult,
  AgingReport,
} from '../types/accountsPayable.types';

async function generateAPNumber(client: any): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query(
    `SELECT COUNT(*) + 1 AS next_seq
     FROM accounts_payable
     WHERE EXTRACT(year FROM created_at) = $1
     FOR UPDATE`,
    [year]
  );
  const seq = parseInt(result.rows[0].next_seq, 10);
  return `AP-${year}-${seq.toString().padStart(4, '0')}`;
}

export async function updateAPBalance(
  client: any,
  apId: string,
  delta: number
): Promise<APInvoice> {
  // Lock the row
  const lockResult = await client.query(
    'SELECT * FROM accounts_payable WHERE id = $1 FOR UPDATE',
    [apId]
  );
  if (lockResult.rowCount === 0) {
    throw new Error('Invoice not found');
  }
  const ap = lockResult.rows[0];
  if (ap.status === 'cancelled') {
    throw new Error('Invoice is cancelled');
  }

  const newAmountPaid = parseFloat(ap.amount_paid) + delta;
  const invoiceAmount = parseFloat(ap.invoice_amount);

  let newStatus: string;
  if (newAmountPaid <= 0) {
    newStatus = 'open';
  } else if (newAmountPaid >= invoiceAmount) {
    newStatus = 'paid';
  } else {
    newStatus = 'partial';
  }

  const result = await client.query(
    `UPDATE accounts_payable
     SET amount_paid = $1, status = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newAmountPaid, newStatus, apId]
  );
  return result.rows[0] as APInvoice;
}

export async function createInvoice(
  userId: string,
  data: CreateInvoiceInput
): Promise<APInvoice> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate vendor exists and is active
    const vendorResult = await client.query(
      'SELECT id, business_name FROM vendors WHERE id = $1 AND is_active = true',
      [data.vendor_id]
    );
    if (vendorResult.rowCount === 0) {
      throw new Error('Vendor not found');
    }

    // Validate PO if provided
    if (data.purchase_order_id) {
      const poResult = await client.query(
        'SELECT id FROM purchase_orders WHERE id = $1',
        [data.purchase_order_id]
      );
      if (poResult.rowCount === 0) {
        throw new Error('Purchase order not found');
      }
    }

    const apNumber = await generateAPNumber(client);

    const insertResult = await client.query(
      `INSERT INTO accounts_payable
         (vendor_id, purchase_order_id, ap_number, invoice_number, invoice_date, due_date,
          invoice_amount, discount_available, discount_date, payment_terms, notes, internal_notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.vendor_id,
        data.purchase_order_id ?? null,
        apNumber,
        data.invoice_number ?? null,
        data.invoice_date,
        data.due_date,
        data.invoice_amount,
        data.discount_available ?? 0,
        data.discount_date ?? null,
        data.payment_terms ?? null,
        data.notes ?? null,
        data.internal_notes ?? null,
        userId,
      ]
    );

    // Increment vendor current_balance
    await client.query(
      'UPDATE vendors SET current_balance = current_balance + $1 WHERE id = $2',
      [data.invoice_amount, data.vendor_id]
    );

    await client.query('COMMIT');
    return insertResult.rows[0] as APInvoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
