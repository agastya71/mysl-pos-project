/**
 * @fileoverview Transaction Type Definitions - POS transaction data structures
 *
 * Defines transaction, transaction items, payments, and related types for POS system.
 * Includes entities, request/response types, and query parameters.
 *
 * @module types/transaction.types
 * @author Claude Opus 4.6 <noreply@anthropic.com>
 * @created 2026-02-XX (Phase 1B)
 * @updated 2026-02-08 (Documentation)
 */

/**
 * Transaction entity
 *
 * Main transaction record from database. Auto-generated transaction_number (TXN-XXXXXX).
 * Tracks status lifecycle: draft → completed → voided/refunded.
 *
 * @interface Transaction
 * @property {string} id - UUID primary key
 * @property {string} transaction_number - Auto-generated (TXN-000001, TXN-000002, ...)
 * @property {string} terminal_id - Foreign key to terminals table
 * @property {string} cashier_id - Foreign key to users table
 * @property {string} [customer_id] - Optional foreign key to customers table
 * @property {number} subtotal - Sum of line totals before tax/discount (decimal 10,2)
 * @property {number} tax_amount - Total tax amount
 * @property {number} discount_amount - Total discount amount
 * @property {number} total_amount - Final total (subtotal + tax - discount)
 * @property {'draft' | 'completed' | 'voided' | 'refunded'} status - Transaction status
 * @property {string} transaction_date - ISO timestamp of transaction
 * @property {string} [completed_at] - ISO timestamp when completed
 * @property {string} [voided_at] - ISO timestamp when voided
 * @property {string} [voided_by] - User ID who voided transaction
 * @property {string} [void_reason] - Reason for voiding (required when voided)
 * @property {string} [refund_transaction_id] - Link to refund transaction
 * @property {string} [notes] - Optional transaction notes
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */
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

/**
 * Transaction item (line item)
 *
 * Individual product line in transaction with pricing and product snapshot.
 * Snapshot preserves product data at time of sale for historical accuracy.
 *
 * @interface TransactionItem
 * @property {string} id - UUID primary key
 * @property {string} transaction_id - Foreign key to transactions table
 * @property {string} product_id - Foreign key to products table
 * @property {ProductSnapshot} product_snapshot - Product data at time of sale (JSONB)
 * @property {number} quantity - Quantity sold
 * @property {number} unit_price - Price per unit (may differ from current base_price)
 * @property {number} discount_amount - Line item discount
 * @property {number} tax_amount - Line item tax
 * @property {number} line_total - (unit_price * quantity) - discount + tax
 * @property {string} created_at - ISO timestamp
 */
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

/**
 * Product snapshot stored with transaction items
 *
 * Historical product data at time of sale (stored in JSONB).
 * Preserves pricing/details even if product later changes.
 *
 * @interface ProductSnapshot
 * @property {string} sku - SKU at time of sale
 * @property {string} name - Product name at time of sale
 * @property {number} base_price - Base price at time of sale
 * @property {number} tax_rate - Tax rate at time of sale
 * @property {string} [category_name] - Category name at time of sale
 * @property {string} [description] - Description at time of sale
 */
export interface ProductSnapshot {
  sku: string;
  name: string;
  base_price: number;
  tax_rate: number;
  category_name?: string;
  description?: string;
}

/**
 * Payment entity
 *
 * Payment record for transaction. Transactions can have multiple payments (split payments).
 * MVP supports cash only; card/check fields prepared for future.
 *
 * @interface Payment
 * @property {string} id - UUID primary key
 * @property {string} transaction_id - Foreign key to transactions table
 * @property {'cash' | 'credit_card' | 'debit_card' | 'check'} payment_method - Payment method
 * @property {number} amount - Payment amount (decimal 10,2)
 * @property {'pending' | 'completed' | 'failed'} status - Payment status
 * @property {string} [payment_processor] - External processor (Stripe, Square, etc.)
 * @property {string} [processor_transaction_id] - External transaction ID
 * @property {string} [payment_date] - ISO timestamp of payment
 * @property {string} [completed_at] - ISO timestamp when completed
 * @property {string} [failed_at] - ISO timestamp when failed
 * @property {string} [failure_reason] - Failure reason
 * @property {string} created_at - ISO timestamp
 */
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

