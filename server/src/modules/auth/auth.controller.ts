import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { blacklistToken } from '../../utils/tokenBlacklist';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // Set refresh token as HttpOnly cookie
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: t ? t('auth.loginSuccess') : 'Login successful',
        data: {
          user: result.user,
          access_token: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response) {
    const t = (req as any).t;

    // Blacklist current access token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await blacklistToken(token, 15 * 60); // TTL = access token expiry (15 min)
    }

    res.clearCookie('refresh_token');
    res.json({
      success: true,
      message: t ? t('auth.logoutSuccess') : 'Logged out',
    });
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refresh_token;
      const result = await authService.refresh(refreshToken);

      res.json({
        success: true,
        data: { access_token: result.accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const user = await authService.getProfile(req.userId!);
      res.json({
        success: true,
        message: t ? t('auth.profileRetrieved') : 'Profile retrieved',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { full_name } = req.body;
      const user = await authService.updateProfile(req.userId!, { full_name });
      res.json({
        success: true,
        message: t ? t('auth.profileUpdated') : 'Profile updated',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { current_password, new_password } = req.body;
      await authService.changePassword(req.userId!, current_password, new_password);
      res.json({
        success: true,
        message: t ? t('auth.passwordChanged') : 'Password changed',
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      res.json({
        success: true,
        message: t ? t('auth.otpSent') : 'OTP sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { email, otp } = req.body;
      await authService.verifyOTP(email, otp);
      res.json({
        success: true,
        message: t ? t('auth.otpVerified') : 'OTP verified',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const t = (req as any).t;
      const { email, otp, newPassword } = req.body;
      await authService.resetPassword(email, otp, newPassword);
      res.json({
        success: true,
        message: t ? t('auth.resetSuccess') : 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }
}
