#!/usr/bin/env node
/**
 * scripts/seo-suite.mjs — the SEO regression suite. Every fix of the SEO
 * programme, as an assertion that fails the build.
 *
 *   npm run seo:suite                              # the build output (NEXT_DIST_DIR, default .next), ~10 s
 *   npm run seo:suite -- --self-test               # reintroduce every Phase-1 defect in memory, prove each is caught
 *   BASE_URL=https://wikitours.ma npm run seo:suite   # the same assertions against a live server
 *
 * Runs as npm `postbuild` (Vercel and CI both run `npm run build`), so a
 * regression never ships. It reads EVERY prerendered page — all page types ×
 * fr / ar / en — and the prerendered sitemap; no server, no database. Sections:
 *
 *   titles     30–65 chars; unique across every indexable route; no year before this one
 *   meta       description 120–165 chars; ends on a sentence (never an ellipsis or a cut word);
 *              unique; no year before this one
 *   canonical  present and self-referencing on every indexable page, one https origin
 *   hreflang   exactly fr / ar / en / x-default (x-default → fr); bare language codes only
 *              (hard constraint 3); each alternate is a 200 page that lists this page back
 *   sitemap    every indexable page is listed; nothing noindex is; every URL is a 200 page,
 *              hits no redirect rule, and carries a valid <lastmod>
 *   links      no internal link into a redirect (dated month hub, legacy path, missing
 *              locale, trailing slash, www) or a 404; the header and footer never link to a
 *              noindex page; every indexable page has ≥ 2 inbound links from other pages
 *   language   /ar: no Latin-script city name in visible text; /ar and /en: no French
 *              sentence (the pickLang() fallback) in the title, the description or any text
 *              block — customer reviews (<blockquote>) excepted, they are mixed by design
 *   schema     scripts/schema-audit.mjs, run as a step (it has its own --self-test)
 *   rendering  every page type in every locale serves its content in the HTML itself:
 *              a <main> with real text, one <h1>, no empty-state scaffold when indexable
 *
 * Page typing and the build-output loader are shared with the schema gate
 * (scripts/lib/build-pages.mjs); scripts/README.md says how to add a page type.
 * The redirect rules are the app's own — src/middleware.js § 1.4/1.5/3,
 * src/lib/redirects/legacy-map.js, MONTH_SLUGS — imported, not copied, which is
 * why `npm run seo:suite` loads tests/register.mjs (the `@/` alias).
 */
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { DIST, LOCALES, loadPages, loadSitemap, representative, extractScripts, decode, arabicShare, FR_WORDS, EN_WORDS, count } from './lib/build-pages.mjs';
import { resolveLegacyRedirect } from '@/lib/redirects/legacy-map';
import { MONTH_SLUGS } from '@/lib/months';
import { getDictionary } from '@/lib/i18n';
import { titleFloor } from '@/lib/titles';

const t0 = performance.now();
const ARGS = new Set(process.argv.slice(2));
const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
const YEAR = new Date().getFullYear();
// A JS-less client, like the AI crawlers: next.config's htmlLimitedBots matches
// "wt-seo-audit" so metadata blocks (a real 404 status, not a streamed 200).
const UA = 'Mozilla/5.0 (compatible; wt-seo-audit/1; +https://wikitours.ma) wt-seo-suite';

// ── the rules, in one place ─────────────────────────────────────────────────
const TITLE_MAX = 65; // the floor is per script: titleFloor(locale) in src/lib/titles.js (30, Arabic 20)
const DESC = [120, 165];
const MIN_INBOUND = 2;
// A JS-rendered shell leaves <main> with a handful of words (a loading label,
// a nav); real server-rendered content is well past this on every page type.
// It is a shell detector, not a content-length rule — thin pages are a
// content question, not a rendering one.
const RENDER_MIN_WORDS = 25;
const HREFLANGS = ['fr', 'ar', 'en', 'x-default'];
const REGION_CODE = /^[a-z]{2}-[a-z]{2}$/i;
// Latin-script forms of the departure cities (fr + en dictionaries). None may
// appear in Arabic visible text — the CITY_SLUGS-instead-of-cityName() trap.
const LATIN_CITIES = [...new Set([...Object.values(getDictionary('fr').cities ?? {}), ...Object.values(getDictionary('en').cities ?? {})])];
const LATIN_CITY_RE = new RegExp(`(?<![\\p{L}])(${LATIN_CITIES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}])`, 'u');
// A year in a title/description that is already behind us. A founding year
// ("depuis 2016", "since 2016", "منذ 2016") is a fact, not a stale date.
const YEAR_RE = /\b(20\d{2})\b/g;
const FOUNDING = /(depuis|since|منذ|fondée|founded|créée|established)\s+(en\s+|in\s+)?$/i;

