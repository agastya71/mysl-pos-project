export interface VendorPayment {
  id: string;
  payment_number: string;
  vendor_id: string;
  payment_date: string;
  payment_method: 'check' | 'ach' | 'wire' | 'credit_card' | 'cash' | 'other';
  transaction_reference: string | null;
  payment_amount: string;
  status: 'pending' | 'cleared' | 'void' | 'cancelled';
  notes: string | null;
  approved_by: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  vendor_payment_id: string;
  accounts_payable_id: string;
  allocated_amount: string;
  created_at: string;
}

export interface VendorPaymentWithAllocations extends VendorPayment {
  vendor: { id: string; vendor_number: string; business_name: string };
  allocations: Array<{
    id: string;
    accounts_payable_id: string;
    ap_number: string;
    invoice_number: string | null;
    allocated_amount: string;
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
