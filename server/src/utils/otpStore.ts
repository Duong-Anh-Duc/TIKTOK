import redis from './redis';
import { logger } from './logger';
import { OTP_TTL } from '../constants';
import { REDIS_PREFIX } from '../constants';

const memoryFallback = new Map<string, { otp: string; expiresAt: number }>();

function redisKey(email: string) {
  return `${REDIS_PREFIX.otp}${email.toLowerCase()}`;
}

export const OtpStore = {
  async set(email: string, otp: string) {
    try {
      await redis.set(redisKey(email), otp, 'EX', OTP_TTL);
    } catch {
      logger.warn('[OtpStore] Redis unavailable, using memory fallback');
      memoryFallback.set(redisKey(email), { otp, expiresAt: Date.now() + OTP_TTL * 1000 });
    }
  },

  async get(email: string): Promise<string | null> {
    try {
      return await redis.get(redisKey(email));
    } catch {
      const entry = memoryFallback.get(redisKey(email));
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        memoryFallback.delete(redisKey(email));
        return null;
      }
      return entry.otp;
    }
  },

  async del(email: string) {
    try {
      await redis.del(redisKey(email));
    } catch {
      memoryFallback.delete(redisKey(email));
    }
  },

  async ttl(email: string): Promise<number> {
    try {
      const t = await redis.ttl(redisKey(email));
      return t > 0 ? t : 0;
    } catch {
      const entry = memoryFallback.get(redisKey(email));
      if (!entry) return 0;
      return Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000));
    }
  },
};
