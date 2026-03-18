/**
 * Terminal Service — Square Terminal checkout management
 *
 * Creates checkouts on a physical Square Terminal device and polls for status.
 * Env vars required:
 *   SQUARE_ACCESS_TOKEN   — Square API access token
 *   SQUARE_ENVIRONMENT    — 'sandbox' | 'production' (default: sandbox)
 *   SQUARE_DEVICE_ID      — Physical Square Terminal device ID
 */

import { SquareClient, SquareEnvironment, Currency } from 'square';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

export type TerminalCheckoutStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CANCEL_REQUESTED'
  | 'CANCELED'
  | 'COMPLETED';

export interface TerminalCheckoutResult {
  status: TerminalCheckoutStatus;
  paymentId?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export class TerminalService {
  private getClient(): SquareClient {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      throw new AppError(503, 'SQUARE_NOT_CONFIGURED', 'Square is not configured on this server');
    }
    const environment =
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox;
    return new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN, environment });
  }

  private getDeviceId(): string {
    const deviceId = process.env.SQUARE_DEVICE_ID;
    if (!deviceId) {
      throw new AppError(
        503,
        'SQUARE_DEVICE_NOT_CONFIGURED',
        'SQUARE_DEVICE_ID is not configured — cannot initiate Terminal checkout'
      );
    }
    return deviceId;
  }

  /**
   * Creates a TerminalCheckout on the physical Square Terminal device.
   * The customer taps/dips/swipes on the device; we poll for completion.
   */
  async createCheckout(
    amount: number,
    idempotencyKey: string
  ): Promise<{ checkoutId: string }> {
    const client = this.getClient();
    const deviceId = this.getDeviceId();

    const amountCents = BigInt(Math.round(amount * 100));

    logger.info('Creating Square Terminal checkout', { amount, deviceId });

    const response = await client.terminal.checkouts.create({
      idempotencyKey,
      checkout: {
        amountMoney: {
          amount: amountCents,
          currency: Currency.Usd,
        },
        deviceOptions: {
          deviceId,
        },
      },
    });

    const checkoutId = response.checkout?.id;
    if (!checkoutId) {
      throw new AppError(502, 'TERMINAL_CHECKOUT_FAILED', 'Square Terminal did not return a checkout ID');
    }

    logger.info('Terminal checkout created', { checkoutId });
    return { checkoutId };
  }

  /**
   * Polls the status of an existing TerminalCheckout.
   */
  async getCheckoutStatus(checkoutId: string): Promise<TerminalCheckoutResult> {
    const client = this.getClient();

    const response = await client.terminal.checkouts.get({ checkoutId });
    const checkout = response.checkout;

    if (!checkout) {
      throw new AppError(404, 'TERMINAL_CHECKOUT_NOT_FOUND', `Terminal checkout ${checkoutId} not found`);
    }

    const status = (checkout.status as TerminalCheckoutStatus) ?? 'PENDING';
    const result: TerminalCheckoutResult = { status };

    if (status === 'COMPLETED') {
      const paymentId = checkout.paymentIds?.[0];
      if (paymentId) result.paymentId = paymentId;

      const card = (checkout as any).cardDetails?.card;
      if (card?.last4) result.cardLast4 = card.last4;
      if (card?.cardBrand) result.cardBrand = this.normalizeBrand(card.cardBrand);
    }

    return result;
  }

  /**
   * Cancels an in-progress TerminalCheckout.
   */
  async cancelCheckout(checkoutId: string): Promise<void> {
    const client = this.getClient();
    await client.terminal.checkouts.cancel({ checkoutId });
    logger.info('Terminal checkout cancelled', { checkoutId });
  }

  private normalizeBrand(squareBrand: string): string {
    const map: Record<string, string> = {
      VISA: 'Visa',
      MASTERCARD: 'Mastercard',
      AMERICAN_EXPRESS: 'Amex',
      DISCOVER: 'Discover',
    };
    return map[squareBrand] ?? squareBrand;
  }
}

export default new TerminalService();
