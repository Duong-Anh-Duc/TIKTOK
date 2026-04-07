import i18next from 'i18next';
import middleware from 'i18next-http-middleware';

// VI
import viAuth from '../locales/vi/auth/auth.json';
import viUser from '../locales/vi/user/user.json';
import viGemlogin from '../locales/vi/gemlogin/gemlogin.json';
import viCaptcha from '../locales/vi/captcha/captcha.json';
import viEmailVerifier from '../locales/vi/emailVerifier/emailVerifier.json';
import viScraper from '../locales/vi/scraper/scraper.json';
import viValidation from '../locales/vi/validation/validation.json';
import viScheduler from '../locales/vi/scheduler/scheduler.json';
import viSettings from '../locales/vi/settings/settings.json';
import viGeneral from '../locales/vi/general/general.json';

// EN
import enAuth from '../locales/en/auth/auth.json';
import enUser from '../locales/en/user/user.json';
import enGemlogin from '../locales/en/gemlogin/gemlogin.json';
import enCaptcha from '../locales/en/captcha/captcha.json';
import enEmailVerifier from '../locales/en/emailVerifier/emailVerifier.json';
import enScraper from '../locales/en/scraper/scraper.json';
import enValidation from '../locales/en/validation/validation.json';
import enScheduler from '../locales/en/scheduler/scheduler.json';
import enSettings from '../locales/en/settings/settings.json';
import enGeneral from '../locales/en/general/general.json';

i18next.use(middleware.LanguageDetector).init({
  resources: {
    vi: {
      translation: {
        auth: viAuth,
        user: viUser,
        gemlogin: viGemlogin,
        captcha: viCaptcha,
        emailVerifier: viEmailVerifier,
        scraper: viScraper,
        validation: viValidation,
        scheduler: viScheduler,
        settings: viSettings,
        general: viGeneral,
      },
    },
    en: {
      translation: {
        auth: enAuth,
        user: enUser,
        gemlogin: enGemlogin,
        captcha: enCaptcha,
        emailVerifier: enEmailVerifier,
        scraper: enScraper,
        validation: enValidation,
        scheduler: enScheduler,
        settings: enSettings,
        general: enGeneral,
      },
    },
  },
  fallbackLng: 'vi',
  preload: ['vi', 'en'],
  detection: {
    order: ['header'],
    lookupHeader: 'accept-language',
  },
  interpolation: {
    escapeValue: false,
  },
});

export const i18nMiddleware = middleware.handle(i18next);
export default i18next;
