/**
 * Gift Card Service
 * Business logic for gift card management
 */

import { pool } from '../config/database';
import {
  GiftCard,
  CreateGiftCardParams,
  UpdateGiftCardParams,
  GiftCardTransaction,
  RedemptionResult,
  GiftCardFilters,
  AdjustBalanceParams,
  GiftCardBalanceResponse,
} from '../types/gift-card.types';
import { AppError } from '../middleware/error.middleware';

export class GiftCardService {
  /**
   * Create new gift card
   */
  async createGiftCard(params: CreateGiftCardParams): Promise<GiftCard> {
    const {
      initial_balance,
      recipient_name,
      recipient_email,
      recipient_phone,
      expires_at,
      purchased_by_customer_id,
      purchased_transaction_id,
    } = params;

    // Validate initial balance
    if (initial_balance <= 0) {
      throw new AppError(
        400,
        'INVALID_AMOUNT',
        'Initial balance must be greater than zero'
      );
    }

    const query = `
      INSERT INTO gift_cards (
        initial_balance,
        current_balance,
        recipient_name,
        recipient_email,
        recipient_phone,
        expires_at,
        purchased_by_customer_id,
        purchased_transaction_id,
        purchased_at,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, true)
      RETURNING *
    `;

    const values = [
      initial_balance,
      initial_balance, // current_balance starts equal to initial_balance
      recipient_name,
      recipient_email,
      recipient_phone,
      expires_at,
      purchased_by_customer_id,
      purchased_transaction_id,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      throw new AppError(500, 'CREATE_FAILED', 'Failed to create gift card');
    }

    return result.rows[0];
  }

  /**
   * Get gift card by ID
   */
  async getGiftCardById(id: string): Promise<GiftCard | null> {
    const query = 'SELECT * FROM gift_cards WHERE id = $1';
    const result = await pool.query(query, [id]);

    return result.rowCount ? result.rows[0] : null;
  }

  /**
   * Get gift card by gift card number
   */
  async getGiftCardByNumber(giftCardNumber: string): Promise<GiftCard | null> {
    const query = 'SELECT * FROM gift_cards WHERE gift_card_number = $1';
    const result = await pool.query(query, [giftCardNumber]);

    return result.rowCount ? result.rows[0] : null;
  }

  /**
   * Check gift card balance
   */
  async checkBalance(giftCardNumber: string): Promise<GiftCardBalanceResponse> {
    const giftCard = await this.getGiftCardByNumber(giftCardNumber);

    if (!giftCard) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    if (!giftCard.is_active) {
      throw new AppError(400, 'GIFT_CARD_INACTIVE', 'Gift card is inactive');
    }

    return {
      gift_card_number: giftCard.gift_card_number,
      current_balance: giftCard.current_balance,
      is_active: giftCard.is_active,
      expires_at: giftCard.expires_at,
    };
  }

  /**
   * Redeem gift card (validate only, actual redemption happens via payment trigger)
   */
  async validateRedemption(
    giftCardNumber: string,
    amount: number
  ): Promise<RedemptionResult> {
    const giftCard = await this.getGiftCardByNumber(giftCardNumber);

    if (!giftCard) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    if (!giftCard.is_active) {
      throw new AppError(400, 'GIFT_CARD_INACTIVE', 'Gift card is inactive');
    }

    // Check if expired
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      throw new AppError(400, 'GIFT_CARD_EXPIRED', 'Gift card has expired');
    }

    // Check sufficient balance
    if (giftCard.current_balance < amount) {
      throw new AppError(400, 'INSUFFICIENT_BALANCE', `Gift card balance ($${giftCard.current_balance.toFixed(2)}) is less than redemption amount ($${amount.toFixed(2)})`);
    }

    return {
      success: true,
      previous_balance: giftCard.current_balance,
      amount_redeemed: amount,
      new_balance: giftCard.current_balance - amount,
      gift_card: giftCard,
    };
  }

  /**
   * Adjust gift card balance (for corrections, bonuses, etc.)
   */
  async adjustBalance(params: AdjustBalanceParams): Promise<GiftCard> {
    const { gift_card_id, amount, reason, user_id } = params;

    // Get current gift card
    const giftCard = await this.getGiftCardById(gift_card_id);

    if (!giftCard) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    // Check if adjustment would cause negative balance
    const newBalance = giftCard.current_balance + amount;
    if (newBalance < 0) {
      throw new AppError(400, 'INVALID_ADJUSTMENT', 'Adjustment would result in negative balance');
    }

    // Update balance
    const updateQuery = `
      UPDATE gift_cards
      SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, [amount, gift_card_id]);

    if (updateResult.rowCount === 0) {
      throw new AppError(500, 'UPDATE_FAILED', 'Failed to adjust balance');
    }

    // Record adjustment in audit trail
    const auditQuery = `
      INSERT INTO gift_card_transactions (
        gift_card_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        notes,
        created_by_user_id
      )
      VALUES ($1, 'adjustment', $2, $3, $4, $5, $6)
    `;

    await pool.query(auditQuery, [
      gift_card_id,
      amount,
      giftCard.current_balance,
      newBalance,
      reason,
      user_id,
    ]);

    return updateResult.rows[0];
  }

  /**
   * Deactivate gift card
   */
  async deactivateGiftCard(id: string): Promise<void> {
    const query = `
      UPDATE gift_cards
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }
  }

  /**
   * Update gift card details (recipient info, expiration)
   */
  async updateGiftCard(id: string, params: UpdateGiftCardParams): Promise<GiftCard> {
    const { recipient_name, recipient_email, recipient_phone, expires_at, is_active } = params;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (recipient_name !== undefined) {
      updates.push(`recipient_name = $${paramIndex++}`);
      values.push(recipient_name);
    }
    if (recipient_email !== undefined) {
      updates.push(`recipient_email = $${paramIndex++}`);
      values.push(recipient_email);
    }
    if (recipient_phone !== undefined) {
      updates.push(`recipient_phone = $${paramIndex++}`);
      values.push(recipient_phone);
    }
    if (expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(expires_at);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      throw new AppError(400, 'NO_UPDATES', 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE gift_cards
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      throw new AppError(404, 'GIFT_CARD_NOT_FOUND', 'Gift card not found');
    }

    return result.rows[0];
  }

  /**
   * Get gift card transaction history
   */
  async getGiftCardHistory(giftCardId: string): Promise<GiftCardTransaction[]> {
    const query = `
      SELECT * FROM gift_card_transactions
      WHERE gift_card_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [giftCardId]);
    return result.rows;
  }

  /**
   * List gift cards with filters and pagination
   */
  async listGiftCards(filters: GiftCardFilters): Promise<{
    gift_cards: GiftCard[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      is_active,
      purchased_by_customer_id,
      min_balance,
      max_balance,
      search,
      page = 1,
      limit = 20,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (purchased_by_customer_id) {
      conditions.push(`purchased_by_customer_id = $${paramIndex++}`);
      values.push(purchased_by_customer_id);
    }

    if (min_balance !== undefined) {
      conditions.push(`current_balance >= $${paramIndex++}`);
      values.push(min_balance);
    }

    if (max_balance !== undefined) {
      conditions.push(`current_balance <= $${paramIndex++}`);
      values.push(max_balance);
    }

    if (search) {
      conditions.push(`gift_card_number ILIKE $${paramIndex++}`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM gift_cards ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT * FROM gift_cards
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await pool.query(dataQuery, dataValues);

    return {
      gift_cards: dataResult.rows,
      total,
      page,
      limit,
    };
  }
}