/**
 * Payment details
 *
 * Additional payment method-specific details (cash received, card info, check number).
 * Separate table for extensibility.
 *
 * @interface PaymentDetail
 * @property {string} id - UUID primary key
 * @property {string} payment_id - Foreign key to payments table
 * @property {number} [cash_received] - Cash received (for change calculation)
 * @property {number} [cash_change] - Change given
 * @property {string} [card_type] - Card type (Visa, Mastercard, etc.)
 * @property {string} [card_last_four] - Last 4 digits of card
 * @property {string} [check_number] - Check number
 * @property {string} [authorization_code] - Card authorization code
 * @property {string} created_at - ISO timestamp
 */
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

/**
 * Transaction with nested items and payments
 *
 * Extended transaction type with populated relationships.
 * Used for transaction details view and receipts.
 *
 * @interface TransactionWithDetails
 * @extends Transaction
 * @property {TransactionItem[]} items - Transaction line items
 * @property {PaymentWithDetails[]} payments - Payments with details
 * @property {string} [cashier_name] - Cashier full name (joined)
 * @property {string} [customer_name] - Customer full name (joined)
 * @property {string} [terminal_name] - Terminal name (joined)
 */
export interface TransactionWithDetails extends Transaction {
  items: TransactionItem[];
  payments: PaymentWithDetails[];
  cashier_name?: string;
  customer_name?: string;
  terminal_name?: string;
}

/**
 * Payment with nested details
 *
 * Extended payment type with populated payment details.
 *
 * @interface PaymentWithDetails
 * @extends Payment
 * @property {PaymentDetail} [details] - Payment method details
 */
export interface PaymentWithDetails extends Payment {
  details?: PaymentDetail;
}

/**
 * Create transaction request
 *
 * Request body for POST /api/v1/transactions endpoint.
 * Creates transaction atomically with items and payments.
 *
 * @interface CreateTransactionRequest
 * @property {string} terminal_id - Terminal UUID where transaction occurred
 * @property {string} [customer_id] - Optional customer UUID
 * @property {AddItemRequest[]} items - Line items to add (must have at least one)
 * @property {CreatePaymentRequest[]} payments - Payments to add (must have at least one)
 */
export interface CreateTransactionRequest {
  terminal_id: string;
  customer_id?: string;
  items: AddItemRequest[];
  payments: CreatePaymentRequest[];
}

/**
 * Add item request (for transaction creation)
 *
 * Line item to add to transaction. Product details fetched server-side.
 *
 * @interface AddItemRequest
 * @property {string} product_id - Product UUID
 * @property {number} quantity - Quantity to add (must be positive)
 * @property {number} [discount_amount] - Optional line item discount
 */
export interface AddItemRequest {
  product_id: string;
  quantity: number;
  discount_amount?: number;
}

/**
 * Create payment request (for transaction creation)
 *
 * Payment to add to transaction. Payment details vary by method.
 *
 * @interface CreatePaymentRequest
 * @property {Payment['payment_method']} payment_method - Payment method
 * @property {number} amount - Payment amount (must be positive)
 * @property {Object} [payment_details] - Method-specific details
 * @property {number} [payment_details.cash_received] - Cash received (for change)
 * @property {string} [payment_details.card_last_four] - Last 4 digits of card
 * @property {string} [payment_details.card_type] - Card type (Visa, Mastercard, etc.)
 * @property {string} [payment_details.check_number] - Check number
 */
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

/**
 * Transaction list query parameters
 *
 * Optional filters, pagination, and search for transaction list endpoint.
 *
 * @interface TransactionListQuery
 * @property {number} [page] - Page number (1-indexed, default: 1)
 * @property {number} [limit] - Items per page (default: 50)
 * @property {Transaction['status']} [status] - Filter by status
 * @property {string} [start_date] - Filter by date range start (ISO date)
 * @property {string} [end_date] - Filter by date range end (ISO date)
 * @property {string} [cashier_id] - Filter by cashier UUID
 * @property {string} [terminal_id] - Filter by terminal UUID
 * @property {string} [transaction_number] - Search by transaction number
 */
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

/**
 * Transaction list paginated response
 *
 * Standardized paginated response for transaction list endpoint.
 *
 * @interface TransactionListResponse
 * @property {Transaction[]} transactions - Array of transaction records
 * @property {Object} pagination - Pagination metadata
 * @property {number} pagination.page - Current page number
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total matching transactions
 * @property {number} pagination.totalPages - Total number of pages
 */
export interface TransactionListResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
