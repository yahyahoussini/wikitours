import { getDictionary } from '@/lib/i18n';
import { cityName } from '@/lib/months';

/**
 * Authored metadata for /omra-depuis-{ville} (8 cities × 3 locales = 24 URLs).
 *
 * Replaces the old stubs: a bare "Omra depuis Casablanca" (22 chars, no brand,
 * no year, no qualifier) and a description sliced out of the intro paragraph
 * with clampDesc(), which truncated mid-sentence and shipped a visible "…".
 * Nothing here is sliced from body copy and nothing is ellipsis-truncated —
 * when a string will not fit, a whole clause is dropped instead.
 *
 * Ceilings are the ones scripts/seo-audit.js actually enforces (it FAILS the
 * build above them), which are tighter than the brief's 62/160:
 *   title ≤ 60   (seo-audit.js:142)
 *   description ≤ 155 (seo-audit.js:145)
 */
export const TITLE_MAX = 60;
export const DESC_MAX = 155;

/** Same formatter the rest of the site prices with (fr-MA everywhere). */
const nf = new Intl.NumberFormat('fr-MA');

const fill = (tpl, vars) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);

/**
 * The year is DERIVED, never hardcoded: the year of the next departure that has
 * not left yet. With no upcoming departure we roll forward to the next calendar
 * year — printing a year already in the past is worse than printing none.
 */
export function cityYear(offers, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const upcoming = offers
    .map((o) => o.date_start)
    .filter((d) => d && d >= today)
    .sort();
  if (upcoming.length) return new Date(upcoming[0]).getUTCFullYear();
  return now.getUTCFullYear() + 1;
}

/** Lowest real published price, or null — never 0 and never a stale figure. */
export function cityMinPrice(offers) {
  const prices = offers
    .map((o) => o.starting_price)
    .filter((p) => typeof p === 'number' && Number.isFinite(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * Title, degrading one clause at a time until it fits — long qualifier, short
 * qualifier, no qualifier, bare lead. Only Arabic Casablanca
 * ("الدار البيضاء", 13 chars) actually needs the short form today.
 */
export function cityTitle(citySlug, locale, year) {
  const c = getDictionary(locale).cityPage;
  const lead = fill(c.seoTitleLead, { city: cityName(citySlug, locale), year });
  const brand = c.seoTitleBrand;
  const candidates = [
    `${lead} — ${c.seoTitleQualifier} | ${brand}`,
    `${lead} — ${c.seoTitleQualifierShort} | ${brand}`,
    `${lead} | ${brand}`,
    lead,
  ];
  return candidates.find((s) => s.length <= TITLE_MAX) ?? lead;
}

/**
 * Description: price floor + the two differentiators (licence, no online
 * payment) + the WhatsApp promise. The price clause is omitted entirely when no
 * departure is live, and the licence comes from settings — never hardcoded
 * (business data lives in the DB, CLAUDE.md §"never invent").
 */
export function cityDescription(citySlug, locale, { minPrice = null, license = null } = {}) {
  const c = getDictionary(locale).cityPage;
  const city = cityName(citySlug, locale);
  const lead =
    minPrice != null
      ? fill(c.seoDescPrice, { city, minPrice: nf.format(minPrice) })
      : fill(c.seoDescNoPrice, { city });
  const trust = license ? fill(c.seoDescTrust, { license }) : c.seoDescTrustNoLicense;

  // Drop whole clauses, never characters — an ellipsis in a SERP snippet is the
  // bug this replaced.
  for (const candidate of [`${lead} ${trust} ${c.seoDescTail}`, `${lead} ${trust}`, lead]) {
    if (candidate.length <= DESC_MAX) return candidate;
  }
  return lead;
}
