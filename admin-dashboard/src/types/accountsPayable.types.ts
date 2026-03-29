export interface APInvoice {
  id: string;
  ap_number: string;
  vendor_id: string;
  purchase_order_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string;
  status: 'open' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  invoice_amount: string;
  amount_paid: string;
  amount_due: string;
  discount_available: string;
  discount_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface APPaymentSummary {
  id: string;
  payment_number: string;
  payment_date: string;
  payment_method: string;
  allocated_amount: string;
  status: string;
}

export interface APInvoiceWithDetails extends APInvoice {
  vendor: { id: string; vendor_number: string; business_name: string };
  purchase_order: { id: string; po_number: string } | null;
  payments: APPaymentSummary[];
}

export interface APListQuery {
  vendor_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface APListResult {
  invoices: APInvoice[];
  total: number;
  total_due: number;
  overdue_total: number;
  page: number;
  pages: number;
}

export interface CreateAPInput {
  vendor_id: string;
  purchase_order_id?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  invoice_amount: number;
  discount_available?: number;
  discount_date?: string;
  payment_terms?: string;
  notes?: string;
  internal_notes?: string;
}

export interface UpdateAPInput {
  due_date?: string;
  payment_terms?: string;
  discount_available?: number;
  discount_date?: string;
  notes?: string;
  internal_notes?: string;
}

export interface SimpleVendor {
  id: string;
  vendor_number: string;
  business_name: string;
}
