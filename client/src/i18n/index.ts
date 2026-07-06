import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';
import type { Locale } from '@/store/uiStore';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Apply the locale to i18next and reflect direction/lang on <html>. */
export function applyLocale(locale: Locale) {
  void i18n.changeLanguage(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', locale);
}

export default i18n;
