import { getDictionary } from '@/lib/i18n';

/**
 * Omra-by-month pages: ONE year constant. On rollover, bump OMRA_YEAR — old
 * /omra-{mois}-{oldYear} URLs auto-308 to the current year (see [flat] route).
 * NOT for city-page metadata: that year is derived from the next real departure
 * (see cityMetadata in the [flat] route), never from this constant.
 */
export const OMRA_YEAR = 2026;

export const MONTH_SLUGS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

/**
 * Month hub slug. Evergreen "omra-juillet" is canonical (year lives in the
 * content, never the URL). Legacy "omra-juillet-2026" still resolves but is
 * flagged so the route 301s it to the evergreen form.
 *   "omra-juillet"      → { monthIndex: 6, legacy: false }
 *   "omra-juillet-2026" → { monthIndex: 6, year: 2026, legacy: true }
 */
export function parseMonthSlug(flat) {
  const bare = flat.match(/^omra-([a-z]+)$/);
  if (bare) {
    const monthIndex = MONTH_SLUGS.indexOf(bare[1]);
    return monthIndex === -1 ? null : { monthIndex, monthSlug: bare[1], legacy: false };
  }
  const dated = flat.match(/^omra-([a-z]+)-(\d{4})$/);
  if (dated) {
    const monthIndex = MONTH_SLUGS.indexOf(dated[1]);
    return monthIndex === -1 ? null : { monthIndex, monthSlug: dated[1], year: Number(dated[2]), legacy: true };
  }
  return null;
}

/** Evergreen month hub path — no year (dates are data, never URLs). */
export function monthPagePath(monthIndex) {
  return `/omra-${MONTH_SLUGS[monthIndex]}`;
}

/** Localized month name (standalone). */
export function monthName(monthIndex, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(OMRA_YEAR, monthIndex, 15)));
}

/**
 * Cities for /omra-depuis-[ville] — the gated whitelist. The VALUE here is the
 * French label and the historical fallback only; it is NOT what the site
 * renders. Display names are localized per locale in `src/i18n/*.json` under
 * `cities` — read them with cityName() below, never this map directly, or the
 * Arabic page ends up saying "عمرة انطلاقاً من Casablanca" (Latin token spliced
 * into an RTL sentence), which is exactly what this replaced.
 */
export const CITY_SLUGS = {
  casablanca: 'Casablanca',
  rabat: 'Rabat',
  marrakech: 'Marrakech',
  fes: 'Fès',
  tanger: 'Tanger',
  agadir: 'Agadir',
  meknes: 'Meknès',
  oujda: 'Oujda',
};

/**
 * Localized city display name. Same enum-plus-dictionary shape the site already
 * uses for hotels.city (makkah|madinah → t.offer.makkah / t.offer.madinah).
 * Falls back to the French label so an unfilled locale never renders empty.
 */
export function cityName(slug, locale) {
  return getDictionary(locale)?.cities?.[slug] ?? CITY_SLUGS[slug] ?? slug;
}

/**
 * Anti-doorway guard (Phase 4 A2 §12): a city page indexes only when its
 * admin row exists, the toggle is on AND the unique fr/ar intro is filled.
 * Otherwise it renders the generic template but stays noindex.
 */
export function cityPageIndexable(row) {
  return Boolean(row?.is_indexable && row?.intro_fr && row?.intro_ar);
}