// ── HTML → page model ───────────────────────────────────────────────────────
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? decode(m[1]) : null;
};
const metaContent = (head, name) => {
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) if ((attr(m[0], 'name') ?? '').toLowerCase() === name) return attr(m[0], 'content') ?? '';
  return '';
};
const linksRel = (head, rel) => [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => (attr(t, 'rel') ?? '').toLowerCase() === rel);
const STRIP_RE = /<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi;
const BLOCK_RE = /<\/?(?:p|h[1-6]|li|td|th|dt|dd|summary|figcaption|blockquote|div|section|article|header|footer|nav|main|aside|option|button|label|caption|details|ul|ol|table|tr|form|fieldset|legend|pre|address)\b[^>]*>|<br\s*\/?>/gi;
/** Visible text of an HTML fragment, one entry per block-level run. */
function textBlocks(fragment, { dropQuotes = true } = {}) {
  let s = fragment.replace(STRIP_RE, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  if (dropQuotes) s = s.replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, ' '); // reviews: mixed FR/AR/Darija by design (hard constraint 7)
  s = s.replace(BLOCK_RE, '\n').replace(/<[^>]+>/g, ' ');
  return decode(s).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const hrefsIn = (s) => [...s.matchAll(/<a\b[^>]*?\shref\s*=\s*"([^"]*)"/gi)].map((m) => decode(m[1]));
const isFrench = (s) => count(s, FR_WORDS) >= 3 && count(s, EN_WORDS) === 0;

const parsed = new WeakMap(); // raw page → model (the self-test re-parses only what it mutates)
function parsePage(p) {
  if (parsed.has(p)) return parsed.get(p);
  const html = p.html;
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  const bodyStart = html.search(/<body\b/i);
  const body = bodyStart > 0 ? html.slice(bodyStart) : html;
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? null;
  const header = body.match(/<header\b[\s\S]*?<\/header>/i)?.[0] ?? ''; // the first <header> is the site header
  const footers = [...body.matchAll(/<footer\b[\s\S]*?<\/footer>/gi)];
  const footer = footers.length ? footers[footers.length - 1][0] : ''; // the last <footer> is the site footer
  const blocks = textBlocks(body);
  const model = {
    ...p,
    title: decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim(),
    titles: (head.match(/<title[\s>]/gi) ?? []).length,
    description: metaContent(head, 'description').replace(/\s+/g, ' ').trim(),
    noindex: /noindex/i.test(metaContent(head, 'robots')),
    canonical: linksRel(head, 'canonical').map((t) => attr(t, 'href')).find(Boolean) ?? null,
    hreflang: linksRel(head, 'alternate').map((t) => ({ lang: attr(t, 'hreflang'), href: attr(t, 'href') })).filter((x) => x.lang),
    h1: (body.match(/<h1[\s>]/gi) ?? []).length,
    hasMain: main != null,
    mainWords: main ? words(textBlocks(main, { dropQuotes: false }).join(' ')) : 0,
    links: hrefsIn(body),
    navLinks: [...hrefsIn(header), ...hrefsIn(footer)],
    blocks,
    text: blocks.join('\n'),
    guardEmpty: /data-guard="empty"/.test(body),
  };
  parsed.set(p, model);
  return model;
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: decode(m[1].match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ''),
    lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null,
    alternates: [...m[1].matchAll(/<xhtml:link\b[^>]*>/g)].map((x) => ({ lang: attr(x[0], 'hreflang'), href: attr(x[0], 'href') })),
  }));
}

