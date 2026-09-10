#!/usr/bin/env node
/**
 * link-audit — every internal link on the site must land on its final URL.
 *
 *   npm run links:audit                          against http://localhost:3000
 *   BASE_URL=https://wikitours.ma npm run links:audit
 *
 * WHY THIS EXISTS. Two competing month-URL families were linked sitewide at
 * once: the footer used the canonical /omra-{month}, while the home page,
 * /bab-makka and /agence-omra-casablanca used /omra-{month}-2026, which 301s.
 * That is 12 links x 3 locales x 3 pages, on every page view, all bleeding a
 * redirect hop. Nothing caught it, because each URL individually resolved fine
 * — the defect was only visible in the LINK, not the destination.
 *
 * So this crawls the rendered pages, extracts every internal href, and resolves
 * each ONE with redirect:'manual'. Any 3xx is a defect to fix at the source, not
 * at the destination: the redirect stays (external inbound links rely on it),
 * the internal link stops using it.
 *
 * Exit 1 on any redirecting internal link, so CI can gate on it.
 *
 * Deliberately NOT flagged:
 *   - external hosts (we do not control their redirects)
 *   - mailto: / tel: / sms: / bare #anchors
 *   - anything under /api or /admin (not navigational)
 */
import process from 'node:process';

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
// Same UA the SEO audit uses: next.config.mjs lists it in htmlLimitedBots, so
// metadata resolves BEFORE streaming and a 404 arrives as a real 404.
const UA = 'wt-seo-audit link-audit';
const CONCURRENCY = 8;
const LIMIT = Number(process.env.LINK_AUDIT_LIMIT ?? 0); // 0 = every page

const SKIP_SCHEME = /^(mailto:|tel:|sms:|javascript:|data:|#)/i;
const SKIP_PATH = /^\/(api|admin)(\/|$)/;

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const get = async (url, redirect = 'follow') => {
  try {
    return await fetch(url, { redirect, headers: { 'user-agent': UA } });
  } catch (err) {
    return { status: 0, headers: new Map(), error: err?.message ?? String(err) };
  }
};

/** Every <a href> in the served HTML, normalized to an absolute same-origin URL. */
function internalLinks(html, pageUrl) {
  const found = new Set();
  for (const m of html.matchAll(/<a\b[^>]*?\shref=["']([^"']+)["']/gi)) {
    const raw = m[1].trim();
    if (!raw || SKIP_SCHEME.test(raw)) continue;
    let abs;
    try {
      abs = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (abs.origin !== ORIGIN) continue;
    if (SKIP_PATH.test(abs.pathname)) continue;
    abs.hash = '';
    found.add(abs.toString());
  }
  return found;
}

async function main() {
  console.log(`link audit → ${BASE}\n`);

  // Page list = the sitemap, which is already every indexable URL.
  const smRes = await get(`${BASE}/sitemap.xml`);
  if (!smRes.ok) {
    console.error(`cannot read ${BASE}/sitemap.xml (status ${smRes.status}${smRes.error ? `, ${smRes.error}` : ''})`);
    process.exitCode = 1;
    return;
  }
  const sitemapXml = await smRes.text();
  let pages = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https:\/\/wikitours\.ma/, BASE));
  if (LIMIT > 0) {
    console.log(`(LINK_AUDIT_LIMIT=${LIMIT} — auditing ${LIMIT} of ${pages.length} pages)`);
    pages = pages.slice(0, LIMIT);
  }
  console.log(`pages to scan: ${pages.length}`);

  // href → the pages that contain it, so a failure names where to fix it.
  const sources = new Map();
  await mapLimit(pages, CONCURRENCY, async (pageUrl) => {
    const res = await get(pageUrl);
    if (!res.ok) return;
    const html = await res.text();
    for (const link of internalLinks(html, pageUrl)) {
      if (!sources.has(link)) sources.set(link, new Set());
      sources.get(link).add(pageUrl.replace(BASE, '') || '/');
    }
  });

  const links = [...sources.keys()].sort();
  console.log(`distinct internal links: ${links.length}\n`);

  const results = await mapLimit(links, CONCURRENCY, async (link) => {
    const res = await get(link, 'manual');
    return { link, status: res.status, location: res.headers?.get?.('location') ?? null, error: res.error ?? null };
  });

  const redirects = results.filter((r) => r.status >= 300 && r.status < 400);
  const broken = results.filter((r) => r.status === 0 || r.status >= 400);

  if (redirects.length) {
    console.log(`REDIRECTING INTERNAL LINKS (${redirects.length}) — fix the LINK, keep the redirect:\n`);
    for (const r of redirects.sort((a, b) => a.link.localeCompare(b.link))) {
      const from = [...sources.get(r.link)];
      console.log(`  ${r.status}  ${r.link.replace(BASE, '')}`);
      console.log(`        → ${r.location ?? '(no Location header)'}`);
      console.log(`        linked from ${from.length} page(s): ${from.slice(0, 6).join(', ')}${from.length > 6 ? `, +${from.length - 6} more` : ''}\n`);
    }
  }
  if (broken.length) {
    console.log(`BROKEN INTERNAL LINKS (${broken.length}):\n`);
    for (const r of broken) {
      const from = [...sources.get(r.link)];
      console.log(`  ${r.status || 'ERR'}  ${r.link.replace(BASE, '')}${r.error ? `  (${r.error})` : ''}`);
      console.log(`        linked from: ${from.slice(0, 6).join(', ')}\n`);
    }
  }

  const ok = results.length - redirects.length - broken.length;
  console.log(`${results.length} internal links · ${ok} land directly · ${redirects.length} redirect · ${broken.length} broken`);
  process.exitCode = redirects.length || broken.length ? 1 : 0;
}

main().catch((err) => {
  console.error('[link-audit]', err?.message ?? err);
  process.exitCode = 1;
});
