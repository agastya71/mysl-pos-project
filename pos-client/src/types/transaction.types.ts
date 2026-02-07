export interface Transaction {
  id: string;
  transaction_number: string;
  terminal_id: string;
  cashier_id: string;
  customer_id?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'completed' | 'voided' | 'refunded';
  transaction_date: string;
  completed_at?: string;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  refund_transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_snapshot: ProductSnapshot;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

export interface ProductSnapshot {
  sku: string;
  name: string;
  base_price: number;
  tax_rate: number;
  category_name?: string;
  description?: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'check';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_processor?: string;
  processor_transaction_id?: string;
  payment_date?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface PaymentDetail {
  id: string;
  payment_id: string;
  cash_received?: number;
  cash_change?: number;
  card_type?: string;
  card_last_four?: string;
  check_number?: string;
  authorization_code?: string;
  created_at: string;
}

export interface TransactionWithDetails extends Transaction {
  items: TransactionItem[];
  payments: PaymentWithDetails[];
  cashier_name?: string;
  customer_name?: string;
  terminal_name?: string;
}

export interface PaymentWithDetails extends Payment {
  details?: PaymentDetail;
}

export interface CreateTransactionRequest {
  terminal_id: string;
  customer_id?: string;
  items: AddItemRequest[];
  payments: CreatePaymentRequest[];
}

export interface AddItemRequest {
  product_id: string;
  quantity: number;
  discount_amount?: number;
}

export interface CreatePaymentRequest {
  payment_method: Payment['payment_method'];
  amount: number;
  payment_details?: {
    cash_received?: number;
    card_last_four?: string;
    card_type?: string;
    check_number?: string;
  };
}

export interface TransactionListQuery {
  page?: number;
  limit?: number;
  status?: Transaction['status'];
  start_date?: string;
  end_date?: string;
  cashier_id?: string;
  terminal_id?: string;
  transaction_number?: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
