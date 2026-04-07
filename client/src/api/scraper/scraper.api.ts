import apiClient from '../client';
import type { ApiResponse, Creator, ScrapeJob } from '@/types';

export const scraperApi = {
  scrape: (params: Record<string, any>) =>
    apiClient.post<ApiResponse<{ jobId: string }>>('/scraper/scrape', params),

  testFilter: (params: Record<string, any>) =>
    apiClient.post<ApiResponse>('/scraper/test-filter', params),

  getCreators: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<ApiResponse<{ data: Creator[]; total: number; page: number; totalPages: number }>>(
      '/scraper/creators',
      { params },
    ),

  getJobStatus: (jobId: string) =>
    apiClient.get<ApiResponse<ScrapeJob>>(`/scraper/job/${jobId}`),

  deleteAll: () =>
    apiClient.delete<ApiResponse>('/scraper/creators'),

  listFiles: () =>
    apiClient.get<ApiResponse<Array<{ name: string; size: number; createdAt: string }>>>('/scraper/files'),

  downloadFile: (name: string) =>
    apiClient.get(`/scraper/files/${name}`, { responseType: 'blob' }),

  renameFile: (name: string, newName: string) =>
    apiClient.put<ApiResponse<{ name: string }>>(`/scraper/files/${name}/rename`, { newName }),

  deleteFile: (name: string) =>
    apiClient.delete<ApiResponse>(`/scraper/files/${name}`),
};