// ── URLs: what the app would do with them ───────────────────────────────────
const siteOrigin = (pages) => {
  const c = pages.map((p) => p.canonical).find(Boolean);
  try { return c ? new URL(c).origin : 'https://wikitours.ma'; } catch { return 'https://wikitours.ma'; }
};
/** { path, www } for a same-site href (query and hash dropped); null for external / non-http targets. */
function internalPath(href, site) {
  if (!href || /^(mailto:|tel:|javascript:|sms:|#)/i.test(href)) return null;
  let u;
  try { u = new URL(href, site); } catch { return null; }
  if (u.origin === site) return { path: u.pathname, www: false };
  if (u.hostname === `www.${new URL(site).hostname}`) return { path: u.pathname, www: true }; // still us — 308s to the apex
  return null;
}
const isAsset = (p) => /\.[a-z0-9]{2,5}$/i.test(p); // /sitemap.xml, /llms.txt, /brand/x.png — outside the locale router (middleware matcher)
const outsideRouter = (p) => isAsset(p) || /^\/(api|_next|admin)(\/|$)/.test(p);
const DATED_MONTH = new RegExp(`^/(${LOCALES.join('|')})/omra-(${MONTH_SLUGS.join('|')})-\\d{4}/?$`);
/** The redirect src/middleware.js (or Next) answers with: { status, to, why }, or null when the path is served. */
function redirectRule(path, www = false) {
  if (outsideRouter(path)) return null;
  if (www) return { status: 308, to: path, why: 'www → apex (hard constraint 2)' };
  if (path.length > 1 && path.endsWith('/')) return { status: 308, to: path.slice(0, -1), why: 'trailing slash — Next trailingSlash:false' };
  const dm = path.match(DATED_MONTH);
  if (dm) return { status: 301, to: `/${dm[1]}/omra-${dm[2]}`, why: 'dated month hub → evergreen, middleware § 1.4' };
  const legacy = resolveLegacyRedirect(path);
  if (legacy) return { status: legacy.status, to: legacy.to, why: 'legacy map, src/lib/redirects/legacy-map.js' };
  const first = path.split('/')[1] ?? '';
  if (!LOCALES.includes(first)) {
    if (/^[a-z]{2}(-[a-zA-Z]{2})?$/.test(first)) return null; // unsupported locale shape → rewritten to the 404 page
    return { status: 307, to: `/fr${path === '/' ? '' : path}`, why: 'no locale segment — Accept-Language redirect, middleware § 3' };
  }
  return null;
}
async function parallel(items, limit, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}
async function httpStatus(path) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, { method, redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) });
      if (res.status === 405 && method === 'HEAD') continue;
      const loc = res.headers.get('location');
      return { status: res.status, to: loc ? new URL(loc, BASE_URL).pathname : undefined, why: `HTTP ${res.status} from ${BASE_URL}` };
    } catch (e) {
      return { status: 0, why: `fetch failed: ${e.message}` };
    }
  }
  return { status: 0, why: 'no response' };
}
/** Resolve same-site paths → { status, to?, why }. Offline: the redirect rules + the build; with BASE_URL: the rules + HTTP. */
async function resolveAll(targets, built) {
  const out = new Map();
  const remote = [];
  for (const { path, www } of targets) {
    const key = (www ? 'www:' : '') + path;
    if (out.has(key)) continue;
    const rule = redirectRule(path, www);
    if (rule) { out.set(key, rule); continue; }
    if (outsideRouter(path)) { out.set(key, { status: 200, why: 'asset / api — outside the locale router' }); continue; }
    if (BASE_URL) { remote.push([key, path]); continue; }
    const page = built.get(path.replace(/\/$/, '') || '/');
    out.set(key, page
      ? { status: page.status, why: page.status === 200 ? 'prerendered' : 'prerendered as a 404 (no row yet)' }
      : { status: 404, why: 'not in the build output — no route prerenders it' });
  }
  await parallel(remote, 8, async ([key, path]) => { out.set(key, await httpStatus(path)); });
  return out;
}

