import { LOCALES, FALLBACK_LOCALE } from '@/lib/i18n';

/**
 * Absolute-URL + hreflang helpers shared by the sitemap, robots and every
 * page's generateMetadata. One source of truth for the site origin so a
 * domain change is a single env edit (LAWS §5: correct hreflang fr/ar/en).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wikitours.ma').replace(/\/$/, '');

/** Locale-relative path ("/bab-makka", "" for home) → absolute URL. */
/** Clamp a meta description to ≤155 chars at a word boundary (SEO best practice). */
export function clampDesc(s, n = 155) {
  if (!s || s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '').trimEnd() + '…';
}

export function absoluteUrl(locale, path = '') {
  const clean = path === '/' ? '' : path;
  return `${SITE_URL}/${locale}${clean}`;
}

/**
 * `alternates` object for Next metadata: canonical for THIS locale plus every
 * locale variant and an x-default pointing at the fallback locale.
 */
export function hreflangAlternates(locale, path = '') {
  return {
    canonical: absoluteUrl(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])),
      'x-default': absoluteUrl(FALLBACK_LOCALE, path),
    },
  };
}

/** Per-URL locale alternates for a sitemap entry (Google's xhtml:link form). */
export function sitemapAlternates(path = '') {
  return {
    languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)])),
  };
}

/**
 * settings.verification_metas → [{ name, content }] for Next's metadata
 * `verification.other`. Admins paste whatever Google/Bing hands them, so accept
 * both a full `<meta name="…" content="…">` tag and a bare `name=content` line.
 * Parsed (not injected as raw HTML) so a bad paste can never break the head.
 */
export function parseVerificationMetas(raw) {
  if (!raw) return [];
  const out = [];
  for (const line of String(raw).split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const name = s.match(/name=["']([^"']+)["']/i)?.[1];
    const content = s.match(/content=["']([^"']+)["']/i)?.[1];
    if (name && content) {
      out.push({ name, content });
      continue;
    }
    const bare = s.match(/^([A-Za-z0-9_.:-]+)\s*=\s*(.+)$/);
    if (bare) out.push({ name: bare[1], content: bare[2].replace(/^["']|["']$/g, '').trim() });
  }
  return out;
}
