import redis from './redis';
import { logger } from './logger';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION, ATTEMPT_WINDOW } from '../constants';
import { REDIS_PREFIX } from '../constants';

function attemptsKey(email: string) {
  return `${REDIS_PREFIX.loginAttempts}${email.toLowerCase()}`;
}

function lockKey(email: string) {
  return `${REDIS_PREFIX.loginLocked}${email.toLowerCase()}`;
}

export async function isAccountLocked(email: string): Promise<{ locked: boolean; remainingSeconds: number }> {
  try {
    const ttl = await redis.ttl(lockKey(email));
    if (ttl > 0) {
      return { locked: true, remainingSeconds: ttl };
    }
    return { locked: false, remainingSeconds: 0 };
  } catch {
    return { locked: false, remainingSeconds: 0 };
  }
}

export async function recordFailedAttempt(email: string): Promise<{ locked: boolean; attempts: number; remainingSeconds: number }> {
  try {
    const key = attemptsKey(email);
    const attempts = await redis.incr(key);

    if (attempts === 1) {
      await redis.expire(key, ATTEMPT_WINDOW);
    }

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await redis.set(lockKey(email), '1', 'EX', LOCK_DURATION);
      await redis.del(key);
      logger.warn(`[Auth] Account locked: ${email} (${MAX_LOGIN_ATTEMPTS} failed attempts)`);
      return { locked: true, attempts, remainingSeconds: LOCK_DURATION };
    }

    return { locked: false, attempts, remainingSeconds: 0 };
  } catch {
    return { locked: false, attempts: 0, remainingSeconds: 0 };
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    await redis.del(attemptsKey(email));
  } catch {}
}
