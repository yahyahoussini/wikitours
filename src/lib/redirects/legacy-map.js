import { LOCALES, FALLBACK_LOCALE } from '@/lib/i18n';

/**
 * Static 301 map for legacy / renamed URLs — applied by the middleware BEFORE
 * locale routing. Complements the admin-editable `redirects` DB table (which is
 * for content moves the client makes) and `www→apex`.
 *
 * RULE (CLAUDE.md): never delete or rename a public URL without adding its 301
 * here (or in the DB table). Keys are LOCALE-RELATIVE paths, no trailing slash.
 *
 * [URL INVENTORY NEEDED] — add the legacy bab-makka.com / m.bab-makka.com paths
 * from the client's export. The host hop itself (bab-makka.com → wikitours.ma)
 * is done by the middleware's legacy-domain block in the SAME 301 as this map,
 * once the domains are attached to the project as served domains (see
 * DEPLOYMENT.md §3).
 */
const MAP = new Map([
  // Canonical entity rename: "Bab Makkah" → "Bab Makka" (decision, 2026-07).
  ['/bab-makkah', '/bab-makka'],

  // --- SAMPLE (disabled) — shape for the pending legacy inventory ---
  // ['/omra/1104/omra-touristique-ramadan', '/omra-ramadan'],
]);

/**
 * Pattern fallbacks for the legacy bab-makka.com URL SHAPES. The domain now
 * 301s to wikitours.ma preserving the path, so every old deep link landed on a
 * 404 — and a 301 into a 404 passes no authority at all, which defeats the
 * whole point of recovering the domain.
 *
 * `/omra/<numeric-id>/...` is the OLD scheme; today's offers are
 * `/omra/<slug>` and a slug is never purely numeric, so these cannot collide.
 * Order matters: first match wins.
 */
const PATTERNS = [
  [/^\/omra\/\d+(?:\/.*)?$/i, '/bab-makka'],   // old Omra product pages
  [/^\/Vol\/\d+(?:\/.*)?$/i, '/bab-makka'],    // old flight pages (Omra flights)
  [/^\/product\/[^/]+\/feed\/?$/i, '/voyages'], // old WordPress product feeds
  [/^\/room_types(?:\/.*)?$/i, '/hotels-omra'],  // old WordPress room types
];

/**
 * Resolve a 301 for `pathname` (with or without a leading /<locale> segment).
 * Returns { to, status: 301 } or null.
 *
 * The target is ALWAYS locale-prefixed. Legacy bab-makka.com URLs arrive bare
 * (no locale), and a bare target would bounce once more through the locale
 * router: bab-makka.com/omra/1104/… → 301 → /bab-makka → 307 → /fr/bab-makka.
 * Ending a permanent domain migration on a TEMPORARY hop is the wrong signal
 * for consolidating link equity, and every extra hop leaks some. The old site
 * was French, so FALLBACK_LOCALE (fr — also the hreflang x-default) is the
 * right landing; a locale that IS present is preserved.
 */
export function resolveLegacyRedirect(pathname) {
  const seg = pathname.match(/^\/([a-z]{2})(?:\/(.*))?$/);
  const locale = seg && LOCALES.includes(seg[1]) ? seg[1] : null;
  const rel = (locale ? `/${seg[2] ?? ''}` : pathname).replace(/\/+$/, '') || '/';
  let to = MAP.get(rel);
  if (!to) {
    for (const [re, target] of PATTERNS) {
      if (re.test(rel)) { to = target; break; }
    }
  }
  if (!to) return null;
  return { to: `/${locale ?? FALLBACK_LOCALE}${to === '/' ? '' : to}`, status: 301 };
}
