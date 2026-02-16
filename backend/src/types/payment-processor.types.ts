/**
 * Payment Processor Types for Phase 4B
 * Interface for card payment processors (Square, Stripe, Mock)
 */

export interface IPaymentProcessor {
  name: string; // 'square', 'stripe', 'mock'

  // Card payments
  authorizePayment(params: AuthorizePaymentParams): Promise<AuthorizationResponse>;
  capturePayment(authorizationId: string, amount: number): Promise<CaptureResponse>;
  voidPayment(authorizationId: string): Promise<VoidResponse>;
  refundPayment(paymentId: string, amount: number): Promise<RefundResponse>;

  // Tokenization (typically done client-side, but interface included for completeness)
  createCardToken?(cardData: CardData): Promise<string>; // Returns token

  // Validation
  validateCard(cardNumber: string): boolean;
  getCardBrand(cardNumber: string): string; // 'visa', 'mastercard', 'amex', 'discover', 'unknown'
}

export interface AuthorizePaymentParams {
  amount: number;
  cardToken: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface AuthorizationResponse {
  success: boolean;
  authorizationId: string;
  authorizationCode?: string;
  status: 'authorized' | 'declined' | 'error';
  message?: string;
  processorResponse: any;
}

export interface CaptureResponse {
  success: boolean;
  paymentId: string;
  captureId: string;
  amount: number;
  status: 'captured' | 'failed';
  message?: string;
  processorResponse: any;
}

export interface VoidResponse {
  success: boolean;
  voidId: string;
  status: 'voided' | 'failed';
  message?: string;
  processorResponse: any;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'refunded' | 'failed';
  message?: string;
  processorResponse: any;
}

export interface CardData {
  number: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  cardholder_name?: string;
  zip_code?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  authorizationId?: string;
  authorizationCode?: string;
  processorResponse?: any;
  error?: string;
}

// Mock processor-specific types
export interface MockProcessorConfig {
  shouldSucceed?: boolean; // For testing failures
  delay?: number; // Simulate processing time
  declineReason?: string; // Simulate specific decline reasons
}
