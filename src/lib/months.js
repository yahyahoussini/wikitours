import { getDictionary } from '@/lib/i18n';

export const MONTH_SLUGS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

/**
 * Calendar rollover: the NEXT occurrence of a month. A month earlier than the
 * current one is next year's; the current month and the months after it are
 * this year's. Rendering /omra-janvier in September 2026 therefore says
 * "janvier 2027" — the January a pilgrim researching now can still book.
 * `today` is injectable so the boundaries are unit-tested (tests/months.test.mjs).
 * There is no year constant anywhere in the month-lander path any more.
 */
export function rolloverYear(monthIndex, today = new Date()) {
  const year = today.getUTCFullYear();
  return monthIndex < today.getUTCMonth() ? year + 1 : year;
}

/** The calendar year the rest of the site's copy is "in" (home title etc.). */
export function seasonYear(today = new Date()) {
  return today.getUTCFullYear();
}

const departureDate = (offer) => (offer?.date_start ? new Date(offer.date_start) : null);

/**
 * The year a month lander is ABOUT — data first, calendar second: the earliest
 * published departure in that month on or after the rollover year wins (a
 * December 2027 departure published while December 2026 has none makes the
 * page "décembre 2027"); with no departure, the calendar rollover decides.
 */
export function targetYearFor(monthIndex, { today = new Date(), offers = [] } = {}) {
  const base = rolloverYear(monthIndex, today);
  const years = (offers ?? [])
    .map(departureDate)
    .filter((d) => d && d.getUTCMonth() === monthIndex && d.getUTCFullYear() >= base)
    .map((d) => d.getUTCFullYear());
  return years.length ? Math.min(...years) : base;
}

/** The published departures a month lander lists: that month, its target year. */
export function departuresInMonth(offers, monthIndex, { today = new Date() } = {}) {
  const year = targetYearFor(monthIndex, { today, offers });
  return (offers ?? []).filter((o) => {
    const d = departureDate(o);
    return d && d.getUTCMonth() === monthIndex && d.getUTCFullYear() === year;
  });
}

/**
 * Evergreen-content guard for a month lander, on the city-page pattern: the
 * admin toggle AND the authored fr+ar blocks (weather/crowds + who it suits)
 * must both exist. Empty ⇒ the page renders whatever data it has, noindex.
 */
export function monthPageFilled(row) {
  return Boolean(row?.is_indexable && row?.weather_fr && row?.weather_ar && row?.suits_fr && row?.suits_ar);
}

/**
 * THE month-lander indexability predicate — robots meta, sitemap, footer,
 * MonthsLinks and the retired-departure 301 target all call this one function.
 *   never_sold (client-confirmed)      → noindex, whatever else is true
 *   a published departure this cycle   → index
 *   authored evergreen content filled  → index (hard constraint 10: content first)
 *   otherwise                          → noindex, follow
 */
export function monthLanderIndexable(monthIndex, { offers = [], monthPage = null, today = new Date() } = {}) {
  if (monthPage?.never_sold) return false;
  if (departuresInMonth(offers, monthIndex, { today }).length) return true;
  return monthPageFilled(monthPage);
}

/** Set of indexable month indices (0 = January). `monthPages` is a Map(slug → row). */
export function indexableMonths(offers, monthPages = new Map(), today = new Date()) {
  const set = new Set();
  for (let i = 0; i < MONTH_SLUGS.length; i++) {
    const monthPage = monthPages?.get?.(MONTH_SLUGS[i]) ?? null;
    if (monthLanderIndexable(i, { offers, monthPage, today })) set.add(i);
  }
  return set;
}

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

/**
 * Where a RETIRED departure (returned > 90 days ago, src/lib/offers.js) is
 * sent: its month lander when that lander is indexable, else the Omra hub —
 * a 301 must never land on a noindex page. `fallback` is true in that case so
 * the caller can log it.
 */
export function retiredRedirectPath(offer, locale, indexable) {
  const d = departureDate(offer);
  const monthIndex = d ? d.getUTCMonth() : null;
  const toMonth = monthIndex != null && indexable?.has(monthIndex);
  return { path: `/${locale}${toMonth ? monthPagePath(monthIndex) : '/bab-makka'}`, fallback: !toMonth };
}

/** Localized month name (standalone; the year is irrelevant to the label). */
export function monthName(monthIndex, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, monthIndex, 15)));
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
