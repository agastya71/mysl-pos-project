/**
 * Square Payment Processor
 * Implements IPaymentProcessor using the Square SDK
 *
 * Reads env vars:
 *   SQUARE_ACCESS_TOKEN   - Square API access token
 *   SQUARE_ENVIRONMENT    - 'sandbox' | 'production' (default: 'sandbox')
 *   SQUARE_LOCATION_ID    - Square location ID for payments
 */

import {
  SquareClient,
  SquareEnvironment,
  SquareError,
  Currency,
} from 'square';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentProcessor,
  AuthorizePaymentParams,
  AuthorizationResponse,
  CaptureResponse,
  VoidResponse,
  RefundResponse,
  CardData,
} from '../../types/payment-processor.types';
import logger from '../../utils/logger';

export class SquarePaymentProcessor implements IPaymentProcessor {
  name = 'square';
  private client: SquareClient;
  private locationId: string;

  constructor() {
    const environment = process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

    this.client = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
      environment,
    });

    this.locationId = process.env.SQUARE_LOCATION_ID!;
  }

  /**
   * Authorize + capture payment in one step (Square's "CreatePayment" is authorize+capture).
   * We store the payment ID as the authorizationId so capturePayment can look it up.
   */
  async authorizePayment(params: AuthorizePaymentParams): Promise<AuthorizationResponse> {
    try {
      const idempotencyKey = params.idempotencyKey || uuidv4();
      const currency: Currency = (params.currency as Currency) || Currency.Usd;

      const response = await this.client.payments.create({
        sourceId: params.cardToken,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(Math.round(params.amount * 100)),
          currency,
        },
        locationId: this.locationId,
        autocomplete: false, // authorize only
      });

      const payment = response.payment!;
      const cardDetails = payment.cardDetails;

      return {
        success: true,
        authorizationId: payment.id!,
        authorizationCode: cardDetails?.authResultCode || undefined,
        status: 'authorized',
        message: 'Payment authorized successfully',
        cardLast4: cardDetails?.card?.last4 || undefined,
        cardBrand: this.normalizeCardBrand(cardDetails?.card?.cardBrand),
        amount: params.amount,
        processorResponse: payment,
      };
    } catch (error: unknown) {
      logger.error('Square authorizePayment failed', { error });
      return {
        success: false,
        authorizationId: '',
        status: 'error',
        message: this.extractErrorMessage(error),
        processorResponse: error,
      };
    }
  }

  /**
   * Capture a previously authorized payment (Square: CompletePayment)
   */
  async capturePayment(authorizationId: string, amount: number): Promise<CaptureResponse> {
    try {
      const response = await this.client.payments.complete({ paymentId: authorizationId });

      const payment = response.payment!;

      return {
        success: true,
        paymentId: payment.id!,
        captureId: payment.id!,
        amount,
        status: 'captured',
        message: 'Payment captured successfully',
        processorResponse: payment,
      };
    } catch (error: unknown) {
      logger.error('Square capturePayment failed', { error });
      return {
        success: false,
        paymentId: '',
        captureId: '',
        amount: 0,
        status: 'failed',
        message: this.extractErrorMessage(error),
        processorResponse: error,
      };
    }
  }

  /**
   * Void (cancel) an authorized payment before capture
   */
  async voidPayment(authorizationId: string): Promise<VoidResponse> {
    try {
      const response = await this.client.payments.cancel({ paymentId: authorizationId });

      const payment = response.payment!;

      return {
        success: true,
        voidId: payment.id!,
        status: 'voided',
        message: 'Payment voided successfully',
        processorResponse: payment,
      };
    } catch (error: unknown) {
      logger.error('Square voidPayment failed', { error });
      return {
        success: false,
        voidId: '',
        status: 'failed',
        message: this.extractErrorMessage(error),
        processorResponse: error,
      };
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(paymentId: string, amount: number): Promise<RefundResponse> {
    try {
      const idempotencyKey = uuidv4();

      const response = await this.client.refunds.refundPayment({
        paymentId,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(Math.round(amount * 100)),
          currency: Currency.Usd,
        },
      });

      const refund = response.refund!;

      return {
        success: true,
        refundId: refund.id!,
        amount,
        status: 'refunded',
        message: 'Payment refunded successfully',
        processorResponse: refund,
      };
    } catch (error: unknown) {
      logger.error('Square refundPayment failed', { error });
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        message: this.extractErrorMessage(error),
        processorResponse: error,
      };
    }
  }

  /**
   * Create a card token (Square handles this client-side via Web Payments SDK;
   * this method is not used in production — card tokens come from the frontend)
   */
  async createCardToken(_cardData: CardData): Promise<string> {
    throw new Error(
      'Square card tokenization must be done client-side using the Square Web Payments SDK. ' +
      'Pass the nonce returned by the SDK as the card token.'
    );
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(cleaned)) return false;

    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }

  /**
   * Get card brand from card number
   */
  getCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'unknown';
  }

  /**
   * Normalize Square card brand strings to our internal format
   */
  private normalizeCardBrand(squareBrand?: string): string {
    if (!squareBrand) return 'unknown';
    const map: Record<string, string> = {
      VISA: 'visa',
      MASTERCARD: 'mastercard',
      AMERICAN_EXPRESS: 'amex',
      DISCOVER: 'discover',
      DISCOVER_DINERS: 'discover',
      JCB: 'jcb',
      CHINA_UNIONPAY: 'unionpay',
    };
    return map[squareBrand] || squareBrand.toLowerCase();
  }

  /**
   * Extract error message from Square SquareError or generic error
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof SquareError) {
      const errs = (error as any).errors;
      if (errs && Array.isArray(errs) && errs.length > 0) {
        return errs.map((e: any) => e.detail || e.category).join('; ');
      }
      return (error as Error).message;
    }
    if (error instanceof Error) return error.message;
    return 'Square payment processing error';
  }
}
