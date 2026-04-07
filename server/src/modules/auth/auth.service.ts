import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { OtpStore } from '../../utils/otpStore';
import { logger } from '../../utils/logger';
import { isAccountLocked, recordFailedAttempt, clearFailedAttempts } from '../../utils/loginLimiter';

const prisma = new PrismaClient();

export class AuthService {
  async login(email: string, password: string) {
    // Check if account is locked
    const lockStatus = await isAccountLocked(email);
    if (lockStatus.locked) {
      const minutes = Math.ceil(lockStatus.remainingSeconds / 60);
      throw new AppError('auth.accountLocked', 429, { remainingMinutes: minutes });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.is_active) {
      const result = await recordFailedAttempt(email);
      if (result.locked) {
        throw new AppError('auth.accountLocked', 429, { remainingMinutes: 30 });
      }
      throw new AppError('auth.loginFailed', 401, { attemptsLeft: 5 - result.attempts });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const result = await recordFailedAttempt(email);
      if (result.locked) {
        throw new AppError('auth.accountLocked', 429, { remainingMinutes: 30 });
      }
      throw new AppError('auth.loginFailed', 401, { attemptsLeft: 5 - result.attempts });
    }

    // Login success — clear failed attempts
    await clearFailedAttempts(email);

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshTokenExpiry }
    );

    const { password_hash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError('auth.refreshRequired', 401);
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

      if (!user || !user.is_active) {
        throw new AppError('auth.userNotFound', 401);
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.accessTokenExpiry }
      );

      return { accessToken };
    } catch {
      throw new AppError('auth.refreshFailed', 401);
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) throw new AppError('auth.userNotFound', 404);
    return user;
  }

  async updateProfile(userId: string, data: { full_name?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('auth.userNotFound', 404);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { full_name: data.full_name },
      select: {
        id: true, email: true, full_name: true, avatar_url: true,
        role: true, is_active: true, created_at: true, updated_at: true,
      },
    });
    return updated;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('auth.userNotFound', 404);

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new AppError('auth.currentPasswordWrong', 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hash },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('auth.userNotFound', 404);

    const otp = crypto.randomInt(100000, 999999).toString();
    await OtpStore.set(email, otp);

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    await transporter.sendMail({
      from: `"TikTok Shop" <${config.smtp.from}>`,
      to: email,
      subject: 'Mã OTP đặt lại mật khẩu - TikTok Shop',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;padding:32px">
          <h2 style="color:#FE2C55;margin-bottom:8px">TikTok Shop</h2>
          <p>Xin chào <b>${user.full_name}</b>,</p>
          <p>Mã OTP đặt lại mật khẩu của bạn:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="font-size:32px;letter-spacing:8px;font-weight:800;color:#FE2C55;background:#FFF0F3;padding:12px 28px;border-radius:12px;display:inline-block">${otp}</span>
          </div>
          <p style="color:#f87171;font-size:13px">⏱ Mã này sẽ hết hạn sau <b>5 phút</b>.</p>
          <p style="color:#888;font-size:12px;margin-top:24px">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    });

    logger.info(`OTP sent to ${email}`);
  }

  async verifyOTP(email: string, otp: string) {
    const stored = await OtpStore.get(email);
    if (!stored) throw new AppError('auth.otpExpired', 400);
    if (stored !== otp) throw new AppError('auth.otpInvalid', 400);
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const stored = await OtpStore.get(email);
    if (!stored) throw new AppError('auth.otpExpired', 400);
    if (stored !== otp) throw new AppError('auth.otpInvalid', 400);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('auth.userNotFound', 404);

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash },
    });

    await OtpStore.del(email);
    logger.info(`Password reset for ${email}`);
  }
}
