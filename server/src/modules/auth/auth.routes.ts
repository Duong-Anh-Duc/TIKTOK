import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

export const authRoutes = Router();
const controller = new AuthController();

authRoutes.post('/login', controller.login);
authRoutes.post('/logout', controller.logout);
authRoutes.post('/refresh', controller.refresh);
authRoutes.get('/profile', authenticate, controller.getProfile);
authRoutes.put('/profile', authenticate, controller.updateProfile);
authRoutes.put('/change-password', authenticate, controller.changePassword);
authRoutes.post('/forgot-password', controller.forgotPassword);
authRoutes.post('/verify-otp', controller.verifyOtp);
authRoutes.post('/reset-password', controller.resetPassword);
