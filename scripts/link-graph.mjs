#!/usr/bin/env node
/**
 * link-graph — the internal-link graph of the prerendered build (no server,
 * no DB), reported per indexable French page:
 *
 *   npm run links:graph            (reads NEXT_DIST_DIR, default .next)
 *
 * Prints:
 *   1. ORPHANS — indexable pages with fewer than 2 inbound internal links,
 *      counted two ways: any link (header/footer included) and CONTEXTUAL
 *      (links inside <main>, i.e. not the global chrome — the count that
 *      actually carries topical signal)
 *   2. articles without a contextual link to a commercial page
 *   3. commercial pages reachable from fewer than 3 distinct pages
 * A report, not a gate — it always exits 0 (like i18n:audit).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = process.env.NEXT_DIST_DIR || '.next';
const APP = path.join(DIST, 'server', 'app');
const LOCALE = 'fr';
const COMMERCIAL = /^\/fr\/(bab-makka|omra-pas-cher|omra-5-etoiles|omra-ramadan|hotels-omra|agence-omra-casablanca|hajj|omra-depuis-[a-z]+|omra-[a-z]+|omra\/[^/]+|hotel\/[^/]+)$/;

const manifest = JSON.parse(readFileSync(path.join(DIST, 'prerender-manifest.json'), 'utf8'));
const routes = Object.keys(manifest.routes).filter((r) => r.startsWith(`/${LOCALE}`)).sort();

const pages = new Map(); // route → { indexable, outAll:Set, outMain:Set }
for (const route of routes) {
  const file = path.join(APP, `${route}.html`);
  const metaFile = path.join(APP, `${route}.meta`);
  if (!existsSync(file)) continue;
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  if ((meta.status ?? 200) !== 200) continue;
  const html = readFileSync(file, 'utf8');
  const indexable = !/<meta name="robots" content="[^"]*noindex/.test(html);
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const hrefs = (s) => new Set([...s.matchAll(/<a\b[^>]*?\shref="(\/fr\/[^"#?]*|\/fr)"/g)].map((m) => m[1].replace(/\/$/, '')).filter((h) => h !== route));
  pages.set(route, { indexable, outAll: hrefs(html), outMain: hrefs(main) });
}

const inAll = new Map();
const inMain = new Map();
for (const [from, p] of pages) {
  for (const to of p.outAll) (inAll.get(to) ?? inAll.set(to, new Set()).get(to)).add(from);
  for (const to of p.outMain) (inMain.get(to) ?? inMain.set(to, new Set()).get(to)).add(from);
}

const indexable = [...pages].filter(([, p]) => p.indexable).map(([r]) => r);
const n = (m, r) => m.get(r)?.size ?? 0;

console.log(`link-graph → ${DIST} · ${pages.size} prerendered /${LOCALE} pages · ${indexable.length} indexable\n`);

const orphans = indexable.filter((r) => n(inAll, r) < 2 || n(inMain, r) < 2);
console.log(`## Orphan report — indexable pages with < 2 inbound links (${orphans.length})\n`);
console.log('| page | inbound (any) | inbound (contextual, in <main>) |');
console.log('|---|---|---|');
for (const r of orphans) console.log(`| ${r} | ${n(inAll, r)} | ${n(inMain, r)} |`);
if (!orphans.length) console.log('| — | | |');

const articles = indexable.filter((r) => r.startsWith('/fr/blog/'));
const noCommercial = articles.filter((r) => ![...pages.get(r).outMain].some((h) => COMMERCIAL.test(h)));
console.log(`\n## Articles without a contextual link to a commercial page (${noCommercial.length} of ${articles.length})\n`);
for (const r of noCommercial) console.log(`  ${r}`);
if (!noCommercial.length) console.log('  none');

const commercial = indexable.filter((r) => COMMERCIAL.test(r));
const weak = commercial.filter((r) => n(inAll, r) < 3);
console.log(`\n## Commercial pages reachable from < 3 pages (${weak.length} of ${commercial.length})\n`);
console.log('| page | inbound (any) | inbound (contextual) |');
console.log('|---|---|---|');
for (const r of weak) console.log(`| ${r} | ${n(inAll, r)} | ${n(inMain, r)} |`);
if (!weak.length) console.log('| — | | |');

const bridges = ['loterie-hajj-maroc', 'hajj-maroc-inscription-quota', 'pas-tire-au-sort-hajj-omra', 'hajj-ministere-ou-agence'];
console.log('\n## Hajj bridge\n');
for (const slug of bridges) {
  const file = path.join(APP, `/${LOCALE}/blog/${slug}.html`);
  const ok = existsSync(file) && /data-hajj-bridge/.test(readFileSync(file, 'utf8'));
  console.log(`  ${ok ? '✓' : '✗'} /${LOCALE}/blog/${slug}`);
}
