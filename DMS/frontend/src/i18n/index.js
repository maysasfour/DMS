/**
 * i18n/index.js — Internationalization configuration for the Disaster Management System (DMS).
 *
 * Initializes and exports the i18next instance used across all DMS frontend pages and components
 * (incident reports, user profiles, admin panels, alerts, resource forms, etc.) to support
 * multilingual display in English, Arabic, French, Spanish, and Turkish.
 *
 * Language preference is persisted in localStorage under the key 'language' so returning
 * users see the DMS UI in their previously chosen language without re-selecting it.
 */

// Core i18next library — provides the translation engine used throughout the DMS UI
import i18n from 'i18next';

// React binding plugin — integrates i18next with React's rendering lifecycle via the useTranslation hook
import { initReactI18next } from 'react-i18next';

// Browser language detection plugin — reads the user's preferred language from localStorage or the browser navigator
import LanguageDetector from 'i18next-browser-languagedetector';

// English locale — default language for DMS UI labels, incident status messages, and form fields
import en from './locales/en.json';

// Arabic locale — supports right-to-left display for Arabic-speaking responders and administrators
import ar from './locales/ar.json';

// French locale — supports Francophone users accessing the DMS incident and resource management pages
import fr from './locales/fr.json';

// Spanish locale — supports Spanish-speaking emergency personnel and community reporters
import es from './locales/es.json';

// Turkish locale — supports Turkish-speaking users of the DMS system
import tr from './locales/tr.json';

// Chain i18next plugin registrations and initialization
i18n
  // Register the browser language detector so DMS auto-selects language based on stored preference or browser locale
  .use(LanguageDetector)
  // Register the React integration plugin so React components can use the useTranslation hook for DMS strings
  .use(initReactI18next)
  // Initialize i18next with DMS-specific configuration
  .init({
    // Map each supported locale code to its translation bundle (incident types, UI labels, error messages, etc.)
    resources: {
      en: { translation: en }, // English translations
      ar: { translation: ar }, // Arabic translations
      fr: { translation: fr }, // French translations
      es: { translation: es }, // Spanish translations
      tr: { translation: tr }, // Turkish translations
    },
    // Fall back to English if the detected or selected language has no translation entry
    fallbackLng: 'en',
    // Restrict i18next to only these five languages to prevent unexpected locale loading
    supportedLngs: ['en', 'ar', 'fr', 'es', 'tr'],
    // Disable HTML escaping of interpolated values — React already handles XSS protection in JSX rendering
    interpolation: { escapeValue: false },
    // Language detection strategy configuration
    detection: {
      // Check localStorage first (user's explicit choice), then fall back to the browser's navigator.language
      order: ['localStorage', 'navigator'],
      // Persist the detected/selected language to localStorage so DMS remembers preference across sessions
      caches: ['localStorage'],
      // The localStorage key name used to store and retrieve the DMS user's language preference
      lookupLocalStorage: 'language',
    },
  });

// Export the configured i18next instance so it can be imported by the DMS React app entry point and components
export default i18n;