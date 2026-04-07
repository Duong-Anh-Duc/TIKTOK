export type Locale = 'vi' | 'en';

export interface AppState {
  locale: Locale;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  darkMode: boolean;
  setLocale: (locale: Locale) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
