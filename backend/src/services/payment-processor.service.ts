/**
 * Payment Processor Service
 * Factory/adapter service for managing multiple payment processors
 */

import {
  IPaymentProcessor,
  PaymentResult,
} from '../types/payment-processor.types';
import { MockPaymentProcessor } from './payment-processor/MockPaymentProcessor';
import { AppError } from '../utils/errors';

export class PaymentProcessorService {
  private processors: Map<string, IPaymentProcessor>;
  private defaultProcessor: string;

  constructor() {
    this.processors = new Map();
    this.defaultProcessor = process.env.PAYMENT_PROCESSOR || 'mock';

    // Initialize Mock processor (always available for testing)
    this.processors.set('mock', new MockPaymentProcessor());

    // TODO: Initialize Square processor when implemented
    // if (process.env.SQUARE_ACCESS_TOKEN) {
    //   this.processors.set('square', new SquarePaymentProcessor());
    // }

    // TODO: Initialize Stripe processor when implemented
    // if (process.env.STRIPE_SECRET_KEY) {
    //   this.processors.set('stripe', new StripePaymentProcessor());
    // }
  }

  /**
   * Get payment processor by name
   */
  getProcessor(name?: string): IPaymentProcessor {
    const processorName = name || this.defaultProcessor;
    const processor = this.processors.get(processorName);

    if (!processor) {
      throw new AppError(
        'PROCESSOR_NOT_FOUND',
        `Payment processor "${processorName}" not found or not configured`,
        400
      );
    }

    return processor;
  }

  /**
   * Process card payment (authorize + capture)
   */
  async processCardPayment(
    amount: number,
    cardToken: string,
    processorName?: string,
    metadata?: any
  ): Promise<PaymentResult> {
    const processor = this.getProcessor(processorName);

    try {
      // Step 1: Authorize payment
      const authResult = await processor.authorizePayment({
        amount,
        cardToken,
        currency: 'USD',
        metadata,
      });

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.message || 'Payment authorization failed',
        };
      }

      // Step 2: Capture payment (immediate for POS)
      const captureResult = await processor.capturePayment(
        authResult.authorizationId,
        amount
      );

      if (!captureResult.success) {
        // Try to void the authorization if capture fails
        try {
          await processor.voidPayment(authResult.authorizationId);
        } catch (voidError) {
          // Log void error but don't fail the response
          console.error('Failed to void authorization after capture failure:', voidError);
        }

        return {
          success: false,
          error: captureResult.message || 'Payment capture failed',
        };
      }

      // Success
      return {
        success: true,
        paymentId: captureResult.paymentId,
        authorizationId: authResult.authorizationId,
        authorizationCode: authResult.authorizationCode,
        processorResponse: {
          authorization: authResult.processorResponse,
          capture: captureResult.processorResponse,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment processing error',
      };
    }
  }

  /**
   * Void a payment
   */
  async voidPayment(
    authorizationId: string,
    processorName?: string
  ): Promise<PaymentResult> {
    const processor = this.getProcessor(processorName);

    try {
      const voidResult = await processor.voidPayment(authorizationId);

      if (!voidResult.success) {
        return {
          success: false,
          error: voidResult.message || 'Void failed',
        };
      }

      return {
        success: true,
        processorResponse: voidResult.processorResponse,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Void processing error',
      };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string,
    amount: number,
    processorName?: string
  ): Promise<PaymentResult> {
    const processor = this.getProcessor(processorName);

    try {
      const refundResult = await processor.refundPayment(paymentId, amount);

      if (!refundResult.success) {
        return {
          success: false,
          error: refundResult.message || 'Refund failed',
        };
      }

      return {
        success: true,
        processorResponse: refundResult.processorResponse,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Refund processing error',
      };
    }
  }

  /**
   * Validate card number
   */
  validateCard(cardNumber: string, processorName?: string): boolean {
    const processor = this.getProcessor(processorName);
    return processor.validateCard(cardNumber);
  }

  /**
   * Get card brand
   */
  getCardBrand(cardNumber: string, processorName?: string): string {
    const processor = this.getProcessor(processorName);
    return processor.getCardBrand(cardNumber);
  }

  /**
   * List available processors
   */
  getAvailableProcessors(): string[] {
    return Array.from(this.processors.keys());
  }
}
