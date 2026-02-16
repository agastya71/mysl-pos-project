import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 * Applied to all API routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Login rate limiter
 * Limits: 5 attempts per 15 minutes per IP
 * Applied to login and register endpoints
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count both successful and failed requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many login attempts from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Token refresh rate limiter
 * Limits: 30 refresh requests per 15 minutes per IP
 * Applied to token refresh endpoint
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 refresh requests per windowMs
  message: {
    error: 'Too many token refresh requests, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many token refresh requests, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});
