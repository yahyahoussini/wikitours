import { getDictionary } from '@/lib/i18n';
import { seasonYear } from '@/lib/months';
import { BRAND } from '@/lib/brand';

// Any brand token (all spellings/scripts) — if the stored title already carries
// one, the suffix is NOT re-appended (idempotent, no "… | Bab Makka | Bab Makka").
const BRAND_TOKENS = ['bab makka', 'bab makkah', 'باب مكة', 'wiki tours', 'ويكي تورز'];

/**
 * Append "| Bab Makka" to a title UNLESS it already contains a brand token
 * (in any spelling/script). Use for admin-editable seo_title fields that may or
 * may not already include the brand (CLAUDE.md: brand suffix is idempotent).
 */
export function withBrand(title, service = BRAND.service, max = 60) {
  if (!title) return title;
  const low = title.toLowerCase();
  if (BRAND_TOKENS.some((tok) => low.includes(tok))) return title; // already branded
  const suffixed = `${title} | ${service}`;
  // Append the brand only when it still fits ≤ max — an already-long admin
  // seo_title keeps its own text rather than being pushed over the limit.
  return suffixed.length <= max ? suffixed : title;
}

// Below this a title reads as a fragment ("Contact", "Omra glossary") and
// scripts/seo-suite.mjs fails the build. Arabic script is denser — no short
// vowels, connected letters — so the same content is ~25% shorter in
// characters: a 23-char Arabic hotel title is a complete title.
export const TITLE_MIN = { fr: 30, en: 30, ar: 20 };
export const titleFloor = (locale) => TITLE_MIN[locale] ?? 30;

/**
 * The admin's own seo_title when it is a real title (meets the floor once
 * branded); otherwise the authored template. Mirrors authoredOr() for
 * descriptions: the admin's words win, a fragment yields to the template.
 */
export function titleOr(adminTitle, fallback, locale, service = BRAND.service, max = 60) {
  const own = withBrand(adminTitle, service, max);
  return own && own.length >= titleFloor(locale) ? own : withBrand(fallback, service, max);
}

/**
 * SEO title templates (LAWS §5), per route × locale, from the dictionaries.
 * {year} defaults to the calendar year (seasonYear — no constant to bump);
 * month landers pass their own rollover year (targetYearFor). Callers pass
 * {occasion}/{tier}/{price}/{month} as needed. Pages prefer an admin seo_title
 * override and fall back to this — so titles stay admin-controllable (LAW §4)
 * without a developer.
 */
export function routeTitle(route, locale, vars = {}) {
  const t = getDictionary(locale);
  let template = t.seoTitles?.[route] ?? '';
  const all = { year: seasonYear(), ...vars };
  for (const [key, value] of Object.entries(all)) {
    template = template.replaceAll(`{${key}}`, String(value ?? ''));
  }
  // Collapse any leftover unfilled placeholders and stray separators.
  return template.replace(/\s*\{[a-z]+\}/gi, '').replace(/\s{2,}/g, ' ').trim();
}
