import { LOCALES } from '@/lib/i18n';

/**
 * Static 301 map for legacy / renamed URLs — applied by the middleware BEFORE
 * locale routing. Complements the admin-editable `redirects` DB table (which is
 * for content moves the client makes) and `www→apex`.
 *
 * RULE (CLAUDE.md): never delete or rename a public URL without adding its 301
 * here (or in the DB table). Keys are LOCALE-RELATIVE paths, no trailing slash.
 *
 * [URL INVENTORY NEEDED] — add the legacy bab-makka.com / m.bab-makka.com paths
 * from the client's export. bab-makka.com → wikitours.ma itself is host-level
 * (handled at the DNS/hosting layer, out of this repo).
 */
const MAP = new Map([
  // Canonical entity rename: "Bab Makkah" → "Bab Makka" (decision, 2026-07).
  ['/bab-makkah', '/bab-makka'],

  // --- SAMPLE (disabled) — shape for the pending legacy inventory ---
  // ['/omra/1104/omra-touristique-ramadan', '/omra-ramadan'],
]);

/**
 * Resolve a 301 for `pathname` (with or without a leading /<locale> segment).
 * Returns { to, status: 301 } or null. Locale is preserved on the target.
 */
export function resolveLegacyRedirect(pathname) {
  const seg = pathname.match(/^\/([a-z]{2})(?:\/(.*))?$/);
  const locale = seg && LOCALES.includes(seg[1]) ? seg[1] : null;
  const rel = (locale ? `/${seg[2] ?? ''}` : pathname).replace(/\/+$/, '') || '/';
  const to = MAP.get(rel);
  if (!to) return null;
  return { to: locale ? `/${locale}${to === '/' ? '' : to}` : to, status: 301 };
}
