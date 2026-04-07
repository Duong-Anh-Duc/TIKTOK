import apiClient from '../client';
import type { ApiResponse, ScrapeSchedule } from '@/types';

export const scheduleApi = {
  list: () => apiClient.get<ApiResponse<ScrapeSchedule[]>>('/schedules'),

  create: (data: Partial<ScrapeSchedule>) =>
    apiClient.post<ApiResponse<ScrapeSchedule>>('/schedules', data),

  update: (id: string, data: Partial<ScrapeSchedule>) =>
    apiClient.put<ApiResponse<ScrapeSchedule>>(`/schedules/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse>(`/schedules/${id}`),

  toggle: (id: string) =>
    apiClient.post<ApiResponse<ScrapeSchedule>>(`/schedules/${id}/toggle`),

  runNow: (id: string) =>
    apiClient.post<ApiResponse>(`/schedules/${id}/run`),
};
