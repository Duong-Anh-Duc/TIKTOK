import apiClient from '../client';
import type { ApiResponse } from '@/types';

export const gemloginApi = {
  getStatus: () =>
    apiClient.get<{
      success: boolean;
      isRunning: boolean;
      activeProfileId: string | null;
      apiUrl: string;
      cdpInjected: boolean;
    }>('/gemlogin/status'),

  start: (profileId?: string) =>
    apiClient.post<ApiResponse<{ wsUrl: string; cdpUrl: string; profileId: string }>>(
      '/gemlogin/start',
      { profileId: profileId || '1' },
    ),

  close: (profileId?: string) =>
    apiClient.post<ApiResponse>('/gemlogin/close', profileId ? { profileId } : {}),

  getProfiles: () =>
    apiClient.get<ApiResponse<Array<{ id: string; name: string; [key: string]: unknown }>>>(
      '/gemlogin/profiles',
    ),

  getBrowserVersions: () =>
    apiClient.get<ApiResponse>('/gemlogin/browser-versions'),

  getGroups: () =>
    apiClient.get<ApiResponse>('/gemlogin/groups'),

  createProfile: (data: { name: string; browserVersion?: string }) =>
    apiClient.post<ApiResponse>('/gemlogin/profiles', data),

  updateProfile: (id: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse>(`/gemlogin/profiles/${id}`, data),

  deleteProfile: (id: string) =>
    apiClient.delete<ApiResponse>(`/gemlogin/profiles/${id}`),

  changeFingerprint: (ids?: string[]) =>
    apiClient.post<ApiResponse>('/gemlogin/profiles/fingerprint', {}, {
      params: ids?.length ? { ids: ids.join(',') } : {},
    }),
};
