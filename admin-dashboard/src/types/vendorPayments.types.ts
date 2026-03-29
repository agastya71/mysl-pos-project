export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number: string | null;
  total_amount: string;
  status: 'pending' | 'cleared' | 'void' | 'cancelled';
  memo: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  ap_invoice_id: string;
  allocated_amount: string;
  discount_taken: string;
  created_at: string;
}

export interface VendorPaymentWithAllocations extends VendorPayment {
  vendor: { id: string; vendor_number: string; business_name: string };
  allocations: Array<{
    id: string;
    ap_invoice_id: string;
    ap_number: string;
    invoice_number: string | null;
    allocated_amount: string;
    discount_taken: string;
  }>;
}

export interface InvoiceAllocationInput {
  ap_invoice_id: string;
  allocated_amount: number;
  discount_taken?: number;
}

export interface CreatePaymentInput {
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
  invoice_allocations: InvoiceAllocationInput[];
}

export interface UpdatePaymentInput {
  payment_date?: string;
  payment_method?: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  reference_number?: string;
  memo?: string;
}

export interface BatchPaymentInput {
  payments: CreatePaymentInput[];
}

export interface VPListQuery {
  vendor_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface VPListResult {
  payments: VendorPayment[];
  total: number;
  total_amount: number;
  page: number;
  pages: number;
}
