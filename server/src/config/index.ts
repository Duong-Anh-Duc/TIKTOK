import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/tiktok_shop',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'tiktok-shop-jwt-secret-key-2024',
    accessTokenExpiry: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
    refreshTokenExpiry: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
  },

  // CORS
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:80',
    'http://localhost:8181',
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[],

  // Default Admin
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@tiktokshop.vn',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
    fullName: 'Admin',
  },

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@tiktokshop.vn',
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },

  // App URL
  appUrl: process.env.APP_URL || 'http://localhost:5173',
};
