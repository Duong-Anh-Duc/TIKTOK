import apiClient from '../client';
import type { ApiResponse, User } from '@/types';

export const userApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<ApiResponse>('/users', { params }),

  create: (data: Partial<User> & { password: string }) =>
    apiClient.post<ApiResponse<User>>('/users', data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse>(`/users/${id}`),
};

export const auditApi = {
  getAll: (params?: { page?: number; limit?: number; entity?: string }) =>
    apiClient.get<ApiResponse>('/audit-logs', { params }),
};
