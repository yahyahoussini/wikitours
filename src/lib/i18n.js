import fr from '@/i18n/fr.json';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

export const LOCALES = ['fr', 'ar', 'en'];
export const FALLBACK_LOCALE = 'fr';

const DICTIONARIES = { fr, ar, en };

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function getDictionary(locale) {
  return DICTIONARIES[locale] ?? DICTIONARIES[FALLBACK_LOCALE];
}

export function dirFor(locale) {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Picks the right language column from a DB row holding _fr/_ar/_en columns,
 * falling back to French. Returns null when the row has no value at all,
 * so callers can hide the section (LAWS §10).
 */
export function pickLang(row, field, locale) {
  if (!row) return null;
  return row[`${field}_${locale}`] || row[`${field}_${FALLBACK_LOCALE}`] || null;
}
