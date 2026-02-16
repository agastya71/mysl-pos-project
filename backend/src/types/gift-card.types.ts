/**
 * Gift Card Types for Phase 4B
 * Gift card creation, balance tracking, and redemption
 */

export interface GiftCard {
  id: string;
  gift_card_number: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;

  // Purchase information
  purchased_transaction_id?: string;
  purchased_by_customer_id?: string;
  purchased_at?: Date;

  // Recipient information
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;

  // Activation
  activated_at?: Date;
  activated_by_user_id?: string;

  // Expiration
  expires_at?: Date;

  // Tracking
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGiftCardParams {
  initial_balance: number;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  expires_at?: Date | string;
  purchased_by_customer_id?: string;
  purchased_transaction_id?: string;
}

export interface UpdateGiftCardParams {
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  expires_at?: Date | string;
  is_active?: boolean;
}

export interface GiftCardTransaction {
  id: string;
  gift_card_id: string;
  transaction_id?: string;
  transaction_type: 'purchase' | 'redemption' | 'adjustment' | 'expiration';
  amount: number;
  balance_before: number;
  balance_after: number;
  notes?: string;
  created_by_user_id?: string;
  created_at: Date;
}

export interface RedemptionResult {
  success: boolean;
  previous_balance: number;
  amount_redeemed: number;
  new_balance: number;
  gift_card: GiftCard;
}

export interface GiftCardFilters {
  is_active?: boolean;
  purchased_by_customer_id?: string;
  min_balance?: number;
  max_balance?: number;
  page?: number;
  limit?: number;
  search?: string; // Search by gift card number
}

export interface AdjustBalanceParams {
  gift_card_id: string;
  amount: number; // Positive to add, negative to subtract
  reason: string;
  user_id: string;
}

export interface GiftCardBalanceResponse {
  gift_card_number: string;
  current_balance: number;
  is_active: boolean;
  expires_at?: Date;
}
