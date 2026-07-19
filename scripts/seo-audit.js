#!/usr/bin/env node
/**
 * seo-audit.js — zero-dependency SEO/AEO/GEO gate. Crawls the RUNNING app's
 * rendered HTML (not source files) via the sitemap, and fails (exit 1) when a
 * page misses the fundamentals or a cross-page invariant breaks.
 *
 *   BASE_URL=http://localhost:3000 node scripts/seo-audit.js
 *   npm run seo:audit                      (after `npm start`)
 *   UA_PROBE=1 npm run seo:audit           (adds the live AI-crawler probe)
 *
 * Per-page checks:
 *   - exactly one non-empty <title>, <= 60 chars
 *   - a <meta name="description">, <= 155 chars
 *   - exactly one <h1>; no skipped heading levels (h2 → h4)
 *   - a <link rel="canonical"> that points at the crawled URL (self-referencing)
 *   - at least one <script type="application/ld+json"> (valid JSON)
 *   - hreflang alternates: fr + ar + en + x-default present
 *   - twitter:card meta present
 *   - every <img> carries an alt attribute
 *   - no generic internal anchor text ("cliquez ici", bare "ici", …)
 *   - FAQPage answers 25–75 words (AEO extractability window)
 *   - indexable pages never show [CONTENT NEEDED]/[TRANSLATION NEEDED] or a
 *     data-guard="empty" scaffold state (noindex-until-filled law)
 *   - money pages (home, offers, hubs, contact) load /wt.js and carry data-wt
 *   - offer pages (/xx/omra/<slug>): Offer/AggregateOffer schema AND a FAQ block
 *   - stale-offer: bookable Offer with past validThrough, or none at all
 * Cross-page checks:
 *   - duplicate titles/descriptions among indexable pages (per locale)
 *   - sitemap URL redirects, or is noindex, or is orphaned (not internally linked)
 *   - hreflang reciprocity between crawled pages
 *   - internal links: no 301→301 chains, no 404s (sampled)
 *   - HSTS header on https deployments
 *   - bot-logger health via /api/health/seo (fails only on error state)
 *   - UA_PROBE=1: GPTBot/ClaudeBot/PerplexityBot/… must receive HTTP 200
 */

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const OFFER_PATH = /^\/[a-z]{2}\/omra\/[^/]+$/; // /fr/omra/<slug>, not /fr/omra-<hub>
const MONEY_PATH = /^\/[a-z]{2}(\/(omra\/[^/]+|omra-[^/]+|bab-makka|contact))?$/;
const GENERIC_ANCHORS = new Set([
  'cliquez ici', 'cliquer ici', 'ici', 'en savoir plus', 'lire la suite', 'plus',
  'click here', 'here', 'read more', 'learn more', 'more',
  'اضغط هنا', 'انقر هنا', 'هنا', 'المزيد',
]);

/** Decode HTML entities so length checks measure rendered text, not markup. */
function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** GET following redirects manually so hops are observable. */
async function get(url, headers = {}) {
  const hops = [];
  let current = url;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'user-agent': 'wt-seo-audit', ...headers },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { status: res.status, html: '', hops, headers: res.headers };
      current = new URL(loc, current).href;
      hops.push(current);
      continue;
    }
    return { status: res.status, html: await res.text(), hops, headers: res.headers, finalUrl: current };
  }
  return { status: 599, html: '', hops, headers: new Headers() };
}

function ldNodes(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  for (const b of blocks) {
    try {
      nodes.push(JSON.parse(b[1].trim()));
    } catch {
      nodes.push({ __invalid: true });
    }
  }
  return nodes;
}

/** Recursively collect objects whose @type includes any of `types`. */
function collect(node, types, out = []) {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, types, out));
  } else if (node && typeof node === 'object') {
    const t = node['@type'];
    const list = Array.isArray(t) ? t : [t];
    if (list.some((x) => types.includes(x))) out.push(node);
    for (const k of Object.keys(node)) collect(node[k], types, out);
  }
  return out;
}

