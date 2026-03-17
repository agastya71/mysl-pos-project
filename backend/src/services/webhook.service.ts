/**
 * Webhook Service — Square webhook signature verification and event handling
 *
 * Env var required: SQUARE_WEBHOOK_SIGNATURE_KEY
 */

import crypto from 'crypto';
import { pool } from '../config/database';
import logger from '../utils/logger';

export class WebhookService {
  /**
   * Verify the HMAC-SHA256 signature Square sends in x-square-hmacsha256-signature.
   * Returns true only when the computed digest matches the header.
   */
  verifySquareSignature(rawBody: string, signatureHeader: string, webhookUrl: string): boolean {
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!key) {
      logger.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured — rejecting webhook');
      return false;
    }

    // Square's expected format: HMAC-SHA256(key, notification_url + raw_body)
    const message = webhookUrl + rawBody;
    const expected = crypto
      .createHmac('sha256', key)
      .update(message, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'base64'),
      Buffer.from(signatureHeader, 'base64')
    );
  }

  /**
   * Dispatch event to the appropriate handler based on event type.
   */
  async handleEvent(eventType: string, eventData: any): Promise<void> {
    logger.info('Processing Square webhook', { eventType });

    switch (eventType) {
      case 'payment.completed':
        await this.handlePaymentCompleted(eventData);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(eventData);
        break;
      case 'refund.completed':
        await this.handleRefundCompleted(eventData);
        break;
      default:
        logger.debug('Unhandled Square webhook event type', { eventType });
    }
  }

  private async handlePaymentCompleted(eventData: any): Promise<void> {
    const payment = eventData?.object?.payment;
    if (!payment?.id) return;

    try {
      await pool.query(
        `UPDATE payment_authorizations
         SET status = 'captured', captured_at = NOW(), updated_at = NOW()
         WHERE processor_authorization_id = $1`,
        [payment.id]
      );
      logger.info('payment_authorizations updated: captured', { squarePaymentId: payment.id });
    } catch (err) {
      logger.error('handlePaymentCompleted DB update failed', { err });
    }
  }

  private async handlePaymentFailed(eventData: any): Promise<void> {
    const payment = eventData?.object?.payment;
    if (!payment?.id) return;

    try {
      await pool.query(
        `UPDATE payment_authorizations
         SET status = 'failed', updated_at = NOW()
         WHERE processor_authorization_id = $1`,
        [payment.id]
      );
      logger.info('payment_authorizations updated: failed', { squarePaymentId: payment.id });
    } catch (err) {
      logger.error('handlePaymentFailed DB update failed', { err });
    }
  }

  private async handleRefundCompleted(eventData: any): Promise<void> {
    const refund = eventData?.object?.refund;
    if (!refund?.id) return;

    try {
      await pool.query(
        `UPDATE refunds
         SET status = 'completed', updated_at = NOW()
         WHERE processor_refund_id = $1`,
        [refund.id]
      );
      logger.info('refunds updated: completed', { squareRefundId: refund.id });
    } catch (err) {
      logger.error('handleRefundCompleted DB update failed', { err });
    }
  }
}

export default new WebhookService();
