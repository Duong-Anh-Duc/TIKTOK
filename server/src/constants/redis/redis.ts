export const REDIS_PREFIX = {
  loginAttempts: 'login:attempts:',
  loginLocked: 'login:locked:',
  scraperLock: 'scraper:running',
  tokenBlacklist: 'token:blacklist:',
  cache: 'cache:',
  otp: 'otp:reset:',
} as const;

export const SCRAPER_LOCK_TTL = 60 * 60; // 1 hour
export const TOKEN_BLACKLIST_TTL = 15 * 60; // 15 minutes (access token expiry)
