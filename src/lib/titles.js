import { getDictionary } from '@/lib/i18n';
import { OMRA_YEAR } from '@/lib/months';

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
