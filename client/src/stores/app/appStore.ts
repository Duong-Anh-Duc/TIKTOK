import { create } from 'zustand';
import i18n from '@/i18n';
import type { AppState, Locale } from '@/types';

export const useAppStore = create<AppState>((set) => ({
  locale: (localStorage.getItem('locale') as Locale) || 'vi',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  darkMode: localStorage.getItem('darkMode') === 'true',

  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    i18n.changeLanguage(locale);
    set({ locale });
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode;
      localStorage.setItem('darkMode', String(newMode));
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
      return { darkMode: newMode };
    }),
}));
