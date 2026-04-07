import apiClient from '../client';
import type { LoginRequest, LoginResponse, ApiResponse, User } from '@/types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data),

  logout: () =>
    apiClient.post<ApiResponse>('/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<{ access_token: string }>>('/auth/refresh'),

  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/auth/profile'),

  updateProfile: (data: { full_name: string }) =>
    apiClient.put<ApiResponse<User>>('/auth/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.put<ApiResponse>('/auth/change-password', data),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse>('/auth/forgot-password', { email }),

  verifyOtp: (data: { email: string; otp: string }) =>
    apiClient.post<ApiResponse>('/auth/verify-otp', data),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    apiClient.post<ApiResponse>('/auth/reset-password', data),
};
