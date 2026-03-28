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

export async function getInvoice(id: string): Promise<APInvoiceWithDetails> {
  const result = await pool.query(
    `SELECT
       ap.*,
       v.vendor_number, v.business_name,
       po.po_number,
       pa.id AS alloc_id,
       vp.id AS payment_id,
       vp.payment_number,
       vp.payment_date,
       vp.payment_method,
       pa.allocated_amount,
       vp.status AS payment_status
     FROM accounts_payable ap
     JOIN vendors v ON v.id = ap.vendor_id
     LEFT JOIN purchase_orders po ON po.id = ap.purchase_order_id
     LEFT JOIN payment_allocations pa ON pa.ap_invoice_id = ap.id
     LEFT JOIN vendor_payments vp ON vp.id = pa.payment_id
     WHERE ap.id = $1`,
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error('Invoice not found');
  }

  const first = result.rows[0];
  const invoice: APInvoiceWithDetails = {
    id: first.id,
    ap_number: first.ap_number,
    vendor_id: first.vendor_id,
    purchase_order_id: first.purchase_order_id,
    invoice_number: first.invoice_number,
    invoice_date: first.invoice_date,
    due_date: first.due_date,
    status: first.status,
    invoice_amount: first.invoice_amount,
    amount_paid: first.amount_paid,
    amount_due: first.amount_due,
    discount_available: first.discount_available,
    discount_date: first.discount_date,
    payment_terms: first.payment_terms,
    notes: first.notes,
    internal_notes: first.internal_notes,
    created_by: first.created_by,
    created_at: first.created_at,
    updated_at: first.updated_at,
    vendor: {
      id: first.vendor_id,
      vendor_number: first.vendor_number,
      business_name: first.business_name,
    },
    purchase_order: first.purchase_order_id
      ? { id: first.purchase_order_id, po_number: first.po_number }
      : null,
    payments: result.rows
      .filter((r: any) => r.payment_id !== null)
      .map((r: any) => ({
        id: r.alloc_id,
        payment_number: r.payment_number,
        payment_date: r.payment_date,
        payment_method: r.payment_method,
        allocated_amount: r.allocated_amount,
        status: r.payment_status,
      })),
  };

  return invoice;
}

