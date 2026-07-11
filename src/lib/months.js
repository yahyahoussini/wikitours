/**
 * Omra-by-month pages: ONE year constant. On rollover, bump OMRA_YEAR — old
 * /omra-{mois}-{oldYear} URLs auto-308 to the current year (see [flat] route).
 */
export const OMRA_YEAR = 2026;

export const MONTH_SLUGS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

/** "omra-juillet-2026" → { monthIndex: 6, year: 2026 } | null */
export function parseMonthSlug(flat) {
  const m = flat.match(/^omra-([a-z]+)-(\d{4})$/);
  if (!m) return null;
  const monthIndex = MONTH_SLUGS.indexOf(m[1]);
  if (monthIndex === -1) return null;
  return { monthIndex, year: Number(m[2]), monthSlug: m[1] };
}

export function monthPagePath(monthIndex, year = OMRA_YEAR) {
  return `/omra-${MONTH_SLUGS[monthIndex]}-${year}`;
}

/** Localized month name (standalone). */
export function monthName(monthIndex, locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(OMRA_YEAR, monthIndex, 15)));
}

/** Cities for /omra-depuis-[ville] — the gated whitelist. */
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
