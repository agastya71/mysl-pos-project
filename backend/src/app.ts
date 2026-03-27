import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import webhookRoutes from './routes/webhook.routes';

export const createApp = (): Application => {
  const app = express();

  // Configure CORS with specific allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3001'];

  // Square webhook must receive raw body for HMAC signature verification.
  // Register BEFORE express.json() so the body isn't parsed yet.
  app.use(
    '/api/v1/webhooks/square',
    express.raw({ type: 'application/json' }),
    webhookRoutes
  );

  app.use(helmet());
  app.use(cookieParser());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // Required for httpOnly cookies (ISSUE-002)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Rate limiting - applied to all API routes
  app.use('/api/v1', apiLimiter);

  app.use('/health', healthRoutes);
  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
