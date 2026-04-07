import redis from './redis';
import { REDIS_PREFIX } from '../constants';

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(`${REDIS_PREFIX.cache}${key}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, data: any, ttlSeconds: number = 30): Promise<void> {
  try {
    await redis.set(`${REDIS_PREFIX.cache}${key}`, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {}
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(`${REDIS_PREFIX.cache}${key}`);
  } catch {}
}
