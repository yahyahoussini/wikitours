/**
 * scripts/lib/build-pages.mjs — the build-output page model shared by the
 * gates (scripts/schema-audit.mjs, scripts/seo-suite.mjs).
 *
 * One place says what a "page type" is and how the prerendered HTML is read,
 * so both gates cover the same routes and a new route is classified once.
 * TO ADD A PAGE TYPE: add its locale-relative path to STATIC (fixed path) or
 * DYNAMIC (first segment of a `/{head}/{slug}` route), then see
 * scripts/README.md for the per-gate expectations.
 *
 * No `@/` imports here — the schema gate runs under plain `node`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export const DIST = process.env.NEXT_DIST_DIR || '.next';
export const APP = path.join(DIST, 'server', 'app');
export const LOCALES = ['fr', 'ar', 'en'];

// ── page typing ─────────────────────────────────────────────────────────────
export const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
export const STATIC = {
  '': 'home', 'bab-makka': 'bab-makka', 'omra-pas-cher': 'omra-pas-cher', 'hotels-omra': 'hotels-omra',
  'agence-omra-casablanca': 'agence', hajj: 'hajj', voyages: 'voyages', blog: 'blog-index', avis: 'avis',
  presse: 'presse', agrement: 'agrement', 'a-propos': 'a-propos', contact: 'contact', equipe: 'team',
  'barometre-prix-omra': 'barometre', 'glossaire-omra': 'glossaire', 'guide-omra': 'guide',
  cgv: 'legal', 'mentions-legales': 'legal', 'politique-de-confidentialite': 'legal',
};
export const DYNAMIC = { omra: 'offer', blog: 'article', hotel: 'hotel', voyage: 'voyage', 'guide-omra': 'guide-child', lp: 'landing' };
/** Page type of a locale-relative path ('' = home), or null when unclassified. */
export function pageType(rest) {
  if (rest in STATIC) return STATIC[rest];
  const [head, tail] = rest.split('/');
  if (tail !== undefined) return DYNAMIC[head] ?? null;
  if (MONTHS.some((m) => rest === `omra-${m}`)) return 'month';
  if (rest.startsWith('omra-depuis-')) return 'city';
  if (rest.startsWith('omra-')) return 'occasion';
  return null;
}

// ── loading ─────────────────────────────────────────────────────────────────
const SCRIPT_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
export const extractScripts = (html) => [...html.matchAll(SCRIPT_RE)].map((m) => m[1]);

/** Every prerendered locale route in the build, with its HTTP status. */
export function manifestRoutes() {
  const manifestPath = path.join(DIST, 'prerender-manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`no build output at ${DIST} (prerender-manifest.json missing) — run the build first`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return Object.keys(manifest.routes).filter((r) => /^\/(fr|ar|en)(\/|$)/.test(r)).sort();
}

/** Read one prerendered route: { route, locale, rest, type, status, html, scripts }. */
export function readRoute(route) {
  const [, locale, ...parts] = route.split('/');
  const rest = parts.join('/');
  const file = path.join(APP, `${route}.html`);
  // Next writes <route>.meta beside the HTML. A route that called notFound()
  // (a legal page whose row is not filled yet) prerenders as a 404 body with
  // status 404 there — that is not a page, and it is skipped, not audited.
  const metaFile = `${file.slice(0, -5)}.meta`;
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  const html = existsSync(file) ? readFileSync(file, 'utf8') : null;
  return { route, locale, rest, type: pageType(rest), status: meta.status ?? 200, html, scripts: html ? extractScripts(html) : [] };
}

export function loadPages() {
  return manifestRoutes().map(readRoute);
}

/** The prerendered sitemap body (src/app/sitemap.js), or null when not built. */
export function loadSitemap() {
  const file = path.join(APP, 'sitemap.xml.body');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/** First page of every page type × locale. */
export function representative(pages) {
  const seen = new Set();
  return pages.filter((p) => {
    const key = `${p.type}/${p.locale}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── text helpers ────────────────────────────────────────────────────────────
export const decode = (s) =>
  String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
export const norm = (s) => decode(s).replace(/\s+/g, ' ').trim().toLowerCase();
// Share of Arabic among the letters: a French sentence naming "Saudia Airlines
// (الخطوط السعودية)" is still French, an Arabic answer naming "Anjum" is still Arabic.
export const arabicShare = (s) => {
  const ar = (s.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (s.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  return ar + latin ? ar / (ar + latin) : 0;
};
export const FR_WORDS = /\b(le|la|les|des|du|au|aux|une|un|et|est|pour|avec|dès|nos|vos|votre|notre|sur|dans|par|cette|qui|que|chez)\b/gi;
export const EN_WORDS = /\b(the|and|from|with|of|to|for|your|our|is|are|this|that|which|an|at|by|you|we)\b/gi;
export const count = (s, re) => (s.match(re) ?? []).length;
