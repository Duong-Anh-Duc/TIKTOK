import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getCache, setCache, invalidateCache } from '../../utils/cache';

const ENV_PATH = path.resolve(__dirname, '..', '..', '..', '.env');

/** Đọc .env thành object */
function readEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const parsed = dotenv.parse(content);
  return parsed;
}

/** Ghi object lại thành .env */
function writeEnv(env: Record<string, string>) {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n');
  // Cập nhật process.env
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }
}

export class SettingsController {
  static async get(_req: Request, res: Response) {
    const cached = await getCache('settings');
    if (cached) { res.json({ success: true, data: cached }); return; }

    const env = readEnv();
    const data = {
        ommoCaptchaKeySet: !!env.OMMO_CAPTCHA_KEY,
        ommoCaptchaKey: env.OMMO_CAPTCHA_KEY || '',
        tiktokEmail: env.TIKTOK_EMAIL || '',
        tiktokPhone: env.TIKTOK_PHONE || '',
        tiktokPassword: env.TIKTOK_PASSWORD || '',
        tiktokPasswordSet: !!env.TIKTOK_PASSWORD,
        mailtmAddress: env.MAILTM_ADDRESS || '',
        mailtmPassword: env.MAILTM_PASSWORD || '',
        mailtmPasswordSet: !!env.MAILTM_PASSWORD,
    };
    await setCache('settings', data, 60);
    res.json({ success: true, data });
  }

  static async update(req: Request, res: Response) {
    const t = (req as any).t;
    const { ommoCaptchaKey, tiktokEmail, tiktokPhone, tiktokPassword, mailtmAddress, mailtmPassword } = req.body;
    const env = readEnv();

    if (typeof ommoCaptchaKey === 'string' && ommoCaptchaKey.trim()) {
      env.OMMO_CAPTCHA_KEY = ommoCaptchaKey.trim();
    }
    if (typeof tiktokEmail === 'string') {
      env.TIKTOK_EMAIL = tiktokEmail.trim();
    }
    if (typeof tiktokPhone === 'string') {
      env.TIKTOK_PHONE = tiktokPhone.trim();
    }
    if (typeof tiktokPassword === 'string' && tiktokPassword.trim()) {
      env.TIKTOK_PASSWORD = tiktokPassword.trim();
    }
    // Mail.tm — đồng bộ với TIKTOK_EMAIL nếu không set riêng
    if (typeof mailtmAddress === 'string') {
      env.MAILTM_ADDRESS = mailtmAddress.trim();
    }
    if (typeof mailtmPassword === 'string' && mailtmPassword.trim()) {
      env.MAILTM_PASSWORD = mailtmPassword.trim();
    }

    writeEnv(env);
    await invalidateCache('settings');
    res.json({ success: true, message: t ? t('settings.saved') : 'Settings saved' });
  }
}