export async function listInvoices(query: APListQuery): Promise<APListResult> {
  const {
    vendor_id,
    status,
    overdue,
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
  if (overdue === 'true') {
    conditions.push(`due_date < NOW() AND status IN ('open','partial')`);
  }
  if (start_date) { conditions.push(`invoice_date >= $${i++}`); params.push(start_date); }
  if (end_date) { conditions.push(`invoice_date <= $${i++}`); params.push(end_date); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const summaryResult = await pool.query(
    `SELECT COUNT(*) as count,
            COALESCE(SUM(amount_due), 0) as total_due,
            COALESCE(SUM(CASE WHEN due_date < NOW() AND status IN ('open','partial') THEN amount_due ELSE 0 END), 0) as overdue_total
     FROM accounts_payable ${where}`,
    params
  );

  const summary = summaryResult.rows[0];
  const total = parseInt(summary.count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM accounts_payable ${where}
     ORDER BY due_date ASC, created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  return {
    invoices: dataResult.rows as APInvoice[],
    total,
    total_due: parseFloat(summary.total_due),
    overdue_total: parseFloat(summary.overdue_total),
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceInput
): Promise<APInvoice> {
  const existing = await pool.query(
    'SELECT * FROM accounts_payable WHERE id = $1',
    [id]
  );
  if (existing.rowCount === 0) {
    throw new Error('Invoice not found');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (data.due_date !== undefined) { setClauses.push(`due_date = $${i++}`); params.push(data.due_date); }
  if (data.payment_terms !== undefined) { setClauses.push(`payment_terms = $${i++}`); params.push(data.payment_terms); }
  if (data.discount_available !== undefined) { setClauses.push(`discount_available = $${i++}`); params.push(data.discount_available); }
  if (data.discount_date !== undefined) { setClauses.push(`discount_date = $${i++}`); params.push(data.discount_date); }
  if (data.notes !== undefined) { setClauses.push(`notes = $${i++}`); params.push(data.notes); }
  if (data.internal_notes !== undefined) { setClauses.push(`internal_notes = $${i++}`); params.push(data.internal_notes); }

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const result = await pool.query(
    `UPDATE accounts_payable SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  return result.rows[0] as APInvoice;
}

export async function cancelInvoice(
  id: string,
  _reason: string
): Promise<APInvoice> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const fetchResult = await client.query(
      'SELECT * FROM accounts_payable WHERE id = $1',
      [id]
    );
    if (fetchResult.rowCount === 0) {
      throw new Error('Invoice not found');
    }
    const invoice = fetchResult.rows[0];
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new Error('Cannot cancel a paid or already cancelled invoice');
    }

    const updateResult = await client.query(
      `UPDATE accounts_payable SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    // Decrement vendor balance by amount_due (remaining unpaid amount)
    await client.query(
      'UPDATE vendors SET current_balance = current_balance - $1 WHERE id = $2',
      [parseFloat(invoice.amount_due), invoice.vendor_id]
    );

    await client.query('COMMIT');
    return updateResult.rows[0] as APInvoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getAgingReport(
  vendorId?: string,
  asOfDate?: string
): Promise<AgingReport> {
  const asOf = asOfDate || new Date().toISOString().split('T')[0];
  const params: unknown[] = [asOf, asOf, asOf, asOf, asOf];
  const vendorCondition = vendorId ? `AND ap.vendor_id = $6` : '';
  if (vendorId) params.push(vendorId);

  const result = await pool.query(
    `SELECT
       v.id AS vendor_id,
       v.vendor_number,
       v.business_name,
       COALESCE(SUM(CASE WHEN ap.due_date >= $1::date THEN ap.amount_due ELSE 0 END), 0) AS current_amount,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $2::date - INTERVAL '30 days' AND $2::date - INTERVAL '1 day' THEN ap.amount_due ELSE 0 END), 0) AS days_1_30,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $3::date - INTERVAL '60 days' AND $3::date - INTERVAL '31 days' THEN ap.amount_due ELSE 0 END), 0) AS days_31_60,
       COALESCE(SUM(CASE WHEN ap.due_date BETWEEN $4::date - INTERVAL '90 days' AND $4::date - INTERVAL '61 days' THEN ap.amount_due ELSE 0 END), 0) AS days_61_90,
       COALESCE(SUM(CASE WHEN ap.due_date < $5::date - INTERVAL '90 days' THEN ap.amount_due ELSE 0 END), 0) AS days_90_plus,
       COALESCE(SUM(ap.amount_due), 0) AS total
     FROM vendors v
     JOIN accounts_payable ap ON ap.vendor_id = v.id
     WHERE ap.status IN ('open', 'partial', 'overdue')
     ${vendorCondition}
     GROUP BY v.id, v.vendor_number, v.business_name
     ORDER BY v.business_name`,
    params
  );

  const vendors = result.rows.map((r: any) => ({
    vendor_id: r.vendor_id,
    vendor_number: r.vendor_number,
    business_name: r.business_name,
    current: parseFloat(r.current_amount),
    days_1_30: parseFloat(r.days_1_30),
    days_31_60: parseFloat(r.days_31_60),
    days_61_90: parseFloat(r.days_61_90),
    days_90_plus: parseFloat(r.days_90_plus),
    total: parseFloat(r.total),
  }));

  const totals = vendors.reduce(
    (acc, v) => ({
      current: acc.current + v.current,
      days_1_30: acc.days_1_30 + v.days_1_30,
      days_31_60: acc.days_31_60 + v.days_31_60,
      days_61_90: acc.days_61_90 + v.days_61_90,
      days_90_plus: acc.days_90_plus + v.days_90_plus,
      grand_total: acc.grand_total + v.total,
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, grand_total: 0 }
  );

  return { as_of_date: asOf, vendors, totals };
}

export async function getDueThisWeek(): Promise<APInvoice[]> {
  const result = await pool.query(
    `SELECT * FROM accounts_payable
     WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       AND status IN ('open', 'partial', 'overdue')
     ORDER BY due_date ASC`
  );
  return result.rows as APInvoice[];
}
