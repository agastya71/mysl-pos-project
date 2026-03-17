/**
 * Webhook Routes
 *
 * POST /api/v1/webhooks/square — Square webhook endpoint.
 *
 * No JWT auth — Square authenticates via HMAC-SHA256 signature.
 * Must receive raw body for signature verification (express.raw middleware).
 */

import { Router, Request, Response } from 'express';
import webhookService from '../services/webhook.service';
import logger from '../utils/logger';

const router = Router();

router.post(
  '/square',
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const signatureHeader = req.headers['x-square-hmacsha256-signature'] as string | undefined;

        if (!signatureHeader) {
          logger.warn('Square webhook received without signature header');
          res.status(400).json({ error: 'Missing signature' });
          return;
        }

        // req.body is raw Buffer because the route is registered with express.raw()
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);

        // Build the full URL Square signed against
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const webhookUrl = `${protocol}://${host}${req.originalUrl}`;

        const isValid = webhookService.verifySquareSignature(rawBody, signatureHeader, webhookUrl);
        if (!isValid) {
          logger.warn('Square webhook signature verification failed');
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }

        const payload = JSON.parse(rawBody);
        const eventType: string = payload.type || '';

        // Process asynchronously but respond quickly to Square
        webhookService.handleEvent(eventType, payload.data).catch((err) => {
          logger.error('Webhook event handling error', { err });
        });

        res.status(200).json({ received: true });
      } catch (err) {
        logger.error('Webhook route error', { err });
        res.status(500).json({ error: 'Internal error' });
      }
    })();
  }
);

export default router;
