#!/usr/bin/env node
/**
 * content-inventory.mjs — the content inventory FROM THE DATABASE plus the
 * lander registry FROM THE BUILD OUTPUT, read-only.
 *
 *   docs/content-system/inventory-posts.csv   one row per article (all statuses)
 *   data/lander-registry.json                 every page that OWNS a topic
 *   docs/content-system/inventory.json        the raw material (posts + landers)
 *
 *   node --env-file=.env.local --import ./tests/register.mjs scripts/content-inventory.mjs
 * Needs a build in NEXT_DIST_DIR (default .next) for H1 / title / robots /
 * schema types; without one those columns stay empty.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { MONTH_SLUGS, CITY_SLUGS } from '@/lib/months';
import { GUIDE_CHILD_SLUGS } from '@/lib/guides';

const DIST = process.env.NEXT_DIST_DIR || '.next';
const APP = path.join(DIST, 'server', 'app');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('no Supabase env'); process.exit(2); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const decode = (s) => String(s ?? '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d));
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

function page(route) {
  const f = path.join(APP, `${route}.html`);
  if (!existsSync(f)) return null;
  const html = readFileSync(f, 'utf8');
  const meta = existsSync(`${f.slice(0, -5)}.meta`) ? JSON.parse(readFileSync(`${f.slice(0, -5)}.meta`, 'utf8')) : {};
  const types = [...html.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]);
  return {
    status: meta.status ?? 200,
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    h1: decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
    description: decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
    schemaTypes: [...new Set(types)].filter((t) => ['BlogPosting', 'FAQPage', 'BreadcrumbList', 'WebPage', 'Product', 'TouristTrip', 'Hotel', 'ItemList', 'Article', 'Dataset', 'DefinedTermSet', 'Person', 'Review'].includes(t)),
    speakable: /"speakable"/.test(html),
  };
}

// ── posts ──────────────────────────────────────────────────────────────────
const { data: articles } = await sb.from('articles').select('*').order('published_at', { ascending: false });
const now = new Date().toISOString();
const posts = (articles ?? []).map((a) => {
  const state = !a.is_published ? 'draft' : a.published_at && a.published_at > now ? 'scheduled' : 'live';
  const fr = page(`/fr/blog/${a.slug}`);
  const linksOut = (lang) => (String(a[`body_${lang}`] ?? '').match(/\]\((\/[a-z]{2}\/[^)]+)\)/g) ?? []).length;
  const faq = (lang) => { const b = String(a[`body_${lang}`] ?? ''); const i = b.search(/^##+ .*(questions fréquentes|faq|الأسئلة|frequently asked)/im); return i >= 0 ? (b.slice(i).match(/^### /gm) ?? []).length : 0; };
  return {
    slug: a.slug, state, category: a.category, supports_path: a.supports_path ?? '',
    published_at: a.published_at ?? '', updated_at: a.updated_at ?? '', author_name: a.author_name ?? '', author_id: a.author_id ?? '',
    title_fr: a.title_fr ?? '', title_ar: a.title_ar ?? '', title_en: a.title_en ?? '',
    locales: ['fr', 'ar', 'en'].filter((l) => a[`body_${l}`] && a[`title_${l}`]).join('+'),
    words_fr: words(a.body_fr), words_ar: words(a.body_ar), words_en: words(a.body_en),
    links_out_fr: linksOut('fr'), links_out_ar: linksOut('ar'), links_out_en: linksOut('en'),
    faq_fr: faq('fr'), faq_ar: faq('ar'), faq_en: faq('en'),
    has_year_in_slug: /\d{4}/.test(a.slug) ? 'yes' : 'no',
    years_in_body_fr: [...new Set((String(a.body_fr ?? '').match(/\b20\d{2}\b/g) ?? []))].join(' '),
    amounts_in_body_fr: (String(a.body_fr ?? '').match(/\d[\d\s.]*\s?(?:MAD|DH|dirhams?)/gi) ?? []).length,
    rendered_title_fr: fr?.title ?? '', rendered_h1_fr: fr?.h1 ?? '', schema: fr?.schemaTypes.join('+') ?? '', speakable: fr?.speakable ? 'yes' : 'no', noindex: fr?.noindex ? 'yes' : fr ? 'no' : '',
  };
});

// ── landers ────────────────────────────────────────────────────────────────
const [{ data: occasions }, { data: hotels }, { data: offers }, { data: cityPages }] = await Promise.all([
  sb.from('occasions').select('slug, name_fr, name_ar, name_en').order('sort_order'),
  sb.from('hotels').select('slug, name, city').eq('is_published', true).order('name'),
  sb.from('offers').select('slug, title_fr, date_start, date_end, is_published').eq('is_published', true).order('date_start'),
  sb.from('city_pages').select('slug, is_indexable'),
]);
const L = (kind, rest, extra = {}) => ({ kind, path: rest ? `/${rest}` : '/', ...extra });
const landerDefs = [
  L('home', ''), L('pillar', 'bab-makka'), L('hub', 'omra-pas-cher'), L('hub', 'hotels-omra'), L('local', 'agence-omra-casablanca'),
  L('hajj', 'hajj'), L('trust', 'agrement'), L('trust', 'avis'), L('guide', 'guide-omra'), L('guide', 'glossaire-omra'), L('data', 'barometre-prix-omra'),
  ...GUIDE_CHILD_SLUGS.map((s) => L('guide-child', `guide-omra/${s}`)),
  ...MONTH_SLUGS.map((s, i) => L('month', `omra-${s}`, { month: i + 1 })),
  ...(occasions ?? []).map((o) => L('occasion', `omra-${o.slug}`, { occasion: o.slug })),
  ...Object.keys(CITY_SLUGS).map((s) => L('city', `omra-depuis-${s}`, { city: s, admin_indexable: (cityPages ?? []).find((c) => c.slug === s)?.is_indexable ?? null })),
  ...(hotels ?? []).map((h) => L('hotel', `hotel/${h.slug}`, { hotel: h.name, city: h.city })),
  ...(offers ?? []).map((o) => L('departure', `omra/${o.slug}`, { date_start: o.date_start, date_end: o.date_end })),
];
const landers = landerDefs.map((d) => {
  const per = {};
  for (const l of ['fr', 'ar', 'en']) {
    const p = page(`/${l}${d.path === '/' ? '' : d.path}`);
    per[l] = p ? { title: p.title, h1: p.h1, description: p.description, indexable: p.status === 200 && !p.noindex, schema: p.schemaTypes } : null;
  }
  return { ...d, locales: per, indexable: per.fr?.indexable ?? false };
});

mkdirSync('docs/content-system', { recursive: true });
mkdirSync('data', { recursive: true });
const cols = Object.keys(posts[0] ?? {});
const csv = [cols.join(','), ...posts.map((p) => cols.map((c) => `"${String(p[c] ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(','))].join('\n');
writeFileSync('docs/content-system/inventory-posts.csv', `﻿${csv}\n`);
writeFileSync('docs/content-system/inventory.json', `${JSON.stringify({ generated_at: now, posts, landers }, null, 2)}\n`);
writeFileSync('data/lander-registry.json', `${JSON.stringify({ generated_at: now, note: 'Pages that OWN a topic — a blog post never targets their query (hard constraint 4). Rebuilt by scripts/content-inventory.mjs from the DB + the build output; the h1/title/query per locale are the RENDERED ones.', landers: landers.map((l) => ({ kind: l.kind, path: l.path, indexable: l.indexable, month: l.month ?? null, occasion: l.occasion ?? null, city: l.city ?? null, hotel: l.hotel ?? null, date_start: l.date_start ?? null, fr: l.locales.fr ? { h1: l.locales.fr.h1, title: l.locales.fr.title } : null, ar: l.locales.ar ? { h1: l.locales.ar.h1, title: l.locales.ar.title } : null, en: l.locales.en ? { h1: l.locales.en.h1, title: l.locales.en.title } : null })) }, null, 2)}\n`);
console.log(`posts: ${posts.length} (${posts.filter((p) => p.state === 'live').length} live, ${posts.filter((p) => p.state === 'scheduled').length} scheduled, ${posts.filter((p) => p.state === 'draft').length} draft) · landers: ${landers.length} (${landers.filter((l) => l.indexable).length} indexable)`);
console.log(`posts with a year in the slug: ${posts.filter((p) => p.has_year_in_slug === 'yes').length} · with MAD amounts in body_fr: ${posts.filter((p) => p.amounts_in_body_fr > 0).length} · with years in body_fr: ${posts.filter((p) => p.years_in_body_fr).length} · trilingual: ${posts.filter((p) => p.locales === 'fr+ar+en').length}`);
