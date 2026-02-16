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
  transaction_date: Date;
  completed_at?: Date;
  voided_at?: Date;
  voided_by?: string;
  void_reason?: string;
  refund_transaction_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
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
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'check' | 'gift_card' | 'store_credit';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  payment_processor?: string;
  processor_transaction_id?: string;
  payment_date?: Date;
  completed_at?: Date;
  failed_at?: Date;
  failure_reason?: string;
  gift_card_id?: string; // For gift card payments
  created_at: Date;
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
  created_at: Date;
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
    // Cash
    cash_received?: number;

    // Card (credit/debit)
    card_token?: string; // From payment processor
    card_last_four?: string;
    card_type?: string;
    card_brand?: string; // visa, mastercard, amex, discover
    authorization_code?: string;

    // Gift card
    gift_card_number?: string;
    gift_card_id?: string;

    // Check
    check_number?: string;
    bank_name?: string;
    check_date?: string;

    // Store credit
    store_credit_account_id?: string;
  };
}

export interface TransactionListQuery {
  page?: number;
  limit?: number;
  status?: Transaction['status'];
  terminal_id?: string;
  cashier_id?: string;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'transaction_date' | 'total_amount' | 'transaction_number';
  sort_order?: 'asc' | 'desc';
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface VoidTransactionRequest {
  reason: string;
}

/**
 * Payment Processing Results (Phase 3)
 */
export interface PaymentProcessingResult {
  success: boolean;
  payment_id?: string;
  error?: string;
  details?: any; // Payment-specific details
}

export interface CashPaymentResult extends PaymentProcessingResult {
  cash_received: number;
  cash_change: number;
}

export interface CardPaymentResult extends PaymentProcessingResult {
  authorization_id: string;
  authorization_code: string;
  card_last_four: string;
  card_brand: string;
  processor_name: string;
}

export interface GiftCardPaymentResult extends PaymentProcessingResult {
  gift_card_id: string;
  gift_card_number: string;
  previous_balance: number;
  new_balance: number;
}

export interface CheckPaymentResult extends PaymentProcessingResult {
  check_number: string;
}

export interface StoreCreditPaymentResult extends PaymentProcessingResult {
  store_credit_account_id: string;
  previous_balance: number;
  new_balance: number;
}
