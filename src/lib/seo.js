import { LOCALES, FALLBACK_LOCALE } from '@/lib/i18n';

/**
 * Absolute-URL + hreflang helpers shared by the sitemap, robots and every
 * page's generateMetadata. One source of truth for the site origin so a
 * domain change is a single env edit (LAWS §5: correct hreflang fr/ar/en).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma').replace(/\/$/, '');

/** Locale-relative path ("/bab-makkah", "" for home) → absolute URL. */
export function absoluteUrl(locale, path = '') {
  const clean = path === '/' ? '' : path;
  return `${SITE_URL}/${locale}${clean}`;
}

/**
 * `alternates` object for Next metadata: canonical for THIS locale plus every
 * locale variant and an x-default pointing at the fallback locale.
 */
export function hreflangAlternates(locale, path = '') {
  return {
    canonical: absoluteUrl(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])),
      'x-default': absoluteUrl(FALLBACK_LOCALE, path),
    },
  };
}

/** Per-URL locale alternates for a sitemap entry (Google's xhtml:link form). */
export function sitemapAlternates(path = '') {
  return {
    languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])),
  };
}
