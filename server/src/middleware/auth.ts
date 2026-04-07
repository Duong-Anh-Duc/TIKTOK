import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import type { JwtPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const t = (req as any).t;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(
        t ? t('auth.tokenRequired') : 'Authentication required',
        401,
      );
    }

    const token = authHeader.split(' ')[1];

    // Check token blacklist (logged out tokens)
    if (await isTokenBlacklisted(token)) {
      throw new AppError(
        t ? t('auth.tokenRequired') : 'Authentication required',
        401,
      );
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError(
      t ? t('auth.invalidToken') : 'Invalid or expired token',
      401,
    ));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const t = (req as any).t;

    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError(
        t ? t('auth.insufficientPermissions') : 'Insufficient permissions',
        403,
      ));
    }
    next();
  };
};
