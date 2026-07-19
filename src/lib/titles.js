import { getDictionary } from '@/lib/i18n';
import { OMRA_YEAR } from '@/lib/months';
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

/**
 * SEO title templates (LAWS §5), per route × locale, from the dictionaries.
 * {year} defaults to OMRA_YEAR so titles roll over with one constant; callers
 * pass {occasion}/{tier}/{price}/{month} as needed. Pages prefer an admin
 * seo_title override and fall back to this — so titles stay admin-controllable
 * (LAW §4) without a developer.
 */
export function routeTitle(route, locale, vars = {}) {
  const t = getDictionary(locale);
  let template = t.seoTitles?.[route] ?? '';
  const all = { year: OMRA_YEAR, ...vars };
  for (const [key, value] of Object.entries(all)) {
    template = template.replaceAll(`{${key}}`, String(value ?? ''));
  }
  // Collapse any leftover unfilled placeholders and stray separators.
  return template.replace(/\s*\{[a-z]+\}/gi, '').replace(/\s{2,}/g, ' ').trim();
}
