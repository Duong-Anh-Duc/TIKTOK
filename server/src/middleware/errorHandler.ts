import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: Record<string, any>;

  constructor(message: string, statusCode: number = 500, data?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const t = (req as any).t;

  // Tự động dịch message nếu là i18n key (vd: "auth.loginFailed")
  const message = t
    ? t(err.message, { defaultValue: err.message })
    : err.message || 'Internal Server Error';

  logger.error(`[${statusCode}] ${message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    message,
    ...('data' in err && err.data ? { data: err.data } : {}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const t = (req as any).t;
  const message = t
    ? t('general.notFound', { method: req.method, url: req.originalUrl })
    : `${req.method} ${req.originalUrl} not found`;

  res.status(404).json({ success: false, message });
};
