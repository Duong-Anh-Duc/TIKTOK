import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// VI
import viCommon from './locales/vi/common/common.json';
import viAuth from './locales/vi/auth/auth.json';
import viDashboard from './locales/vi/dashboard/dashboard.json';
import viSidebar from './locales/vi/sidebar/sidebar.json';
import viScraper from './locales/vi/scraper/scraper.json';
import viGemlogin from './locales/vi/gemlogin/gemlogin.json';
import viSettings from './locales/vi/settings/settings.json';
import viSchedule from './locales/vi/schedule/schedule.json';

// EN
import enCommon from './locales/en/common/common.json';
import enAuth from './locales/en/auth/auth.json';
import enDashboard from './locales/en/dashboard/dashboard.json';
import enSidebar from './locales/en/sidebar/sidebar.json';
import enScraper from './locales/en/scraper/scraper.json';
import enGemlogin from './locales/en/gemlogin/gemlogin.json';
import enSettings from './locales/en/settings/settings.json';
import enSchedule from './locales/en/schedule/schedule.json';

i18n.use(initReactI18next).init({
  resources: {
    vi: {
      translation: {
        common: viCommon,
        auth: viAuth,
        dashboard: viDashboard,
        sidebar: viSidebar,
        scraper: viScraper,
        gemlogin: viGemlogin,
        settings: viSettings,
        schedule: viSchedule,
      },
    },
    en: {
      translation: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        sidebar: enSidebar,
        scraper: enScraper,
        gemlogin: enGemlogin,
        settings: enSettings,
        schedule: enSchedule,
      },
    },
  },
  lng: localStorage.getItem('locale') || 'vi',
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
