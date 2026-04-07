import redis from './redis';
import { REDIS_PREFIX, TOKEN_BLACKLIST_TTL } from '../constants';

export async function blacklistToken(token: string, expiresInSeconds: number = TOKEN_BLACKLIST_TTL): Promise<void> {
  try {
    await redis.set(REDIS_PREFIX.tokenBlacklist + token, '1', 'EX', expiresInSeconds);
  } catch {}
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const val = await redis.get(REDIS_PREFIX.tokenBlacklist + token);
    return !!val;
  } catch {
    return false;
  }
}
