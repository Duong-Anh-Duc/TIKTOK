import Redis from 'ioredis';
import { logger } from './logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('[Redis] Connected'));
redis.on('error', (err) => logger.warn('[Redis] Error: ' + err.message));

// Connect lazily — don't crash if Redis is down
redis.connect().catch(() => {
  logger.warn('[Redis] Could not connect — login rate limiting will be disabled');
});

export default redis;
