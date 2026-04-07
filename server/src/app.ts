import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { i18nMiddleware } from './utils/i18n';
import { logger } from './utils/logger';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// i18n - detect language from Accept-Language header
app.use(i18nMiddleware);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
