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
 * Returns { to, status: 301 } or null. Locale is preserved on the target.
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
  return { to: locale ? `/${locale}${to === '/' ? '' : to}` : to, status: 301 };
}
