/**
 * Mock Payment Processor for Testing
 * Simulates card payment processing without external API calls
 */

import {
  IPaymentProcessor,
  AuthorizePaymentParams,
  AuthorizationResponse,
  CaptureResponse,
  VoidResponse,
  RefundResponse,
  CardData,
  MockProcessorConfig,
} from '../../types/payment-processor.types';
import { v4 as uuidv4 } from 'uuid';

export class MockPaymentProcessor implements IPaymentProcessor {
  name = 'mock';
  private config: MockProcessorConfig;

  constructor(config: MockProcessorConfig = {}) {
    this.config = {
      shouldSucceed: config.shouldSucceed ?? true,
      delay: config.delay ?? 100,
      declineReason: config.declineReason,
    };
  }

  /**
   * Authorize a payment
   */
  async authorizePayment(params: AuthorizePaymentParams): Promise<AuthorizationResponse> {
    // Simulate processing delay
    await this.delay();

    // Check if should succeed
    if (!this.config.shouldSucceed) {
      return {
        success: false,
        authorizationId: '',
        status: 'declined',
        message: this.config.declineReason || 'Card declined',
        processorResponse: {
          error: this.config.declineReason || 'Card declined',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Generate mock authorization
    const authId = `mock_auth_${uuidv4().substring(0, 8)}`;
    const authCode = this.generateAuthCode();

    return {
      success: true,
      authorizationId: authId,
      authorizationCode: authCode,
      status: 'authorized',
      message: 'Payment authorized successfully',
      cardBrand: this.getCardBrandFromToken(params.cardToken),
      cardLast4: this.getCardLast4FromToken(params.cardToken),
      amount: params.amount,
      processorResponse: {
        authorizationId: authId,
        authorizationCode: authCode,
        amount: params.amount,
        currency: params.currency || 'USD',
        timestamp: new Date().toISOString(),
        cardBrand: this.getCardBrandFromToken(params.cardToken),
        cardLast4: this.getCardLast4FromToken(params.cardToken),
      },
    };
  }

  /**
   * Capture a previously authorized payment
   */
  async capturePayment(authorizationId: string, amount: number): Promise<CaptureResponse> {
    await this.delay();

    if (!this.config.shouldSucceed) {
      return {
        success: false,
        paymentId: '',
        captureId: '',
        amount: 0,
        status: 'failed',
        message: 'Capture failed',
        processorResponse: {
          error: 'Capture failed',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const captureId = `mock_capture_${uuidv4().substring(0, 8)}`;
    const paymentId = `mock_payment_${uuidv4().substring(0, 8)}`;

    return {
      success: true,
      paymentId,
      captureId,
      amount,
      status: 'captured',
      message: 'Payment captured successfully',
      processorResponse: {
        captureId,
        paymentId,
        authorizationId,
        amount,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Void a previously authorized payment
   */
  async voidPayment(authorizationId: string): Promise<VoidResponse> {
    await this.delay();

    if (!this.config.shouldSucceed) {
      return {
        success: false,
        voidId: '',
        status: 'failed',
        message: 'Void failed',
        processorResponse: {
          error: 'Void failed',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const voidId = `mock_void_${uuidv4().substring(0, 8)}`;

    return {
      success: true,
      voidId,
      status: 'voided',
      message: 'Payment voided successfully',
      processorResponse: {
        voidId,
        authorizationId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(paymentId: string, amount: number): Promise<RefundResponse> {
    await this.delay();

    if (!this.config.shouldSucceed) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        status: 'failed',
        message: 'Refund failed',
        processorResponse: {
          error: 'Refund failed',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const refundId = `mock_refund_${uuidv4().substring(0, 8)}`;

    return {
      success: true,
      refundId,
      amount,
      status: 'refunded',
      message: 'Payment refunded successfully',
      processorResponse: {
        refundId,
        paymentId,
        amount,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create card token (mock implementation)
   */
  async createCardToken(cardData: CardData): Promise<string> {
    await this.delay();

    // Validate card
    if (!this.validateCard(cardData.number)) {
      throw new Error('Invalid card number');
    }

    const brand = this.getCardBrand(cardData.number);
    const last4 = cardData.number.slice(-4);

    return `mock_tok_${brand}_${last4}_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Validate card number using Luhn algorithm
   */
  validateCard(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');

    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
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

    if (/^4/.test(cleaned)) {
      return 'visa';
    } else if (/^5[1-5]/.test(cleaned)) {
      return 'mastercard';
    } else if (/^3[47]/.test(cleaned)) {
      return 'amex';
    } else if (/^6(?:011|5)/.test(cleaned)) {
      return 'discover';
    }

    return 'unknown';
  }

  /**
   * Helper: Simulate processing delay
   */
  private async delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.config.delay));
  }

  /**
   * Helper: Generate mock authorization code
   */
  private generateAuthCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Helper: Extract card brand from mock token
   */
  private getCardBrandFromToken(token: string): string {
    const match = token.match(/mock_tok_([a-z]+)_/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Helper: Extract last 4 digits from mock token
   */
  private getCardLast4FromToken(token: string): string {
    const match = token.match(/mock_tok_\w+_(\d{4})_/);
    return match ? match[1] : '0000';
  }
}
