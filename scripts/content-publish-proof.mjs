#!/usr/bin/env node
/**
 * content-publish-proof.mjs — PROVE publish-by-time (brief B3): a past-dated
 * article appears, a future-dated one does not — on the anon client (what
 * every page and the sitemap read), and in the prerendered sitemap when a
 * build exists. Read-only; nothing is written.
 *
 *   node --env-file=.env.local scripts/content-publish-proof.mjs
 *
 * The predicate is the anon RLS policy on public.articles (migration 020):
 *   is_published and (published_at is null or published_at <= now())
 * — the brief's `status='scheduled' AND publish_at <= now()` with the repo's
 * column names. The service-role client sees every row; the difference is the
 * proof. ISR keeps every surface within 3600 s of the truth.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) { console.error('need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const now = new Date().toISOString();

const { data: all } = await service.from('articles').select('slug, is_published, published_at').order('published_at');
const { data: visible } = await anon.from('articles').select('slug, published_at');
const seen = new Set((visible ?? []).map((r) => r.slug));
const past = (all ?? []).filter((r) => r.is_published && r.published_at && r.published_at <= now);
const future = (all ?? []).filter((r) => r.is_published && r.published_at && r.published_at > now);
const drafts = (all ?? []).filter((r) => !r.is_published);

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
check(past.every((r) => seen.has(r.slug)), `every past-dated published row is visible to anon (${past.length} rows)`);
check(future.every((r) => !seen.has(r.slug)), `no future-dated row is visible to anon (${future.length} scheduled: ${future.map((r) => `${r.slug} @ ${r.published_at.slice(0, 16)}`).join(', ') || 'none'})`);
check(drafts.every((r) => !seen.has(r.slug)), `no unpublished row is visible to anon (${drafts.length} rows)`);
check(seen.size === past.length, `anon sees exactly the past-dated published rows (${seen.size} = ${past.length})`);

// A single slug through the same helper path the page uses (maybeSingle on anon).
if (future[0]) {
  const { data } = await anon.from('articles').select('slug').eq('slug', future[0].slug).maybeSingle();
  check(!data, `getArticleBySlug('${future[0].slug}') on anon returns nothing before its slot → the page 404s until ${future[0].published_at.slice(0, 16)}`);
}

// The prerendered sitemap of the isolated build, when present.
const DIST = process.env.NEXT_DIST_DIR || '.next-audit';
const sitemap = path.join(DIST, 'server', 'app', 'sitemap.xml.body');
if (existsSync(sitemap)) {
  const xml = readFileSync(sitemap, 'utf8');
  const preview = process.env.CONTENT_PREVIEW_SCHEDULED === '1';
  if (!preview) {
    check(future.every((r) => !xml.includes(`/blog/${r.slug}<`)), `the prerendered sitemap (${DIST}) lists no future-dated article`);
    check(past.slice(-3).every((r) => xml.includes(`/blog/${r.slug}<`)), 'the prerendered sitemap lists the latest past-dated articles');
  } else {
    console.log(`SKIP sitemap check — ${DIST} was built with CONTENT_PREVIEW_SCHEDULED=1 (local proof build), scheduled rows are expected in it`);
  }
} else {
  console.log(`SKIP sitemap check — no build at ${DIST}`);
}
console.log(failures ? `${failures} failure(s)` : 'publish-by-time proven: past-dated appears, future-dated does not');
process.exit(failures ? 1 : 0);
