/**
 * Payment Types for Phase 4B: Payment Processing Enhancements
 * Supports multiple payment methods, split payments, and card/gift card processing
 */

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'gift_card'
  | 'store_credit'
  | 'check'
  | 'digital_wallet';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'completed'
  | 'failed'
  | 'voided'
  | 'refunded'
  | 'partially_refunded';

export interface Payment {
  id: string;
  transaction_id: string;
  payment_method: PaymentMethod;
  amount: number;
  payment_processor?: string;
  processor_transaction_id?: string;
  processor_payment_id?: string;
  status: PaymentStatus;
  payment_date?: Date;
  completed_at?: Date;
  failed_at?: Date;
  failure_reason?: string;
  metadata?: any;

  // Gift card fields
  gift_card_id?: string;

  created_at: Date;
  updated_at: Date;
}

export interface PaymentDetails {
  id: string;
  payment_id: string;

  // Check payment fields
  check_number?: string;

  // Cash payment fields
  cash_received?: number;
  cash_change?: number;

  // Card payment fields
  card_last_four?: string;
  card_type?: string;
  authorization_code?: string;

  created_at: Date;
}

export interface CreatePaymentParams {
  payment_method: PaymentMethod;
  amount: number;
  payment_details?: PaymentDetailParams;
}

// Payment detail params for each method
export type PaymentDetailParams =
  | CashPaymentDetails
  | CardPaymentDetails
  | GiftCardPaymentDetails
  | CheckPaymentDetails;

// Cash payment details
export interface CashPaymentDetails {
  cash_received: number;
  cash_change?: number;
}

// Card payment details (for credit/debit cards)
export interface CardPaymentDetails {
  card_token: string; // From payment processor
  cardholder_name?: string;
  card_last_four?: string;
  card_type?: string; // 'visa', 'mastercard', 'amex', 'discover'
  entry_method?: 'keyed' | 'swiped' | 'chip' | 'contactless';
  processor_name?: string; // 'square', 'stripe', 'mock'
}

// Gift card payment details
export interface GiftCardPaymentDetails {
  gift_card_number: string;
  previous_balance?: number;
  new_balance?: number;
}

// Check payment details
export interface CheckPaymentDetails {
  check_number: string;
  bank_name?: string;
  check_date?: string;
}

// Payment Authorization (for card payments)
export interface PaymentAuthorization {
  id: string;
  payment_id: string;
  processor_name: string;

  // Authorization
  authorization_id?: string;
  authorization_code?: string;
  authorization_amount: number;
  authorized_at?: Date;

  // Capture
  capture_id?: string;
  capture_amount?: number;
  captured_at?: Date;

  // Void/Refund
  void_id?: string;
  voided_at?: Date;
  refund_id?: string;
  refund_amount?: number;
  refunded_at?: Date;

  // Status
  status: 'pending' | 'authorized' | 'captured' | 'voided' | 'refunded' | 'failed';

  // Response
  processor_response?: any;
  failure_reason?: string;

  created_at: Date;
  updated_at: Date;
}