// ── input ───────────────────────────────────────────────────────────────────
async function loadInput() {
  const built = loadPages(); // the route list always comes from the build — the sitemap cannot enumerate noindex pages
  if (!BASE_URL) return { pages: built, sitemapXml: loadSitemap() };
  const pages = [];
  await parallel(built, 8, async (p) => {
    try {
      const res = await fetch(`${BASE_URL}${p.route}`, { headers: { 'user-agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      const html = res.status === 200 ? await res.text() : null;
      pages.push({ ...p, status: res.status, html, scripts: html ? extractScripts(html) : [] });
    } catch (e) {
      pages.push({ ...p, status: 0, html: null, scripts: [], error: e.message });
    }
  });
  const sm = await fetch(`${BASE_URL}/sitemap.xml`, { headers: { 'user-agent': UA } }).catch(() => null);
  return { pages: pages.sort((a, b) => a.route.localeCompare(b.route)), sitemapXml: sm?.ok ? await sm.text() : null };
}

// ── the assertions ──────────────────────────────────────────────────────────
function pastYears(s) {
  const out = [];
  for (const m of s.matchAll(YEAR_RE)) {
    const y = +m[1];
    if (y < YEAR && !FOUNDING.test(s.slice(Math.max(0, m.index - 16), m.index))) out.push(y);
  }
  return out;
}

async function runSuite(rawPages, sitemapXml) {
  const failures = [];
  const fail = (section, route, msg) => failures.push({ section, route, msg });
  const built = new Map(rawPages.map((p) => [p.route, p]));
  const live = rawPages.filter((p) => p.status === 200 && p.html).map(parsePage);
  const indexable = live.filter((p) => !p.noindex);
  const site = siteOrigin(live);
  const byRoute = new Map(live.map((p) => [p.route, p]));
  const norm = (path) => path.replace(/\/$/, '') || '/';

  // titles · meta ───────────────────────────────────────────────────────────
  const seenTitle = new Map();
  const seenDesc = new Map();
  for (const p of indexable) {
    const t = p.title;
    if (!t) fail('titles', p.route, 'missing <title>');
    else {
      if (p.titles > 1) fail('titles', p.route, `${p.titles} <title> tags`);
      const floor = titleFloor(p.locale);
      if (t.length < floor || t.length > TITLE_MAX) fail('titles', p.route, `title ${t.length} chars (want ${floor}–${TITLE_MAX}): "${t}"`);
      if (seenTitle.has(t)) fail('titles', p.route, `duplicate title with ${seenTitle.get(t)}: "${t}"`);
      else seenTitle.set(t, p.route);
      for (const y of pastYears(t)) fail('titles', p.route, `hardcoded past year ${y} in the title: "${t}"`);
    }
    const d = p.description;
    if (!d) fail('meta', p.route, 'missing meta description');
    else {
      if (d.length < DESC[0] || d.length > DESC[1]) fail('meta', p.route, `description ${d.length} chars (want ${DESC[0]}–${DESC[1]}): "${d.slice(0, 70)}…"`);
      if (/(\.\.\.|…)\s*$/.test(d)) fail('meta', p.route, `description ends with an ellipsis — a clamp cut it: "…${d.slice(-50)}"`);
      else if (!/[.!?»)"”’]\s*$/.test(d)) fail('meta', p.route, `description ends mid-sentence, without terminal punctuation (cut mid-word?): "…${d.slice(-50)}"`);
      if (seenDesc.has(d)) fail('meta', p.route, `duplicate description with ${seenDesc.get(d)}`);
      else seenDesc.set(d, p.route);
      for (const y of pastYears(d)) fail('meta', p.route, `hardcoded past year ${y} in the description: "…${d.slice(Math.max(0, d.indexOf(String(y)) - 30), d.indexOf(String(y)) + 10)}…"`);
    }
  }

  // canonical · hreflang ────────────────────────────────────────────────────
  for (const p of live) {
    if (!p.noindex) {
      if (!p.canonical) fail('canonical', p.route, 'missing canonical');
      else {
        let c = null;
        try { c = new URL(p.canonical); } catch { /* not a URL */ }
        if (!c || c.origin !== site) fail('canonical', p.route, `canonical is not on the site origin ${site}: ${p.canonical}`);
        else if (norm(c.pathname) !== p.route) fail('canonical', p.route, `canonical not self-referencing: ${c.pathname} (hard constraint 1: each locale self-canonicalises)`);
      }
    }
    const langs = p.hreflang.map((a) => a.lang.toLowerCase());
    for (const need of HREFLANGS) if (!langs.includes(need)) fail('hreflang', p.route, `missing hreflang ${need}`);
    for (const a of p.hreflang) {
      const lang = a.lang.toLowerCase();
      if (REGION_CODE.test(lang)) { fail('hreflang', p.route, `region-coded hreflang ${a.lang} — bare language codes only (hard constraint 3)`); continue; }
      if (!HREFLANGS.includes(lang)) { fail('hreflang', p.route, `unexpected hreflang ${a.lang}`); continue; }
      const target = internalPath(a.href, site);
      const expected = `/${lang === 'x-default' ? 'fr' : lang}${p.rest ? `/${p.rest}` : ''}`;
      if (!target || target.www || norm(target.path) !== expected) { fail('hreflang', p.route, `hreflang ${a.lang} → ${a.href} (expected ${site}${expected})`); continue; }
      const tp = byRoute.get(expected);
      if (!tp) { fail('hreflang', p.route, `hreflang ${a.lang} → ${expected} does not resolve to a 200 page`); continue; }
      const back = tp.hreflang.find((b) => (b.lang ?? '').toLowerCase() === p.locale);
      const backPath = back ? internalPath(back.href, site) : null;
      if (!backPath || norm(backPath.path) !== p.route) fail('hreflang', p.route, `hreflang not reciprocal: ${expected} does not list ${p.route} as hreflang ${p.locale}`);
    }
  }

  // sitemap ─────────────────────────────────────────────────────────────────
  if (sitemapXml == null) fail('sitemap', '/sitemap.xml', BASE_URL ? `sitemap not served by ${BASE_URL}` : `sitemap not in the build output (${DIST}/server/app/sitemap.xml.body)`);
  else {
    const listed = new Map();
    for (const e of parseSitemap(sitemapXml)) {
      const ip = internalPath(e.loc, site);
      const path = ip ? norm(ip.path) : e.loc;
      if (listed.has(path)) fail('sitemap', path, 'listed twice in the sitemap');
      listed.set(path, e);
      if (!ip) { fail('sitemap', path, `sitemap <loc> is not on ${site}`); continue; }
      if (!e.lastmod) fail('sitemap', path, 'sitemap URL without <lastmod>');
      else if (Number.isNaN(Date.parse(e.lastmod))) fail('sitemap', path, `sitemap <lastmod> is not a date: ${e.lastmod}`);
      for (const a of e.alternates) if (REGION_CODE.test(a.lang ?? '')) fail('sitemap', path, `region-coded hreflang ${a.lang} in the sitemap (hard constraint 3)`);
    }
    const resolved = await resolveAll([...listed.keys()].map((path) => ({ path, www: false })), built);
    for (const path of listed.keys()) {
      const r = resolved.get(path);
      if (r.status >= 300 && r.status < 400) fail('sitemap', path, `sitemap URL redirects (${r.status} → ${r.to}; ${r.why})`);
      else if (r.status !== 200) fail('sitemap', path, `sitemap URL is not a 200 page (${r.status}; ${r.why})`);
      else if (byRoute.get(path)?.noindex) fail('sitemap', path, 'sitemap lists a noindex page');
    }
    for (const p of indexable) if (!listed.has(p.route)) fail('sitemap', p.route, 'indexable page missing from the sitemap');
  }

  // links ───────────────────────────────────────────────────────────────────
  const inbound = new Map(); // route → Set(source routes)
  const targets = new Map(); // key → { path, www, sources, navSources }
  for (const p of live) {
    const add = (href, nav) => {
      const ip = internalPath(href, site);
      if (!ip) return;
      const key = (ip.www ? 'www:' : '') + ip.path;
      const t = targets.get(key) ?? targets.set(key, { ...ip, sources: new Set(), navSources: new Set() }).get(key);
      t.sources.add(p.route);
      if (nav) t.navSources.add(p.route);
      const dest = norm(ip.path);
      if (!ip.www && dest !== p.route) (inbound.get(dest) ?? inbound.set(dest, new Set()).get(dest)).add(p.route);
    };
    p.links.forEach((h) => add(h, false));
    p.navLinks.forEach((h) => add(h, true));
  }
  const resolvedLinks = await resolveAll([...targets.values()], built);
  const list = (set) => [...set].slice(0, 3).join(', ') + (set.size > 3 ? ` (+${set.size - 3} more)` : '');
  const restOf = (route) => route.split('/').slice(2).join('/');
  for (const [key, t] of targets) {
    const r = resolvedLinks.get(key);
    const shown = (t.www ? 'www:' : '') + t.path;
    if (r.status >= 300 && r.status < 400) fail('links', shown, `internal link to a ${r.status} → ${r.to} (${r.why}); linked from ${list(t.sources)}`);
    else if (r.status !== 200) fail('links', shown, `internal link to a ${r.status} (${r.why}); linked from ${list(t.sources)}`);
    else if (byRoute.get(norm(t.path))?.noindex) {
      // The header's language switcher links the current page's own locale
      // siblings — on a noindex page those are noindex too, and that is not the
      // global nav pointing the site at a noindex URL. Every other nav source is.
      const navFrom = new Set([...t.navSources].filter((src) => restOf(src) !== restOf(norm(t.path))));
      if (navFrom.size) fail('links', shown, `global nav (header/footer) links to a noindex page; on ${list(navFrom)}`);
    }
  }
  for (const p of indexable) {
    const n = inbound.get(p.route)?.size ?? 0;
    if (n < MIN_INBOUND) fail('links', p.route, `orphan: ${n} inbound internal link${n === 1 ? '' : 's'} from other pages (want ≥ ${MIN_INBOUND})`);
  }

  // language ────────────────────────────────────────────────────────────────
  for (const p of live) {
    if (p.locale === 'ar') {
      if (p.title && arabicShare(p.title) < 0.3) fail('language', p.route, `title carries no Arabic script on an Arabic page: "${p.title}"`);
      if (p.description && arabicShare(p.description) < 0.3) fail('language', p.route, `description carries no Arabic script on an Arabic page: "${p.description.slice(0, 60)}…"`);
      const city = p.text.match(LATIN_CITY_RE);
      if (city) {
        const at = p.text.indexOf(city[1]);
        fail('language', p.route, `Latin-script city name "${city[1]}" in Arabic visible text — use cityName(slug, locale): "…${p.text.slice(Math.max(0, at - 30), at + 30).replace(/\n/g, ' ')}…"`);
      }
      const french = p.blocks.filter((b) => b.length >= 40 && arabicShare(b) < 0.3 && count(b, FR_WORDS) >= 2);
      for (const b of french.slice(0, 3)) fail('language', p.route, `French text on an Arabic page (pickLang() fallback?): "${b.slice(0, 90)}"`);
      if (french.length > 3) fail('language', p.route, `… and ${french.length - 3} more French block${french.length - 3 > 1 ? 's' : ''}`);
    } else if (p.locale === 'en') {
      if (p.title && isFrench(p.title)) fail('language', p.route, `French title on an English page: "${p.title}"`);
      if (p.description && isFrench(p.description)) fail('language', p.route, `French description on an English page: "${p.description.slice(0, 60)}…"`);
      const french = p.blocks.filter((b) => b.length >= 40 && isFrench(b));
      for (const b of french.slice(0, 3)) fail('language', p.route, `French text on an English page (pickLang() fallback?): "${b.slice(0, 90)}"`);
      if (french.length > 3) fail('language', p.route, `… and ${french.length - 3} more French block${french.length - 3 > 1 ? 's' : ''}`);
    }
  }

  // rendering ───────────────────────────────────────────────────────────────
  for (const p of live) if (p.type == null) fail('rendering', p.route, 'unclassified route — add it to STATIC/DYNAMIC in scripts/lib/build-pages.mjs (scripts/README.md)');
  for (const p of representative(live)) {
    if (!p.hasMain) { fail('rendering', p.route, 'no <main> in the served HTML'); continue; }
    if (p.h1 !== 1) fail('rendering', p.route, `${p.h1} <h1> in the served HTML (want 1)`);
    if (p.mainWords < RENDER_MIN_WORDS) fail('rendering', p.route, `<main> carries ${p.mainWords} words in the served HTML (want ≥ ${RENDER_MIN_WORDS}) — content must not depend on JavaScript (hard constraint 5)`);
    if (!p.noindex && p.guardEmpty) fail('rendering', p.route, 'indexable page serves its data-guard="empty" scaffold state');
  }

  return { failures, live: live.length, indexable: indexable.length, site };
}

const SECTIONS = ['titles', 'meta', 'canonical', 'hreflang', 'sitemap', 'links', 'language', 'schema', 'rendering'];

function schemaStep(extra = []) {
  const r = spawnSync(process.execPath, ['scripts/schema-audit.mjs', ...extra], { stdio: 'inherit', env: process.env });
  return r.status === 0;
}

// ── self-test: every Phase-1 defect, reintroduced in memory and caught ─────
async function selfTest(rawPages, sitemapXml) {
  const live = rawPages.filter((p) => p.status === 200 && p.html);
  const pick = (type, locale = 'fr') => live.find((p) => p.type === type && p.locale === locale)?.route;
  const home = pick('home');
  const homeAr = pick('home', 'ar');
  const homeEn = pick('home', 'en');
  const city = pick('city');
  const hub = pick('bab-makka');
  const hubAr = pick('bab-makka', 'ar');
  const hotelsHub = pick('hotels-omra');
  const glossary = pick('glossaire');
  const noindexPage = live.find((p) => parsePage(p).noindex && p.locale === 'fr')?.route ?? null;
  const site = siteOrigin(live.map(parsePage));
  const edit = (route, fn) => rawPages.map((p) => (p.route === route ? { ...p, html: fn(p.html) } : p));
  const editAll = (fn) => rawPages.map((p) => (p.html ? { ...p, html: fn(p.html, p) } : p));
  const inHead = (fn) => (html) => { const i = html.search(/<\/head>/i); return fn(html.slice(0, i)) + html.slice(i); };
  const inMain = (snippet) => (html) => html.replace(/(<main\b[^>]*>)/i, `$1${snippet}`);
  const setTitle = (t) => inHead((h) => h.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${t}</title>`));
  const setDesc = (fn) => inHead((h) => h.replace(/(<meta\b[^>]*name="description"[^>]*content=")([^"]*)(")/i, (_, a, d, c) => a + fn(decode(d)).replace(/"/g, '&quot;') + c));
  const desc = (route) => parsePage(rawPages.find((p) => p.route === route)).description;
  const title = (route) => parsePage(rawPages.find((p) => p.route === route)).title;
  const LONG_TITLE = 'Omra 2026 depuis le Maroc : programmes, hôtels proches du Haram et prix réels | Bab Makka';
  const FRENCH = 'Une Omra depuis le Maroc avec une agence agréée, des hôtels proches du Haram et des prix réels pour votre départ.';
  const smAdd = (loc) => sitemapXml.replace('</urlset>', `<url><loc>${site}${loc}</loc><lastmod>2026-09-01T00:00:00.000Z</lastmod></url></urlset>`);
  const smBlock = (loc) => new RegExp(`<url>\\s*<loc>${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${loc}</loc>[\\s\\S]*?</url>`);

  // [section, description, mutate → { pages?, sitemap? }, expected message fragment, skip reason]
  const MUTATIONS = [
    ['titles', 'a 22-char title', () => ({ pages: edit(city, setTitle('Omra depuis Casablanca')) }), 'title 22 chars'],
    ['titles', `a ${LONG_TITLE.length}-char title`, () => ({ pages: edit(home, setTitle(LONG_TITLE)) }), `title ${LONG_TITLE.length} chars`],
    ['titles', 'the same title on two routes', () => ({ pages: edit(hub, setTitle(title(home))) }), `duplicate title with ${home}`],
    ['titles', `${YEAR - 1} hardcoded in a title`, () => ({ pages: edit(home, setTitle(title(home).replace(/20\d{2}/, String(YEAR - 1)) + (/20\d{2}/.test(title(home)) ? '' : ` ${YEAR - 1}`))) }), `hardcoded past year ${YEAR - 1} in the title`],
    ['meta', 'a 44-char description', () => ({ pages: edit(hub, setDesc(() => 'Programmes et prix Omra depuis le Maroc.')) }), 'description 40 chars'],
    ['meta', 'a description clamped with an ellipsis', () => ({ pages: edit(home, setDesc((d) => `${d.slice(0, 140)}…`)) }), 'ends with an ellipsis'],
    ['meta', 'a description cut mid-word', () => ({ pages: edit(home, setDesc((d) => d.replace(/[.!?»)"”’]\s*$/, '').slice(0, -3))) }), 'ends mid-sentence'],
    ['meta', `${YEAR - 1} hardcoded in a description`, () => ({ pages: edit(home, setDesc((d) => d.replace(/^./, `Omra ${YEAR - 1} : `))) }), `hardcoded past year ${YEAR - 1} in the description`],
    ['canonical', 'the Arabic page canonicalising to the French URL', () => ({ pages: edit(homeAr, inHead((h) => h.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*/i, `$1${site}${home}`))) }), 'canonical not self-referencing'],
    ['hreflang', 'a region-coded alternate (fr-MA)', () => ({ pages: edit(home, inHead((h) => h.replace(/hreflang="fr"/i, 'hrefLang="fr-MA"'))) }), 'region-coded hreflang fr-MA'], // React renders the attribute as hrefLang
    ['hreflang', 'x-default removed', () => ({ pages: edit(home, inHead((h) => h.replace(/<link\b[^>]*hreflang="x-default"[^>]*>/i, ''))) }), 'missing hreflang x-default'],
    ['hreflang', 'an alternate pointing at the wrong URL', () => ({ pages: edit(hub, inHead((h) => h.replace(/(hreflang="ar"[^>]*href=")[^"]*/i, `$1${site}/ar/bab-makka-nope`).replace(/(href=")[^"]*("[^>]*hreflang="ar")/i, `$1${site}/ar/bab-makka-nope$2`))) }), `expected ${site}/ar/bab-makka`],
    ['hreflang', 'an alternate whose page is not built', () => ({ pages: rawPages.filter((p) => p.route !== hubAr) }), `hreflang ar → ${hubAr} does not resolve to a 200 page`],
    ['hreflang', 'a one-way alternate (ar page no longer lists fr)', () => ({ pages: edit(hubAr, inHead((h) => h.replace(/<link\b[^>]*hreflang="fr"[^>]*>/i, ''))) }), `hreflang not reciprocal: ${hubAr} does not list ${hub}`],
    ['sitemap', 'a noindex page listed in the sitemap', () => ({ pages: edit(hotelsHub, inHead((h) => h.replace('</title>', '</title><meta name="robots" content="noindex, follow"/>'))) }), 'sitemap lists a noindex page'],
    ['sitemap', 'an indexable page dropped from the sitemap', () => ({ sitemap: sitemapXml.replace(smBlock(hotelsHub), '') }), 'indexable page missing from the sitemap'],
    ['sitemap', 'a sitemap URL without <lastmod>', () => ({ sitemap: sitemapXml.replace(smBlock(hotelsHub), (b) => b.replace(/<lastmod>[^<]*<\/lastmod>/, '')) }), 'sitemap URL without <lastmod>'],
    ['sitemap', 'a dated month URL in the sitemap (301)', () => ({ sitemap: smAdd('/fr/omra-octobre-2026') }), 'sitemap URL redirects (301 → /fr/omra-octobre'],
    ['sitemap', 'a URL that 404s in the sitemap', () => ({ sitemap: smAdd('/fr/page-inexistante') }), 'sitemap URL is not a 200 page (404'],
    ['links', 'a link to a dated month hub (301)', () => ({ pages: edit(home, inMain('<a href="/fr/omra-octobre-2026">x</a>')) }), 'internal link to a 301 → /fr/omra-octobre'],
    ['links', 'a link to the legacy spelling /bab-makkah (301)', () => ({ pages: edit(home, inMain('<a href="/fr/bab-makkah">x</a>')) }), 'internal link to a 301 → /fr/bab-makka (legacy map'],
    ['links', 'a link without a locale segment (307)', () => ({ pages: edit(home, inMain('<a href="/bab-makka">x</a>')) }), 'internal link to a 307 → /fr/bab-makka'],
    ['links', 'a link with a trailing slash (308)', () => ({ pages: edit(home, inMain('<a href="/fr/bab-makka/">x</a>')) }), 'internal link to a 308 → /fr/bab-makka'],
    ['links', 'a link to www. (308)', () => ({ pages: edit(home, inMain(`<a href="${site.replace('://', '://www.')}/fr/bab-makka">x</a>`)) }), 'internal link to a 308'],
    ['links', 'a link to a page that does not exist (404)', () => ({ pages: edit(home, inMain('<a href="/fr/page-inexistante">x</a>')) }), 'internal link to a 404'],
    ['links', 'a header link to a noindex page', () => ({ pages: edit(home, (h) => h.replace(/(<header\b[^>]*>)/i, `$1<a href="${noindexPage}">x</a>`)) }), 'global nav (header/footer) links to a noindex page', noindexPage ? null : 'no noindex page in this build'],
    ['links', 'every link to the glossary removed (orphan)', () => ({ pages: editAll((h) => h.replace(new RegExp(`href="${glossary}(?:[#?][^"]*)?"`, 'g'), `href="${hub}"`)) }), 'orphan: 0 inbound internal links'], // incl. the #term deep links
    ['language', 'a Latin city name on the Arabic home', () => ({ pages: edit(homeAr, inMain('<p>عمرة انطلاقاً من Casablanca</p>')) }), 'Latin-script city name "Casablanca"'],
    ['language', 'a French paragraph on the Arabic home (pickLang fallback)', () => ({ pages: edit(homeAr, inMain(`<p>${FRENCH}</p>`)) }), 'French text on an Arabic page'],
    ['language', 'a French paragraph on the English home (pickLang fallback)', () => ({ pages: edit(homeEn, inMain(`<p>${FRENCH}</p>`)) }), 'French text on an English page'],
    ['language', 'a French description on the English home', () => ({ pages: edit(homeEn, setDesc(() => FRENCH)) }), 'French description on an English page'],
    ['rendering', 'the home <main> emptied (content left to JavaScript)', () => ({ pages: edit(home, (h) => h.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, '<main><h1>Omra</h1></main>')) }), '<main> carries 1 words'],
    ['rendering', 'the <h1> removed', () => ({ pages: edit(home, (h) => h.replace(/<h1\b/i, '<h2').replace(/<\/h1>/i, '</h2>')) }), '0 <h1> in the served HTML'],
    ['rendering', 'an indexable page serving its empty scaffold', () => ({ pages: edit(city, inMain('<div data-guard="empty"></div>')) }), 'serves its data-guard="empty" scaffold state'],
  ];

  const baseline = new Set((await runSuite(rawPages, sitemapXml)).failures.map((f) => `${f.section}|${f.route}|${f.msg}`));
  console.log(`\nself-test — ${MUTATIONS.length} deliberate breakages, each must produce its specific failure\n`);
  let undetected = 0;
  for (const [section, what, mutate, expected, skip] of MUTATIONS) {
    if (skip) { console.log(`  – ${section.padEnd(9)} ${what}: ${skip}, skipped`); continue; }
    const { pages = rawPages, sitemap = sitemapXml } = mutate();
    const fresh = (await runSuite(pages, sitemap)).failures.filter((f) => !baseline.has(`${f.section}|${f.route}|${f.msg}`));
    const hit = fresh.find((f) => f.section === section && f.msg.includes(expected));
    if (hit) console.log(`  ✓ ${section.padEnd(9)} ${what}\n      → ${hit.route}: ${hit.msg}`);
    else {
      undetected++;
      console.log(`  ✗ ${section.padEnd(9)} ${what}: NOT DETECTED (expected "${expected}"; got ${fresh.length ? fresh.slice(0, 4).map((f) => `${f.section} ${f.route}: ${f.msg}`).join(' | ') : 'nothing new'})`);
    }
  }
  console.log(`\n${MUTATIONS.length - undetected}/${MUTATIONS.length} breakages caught`);
  console.log('\nschema — scripts/schema-audit.mjs --self-test');
  const schemaOk = schemaStep(['--self-test']);
  return undetected === 0 && schemaOk;
}

// ── main ────────────────────────────────────────────────────────────────────
const { pages, sitemapXml } = await loadInput();
const skipped = pages.filter((p) => p.status !== 200);

if (ARGS.has('--self-test')) {
  process.exit((await selfTest(pages, sitemapXml)) ? 0 : 1);
}

console.log(`seo-suite → ${BASE_URL || DIST} (${pages.length - skipped.length} pages, ${LOCALES.length} locales)`);
if (skipped.length) console.log(`  skipped ${skipped.length} non-200 route${skipped.length > 1 ? 's' : ''}: ${skipped.map((p) => `${p.route} (${p.status})`).join(', ')}`);
const { failures, live, indexable } = await runSuite(pages, sitemapXml);
const bySection = new Map(SECTIONS.map((s) => [s, failures.filter((f) => f.section === s)]));
for (const s of SECTIONS) {
  if (s === 'schema') continue;
  const n = bySection.get(s).length;
  console.log(`  ${n ? '✗' : '✓'} ${s.padEnd(10)} ${n ? `${n} failure${n > 1 ? 's' : ''}` : 'ok'}`);
}
console.log(`  · schema     → scripts/schema-audit.mjs${BASE_URL ? ' (reads the build output, not the server)' : ''}`);
const schemaOk = ARGS.has('--no-schema') ? true : schemaStep();
if (!schemaOk) failures.push({ section: 'schema', route: '(schema-audit)', msg: 'scripts/schema-audit.mjs failed — see above' });
if (failures.length) {
  console.log(`\nFAILURES (${failures.length})`);
  for (const f of failures) console.log(`  ✗ [${f.section}] ${f.route} · ${f.msg}`);
}
const secs = ((performance.now() - t0) / 1000).toFixed(1);
console.log(`\n${live} pages (${indexable} indexable) · ${failures.length} failure${failures.length === 1 ? '' : 's'} · ${secs}s`);
process.exit(failures.length ? 1 : 0);
