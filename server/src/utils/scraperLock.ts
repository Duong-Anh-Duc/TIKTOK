import redis from './redis';
import { logger } from './logger';
import { REDIS_PREFIX, SCRAPER_LOCK_TTL } from '../constants';

export async function acquireScraperLock(): Promise<boolean> {
  try {
    const result = await redis.set(REDIS_PREFIX.scraperLock, Date.now().toString(), 'EX', SCRAPER_LOCK_TTL, 'NX');
    return result === 'OK';
  } catch {
    logger.warn('[ScraperLock] Redis unavailable, allowing execution');
    return true;
  }
}

export async function releaseScraperLock(): Promise<void> {
  try {
    await redis.del(REDIS_PREFIX.scraperLock);
  } catch {}
}

export async function isScraperRunning(): Promise<boolean> {
  try {
    const val = await redis.get(REDIS_PREFIX.scraperLock);
    return !!val;
  } catch {
    return false;
  }
}