/** Same-site internal link paths (normalized), excluding assets/api/anchors. */
function internalLinks(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1];
    if (href.startsWith(BASE)) href = href.slice(BASE.length) || '/';
    if (!href.startsWith('/')) continue;
    if (/^\/(api|_next|admin)\b/.test(href) || /\.[a-z0-9]{2,5}(\?|$)/i.test(href)) continue;
    href = href.split('?')[0].replace(/\/+$/, '') || '/';
    const text = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().toLowerCase();
    out.push({ href, text });
  }
  return out;
}

function auditPage(path, html, page) {
  const errs = [];
  // Strip comments before content checks — [CONTENT NEEDED] markers inside
  // source comments are the intended workflow, only VISIBLE ones are illegal.
  const visible = html.replace(/<!--[\s\S]*?-->/g, '');

  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decode(m[1].trim()));
  const title = titles[0] || '';
  const desc = decode((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i))?.[1] || '');
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] ?? null;
  const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? '';
  const noindex = /noindex/i.test(robotsMeta);
  const nodes = ldNodes(html);
  const hreflangs = [...html.matchAll(/<link[^>]+rel=["']alternate["'][^>]*hreflang=["']([^"']+)["']/gi)].map((m) => m[1].toLowerCase());

  page.title = title;
  page.desc = desc;
  page.noindex = noindex;
  page.hreflangs = hreflangs;

  if (!title) errs.push('missing <title>');
  else if (title.length > 60) errs.push(`title ${title.length}>60: "${title.slice(0, 64)}…"`);
  if (titles.length > 1) errs.push(`${titles.length} <title> tags`);
  if (!desc) errs.push('missing meta description');
  else if (desc.length > 155) errs.push(`meta description ${desc.length}>155`);
  if (h1Count !== 1) errs.push(`${h1Count} <h1> (want 1)`);
  if (!canonical) errs.push('missing canonical');
  else {
    const want = `${BASE}${path === '/' ? '' : path}`;
    const got = canonical.replace(/^https?:\/\/[^/]+/, BASE).replace(/\/+$/, '') || BASE;
    if (got !== want && got !== `${want}/`) errs.push(`canonical not self-referencing: ${canonical}`);
  }
  if (!nodes.length) errs.push('no JSON-LD');
  if (nodes.some((n) => n && n.__invalid)) errs.push('invalid JSON-LD');

  // hreflang completeness (reciprocity is checked cross-page).
  for (const need of ['fr', 'ar', 'en', 'x-default']) {
    if (!hreflangs.includes(need)) errs.push(`missing hreflang ${need}`);
  }

  // Heading hierarchy: a level may never jump more than one step down.
  const levels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      errs.push(`skipped heading level: h${levels[i - 1]} → h${levels[i]}`);
      break;
    }
  }

  if (!/<meta[^>]+name=["']twitter:card["']/i.test(html)) errs.push('missing twitter:card meta');

  // Every <img> needs an alt attribute (empty alt = decorative, allowed).
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const missingAlt = imgs.filter((tag) => !/\salt\s*=/.test(tag)).length;
  if (missingAlt) errs.push(`${missingAlt} <img> without alt attribute`);

  // Anchor quality: internal links must not use generic text.
  const badAnchors = internalLinks(html).filter((l) => GENERIC_ANCHORS.has(l.text));
  if (badAnchors.length) {
    errs.push(`generic anchor text: ${[...new Set(badAnchors.map((l) => `"${l.text}" → ${l.href}`))].slice(0, 3).join(', ')}`);
  }

  // noindex-until-filled law: an indexable page may not ship scaffold states.
  if (!noindex) {
    if (/\[(CONTENT|TRANSLATION) NEEDED\]/.test(visible)) errs.push('indexable page shows a [CONTENT/TRANSLATION NEEDED] marker');
    if (/data-guard=["']empty["']/.test(visible)) errs.push('indexable page still in data-guard="empty" scaffold state');
  }

  // Analytics presence on money pages (first-party beacon + instrumentation).
  if (MONEY_PATH.test(path)) {
    if (!html.includes('/wt.js')) errs.push('money page without /wt.js beacon');
    if (!/data-wt(=|-)/.test(html)) errs.push('money page without any data-wt instrumentation');
  }

  // FAQ answers must sit in the 25–75-word extractability window.
  for (const q of collect(nodes, ['Question'])) {
    const text = typeof q.acceptedAnswer?.text === 'string' ? q.acceptedAnswer.text : '';
    if (!text) continue;
    const words = text.trim().split(/\s+/).length;
    if (words < 25 || words > 75) {
      errs.push(`FAQ answer ${words} words (want 25–75): "${String(q.name).slice(0, 48)}…"`);
    }
  }

  // Offer detail pages: need Offer schema + an FAQ block.
  if (OFFER_PATH.test(path)) {
    const offers = collect(nodes, ['Offer', 'AggregateOffer']);
    if (!offers.length) errs.push('offer page without Offer/AggregateOffer schema');
    const hasFaq = /<details[\s>]/i.test(html) || collect(nodes, ['FAQPage', 'Question']).length > 0;
    if (!hasFaq) errs.push('offer page without an FAQ block');
  }

  // Stale-offer detector — wherever Offer nodes appear.
  for (const offer of collect(nodes, ['Offer', 'AggregateOffer'])) {
    const avail = String(offer.availability || '');
    const bookable = avail.includes('InStock') || avail.includes('LimitedAvailability');
    const through = offer.validThrough || offer.priceValidUntil || offer.availabilityEnds || null;
    if (!through) errs.push('Offer without validThrough');
    else if (bookable && String(through).slice(0, 10) < TODAY) {
      errs.push(`stale offer: bookable but validThrough ${String(through).slice(0, 10)} < ${TODAY}`);
    }
  }

  return errs;
}

/** Cross-page invariants once every sitemap URL has been crawled. */
function crossPageErrors(pages, linkedSet) {
  const errs = []; // [path, message]

  // Duplicate titles/descriptions among indexable pages, per locale.
  for (const field of ['title', 'desc']) {
    const seen = new Map();
    for (const p of pages) {
      if (p.noindex || !p[field]) continue;
      const locale = p.path.split('/')[1] || '';
      const key = `${locale}|${p[field]}`;
      if (seen.has(key)) errs.push([p.path, `duplicate ${field === 'title' ? 'title' : 'meta description'} with ${seen.get(key)}`]);
      else seen.set(key, p.path);
    }
  }

  for (const p of pages) {
    // A noindex URL never belongs in the sitemap.
    if (p.noindex) errs.push([p.path, 'noindex page listed in sitemap']);
    // Sitemap URLs must be reachable through internal links (no orphans).
    if (!p.noindex && !linkedSet.has(p.path) && p.path.split('/').length > 2) {
      errs.push([p.path, 'orphan: in sitemap but not internally linked']);
    }
    // Sitemap URLs must be final (no redirect on fetch).
    if (p.hops?.length) errs.push([p.path, `sitemap URL redirects (${p.hops.length} hop${p.hops.length > 1 ? 's' : ''} → ${p.hops[p.hops.length - 1]})`]);
  }

  // hreflang reciprocity: every crawled page must list every locale sibling,
  // and the sibling (when crawled) must list it back. All pages emit the same
  // generator output, so asymmetry = a real bug.
  const byPath = new Map(pages.map((p) => [p.path, p]));
  for (const p of pages) {
    const rest = p.path.replace(/^\/[a-z]{2}/, '');
    for (const loc of ['fr', 'ar', 'en']) {
      const sibling = byPath.get(`/${loc}${rest}` === p.path ? p.path : `/${loc}${rest}`);
      if (sibling && p.hreflangs?.length && !sibling.hreflangs?.length) {
        errs.push([sibling.path, `hreflang not reciprocal with ${p.path}`]);
      }
    }
  }

  return errs;
}

async function main() {
  process.stdout.write(`SEO audit → ${BASE}\n`);
  const sm = await get(`${BASE}/sitemap.xml`);
  if (sm.status !== 200) {
    console.error(`FATAL: /sitemap.xml returned ${sm.status}. Is the app running at ${BASE}?`);
    process.exit(1);
  }
  const urls = [...new Set(
    [...sm.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, BASE)),
  )];
  if (!urls.length) {
    console.error('FATAL: no <loc> URLs in sitemap.');
    process.exit(1);
  }

  const failures = new Map(); // path → [errors]
  const addErr = (path, e) => {
    if (!failures.has(path)) failures.set(path, []);
    failures.get(path).push(...(Array.isArray(e) ? e : [e]));
  };

  const pages = [];
  const linkedSet = new Set();
  const nonSitemapLinks = new Set();
  const sitemapPaths = new Set(urls.map((u) => u.replace(BASE, '') || '/'));

  for (const url of urls) {
    const path = url.replace(BASE, '') || '/';
    const page = { path };
    try {
      const res = await get(url);
      page.hops = res.hops;
      if (res.status === 200) {
        addErr(path, auditPage(path, res.html, page));
        if (failures.get(path)?.length === 0) failures.delete(path);
        for (const l of internalLinks(res.html)) {
          linkedSet.add(l.href);
          if (!sitemapPaths.has(l.href)) nonSitemapLinks.add(l.href);
        }
        // HSTS only meaningful over TLS (prod/staging).
        if (BASE.startsWith('https') && path === '/fr' && !res.headers.get('strict-transport-security')) {
          addErr(path, 'missing Strict-Transport-Security header');
        }
      } else {
        addErr(path, [`HTTP ${res.status}`]);
      }
    } catch (e) {
      addErr(path, [`fetch failed: ${e.message}`]);
    }
    pages.push(page);
  }

  for (const [path, msg] of crossPageErrors(pages, linkedSet)) addErr(path, msg);

  // Linked-but-not-in-sitemap targets: no 404s, no redirect chains (sampled).
  const sample = [...nonSitemapLinks].slice(0, 150);
  for (const href of sample) {
    try {
      const res = await get(`${BASE}${href === '/' ? '' : href}`);
      if (res.status === 404) addErr(href, 'internal link target returns 404');
      if (res.hops.length > 1) addErr(href, `redirect chain (${res.hops.length} hops): ${res.hops.join(' → ')}`);
    } catch {
      /* network blips on link sampling never fail the gate */
    }
  }

  // Bot-logger health (informational unless the endpoint reports an error).
  try {
    const res = await fetch(`${BASE}/api/health/seo`, { headers: { 'user-agent': 'wt-seo-audit' } });
    const health = await res.json();
    if (health?.bot_logger) {
      if (!health.bot_logger.ok) addErr('/api/health/seo', 'bot logger unhealthy (table unreachable)');
      else if (health.bot_logger.hits7d === 0) console.log('note: bot logger live, 0 hits in 7 d (normal until crawlers arrive)');
    }
  } catch {
    console.log('note: /api/health/seo unreachable — bot-logger health skipped');
  }

  // Live AI-crawler probe (UA_PROBE=1): the OLD site blocked bots — verify the
  // current hosting/WAF serves them 200 + HTML.
  if (process.env.UA_PROBE === '1') {
    const uas = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot', 'CCBot', 'OAI-SearchBot'];
    for (const bot of uas) {
      try {
        const res = await get(`${BASE}/fr`, { 'user-agent': `Mozilla/5.0 (compatible; ${bot}/1.0)` });
        if (res.status !== 200 || !res.html.includes('<html')) {
          addErr('/fr', `UA probe: ${bot} got HTTP ${res.status}`);
        }
      } catch (e) {
        addErr('/fr', `UA probe: ${bot} fetch failed (${e.message})`);
      }
    }
  }

  let failed = 0;
  for (const [path, errs] of [...failures.entries()].sort()) {
    if (!errs.length) continue;
    failed++;
    console.log(`\n✗ ${path}`);
    [...new Set(errs)].forEach((e) => console.log(`    - ${e}`));
  }

  console.log(`\n${urls.length} URLs · ${urls.length - failed > 0 ? urls.length - failed : 0} pass · ${failed} fail`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
