#!/usr/bin/env node
/**
 * ingest-articles.mjs — the $0 content path, run automatically as `prebuild`
 * on every Vercel build (npm runs it before `next build`).
 *
 *   content/articles/*.json  ──gate──▶  public.articles (scheduled one per day)
 *
 * The weekly cloud routine (content/ARTICLE-BRIEF.md) writes one JSON per
 * article and pushes to master. This script, running with the service key that
 * Vercel already holds, validates each file with the SAME quality gate as the
 * API drafter, applies the mechanical publish decision (Réglages → Blog
 * automatique), assigns consecutive 08:00 Casablanca slots after the last
 * scheduled post, inserts the rows, and marks the matching plan rows drafted.
 *
 * Guarantees: never fails the build (every error is logged and skipped);
 * idempotent (a slug already in the table is skipped); no-op without env.
 * Run by hand: node --env-file=.env.local scripts/ingest-articles.mjs [--dry]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  qualityGate,
  publishDecision,
  nextMorningSlot,
  toArticleRow,
  uniqueSlug,
  words,
} from '../src/lib/server/article-gate.mjs';

const DRY = process.argv.includes('--dry');
// fileURLToPath handles Windows drive letters and the space in this repo's path.
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIR = path.join(ROOT, 'content', 'articles');
const REQUIRED = ['slug', 'title_fr', 'title_ar', 'title_en', 'excerpt_fr', 'excerpt_ar', 'excerpt_en', 'body_fr', 'body_ar', 'body_en', 'seo_title_fr', 'seo_title_ar', 'seo_title_en', 'seo_description_fr', 'seo_description_ar', 'seo_description_en'];
const log = (m) => console.log(`[ingest-articles] ${m}`);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { log('no Supabase env — skipping (local build)'); return; }

  let files = [];
  try { files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort(); } catch { log('no content/articles directory — nothing to do'); return; }
  if (!files.length) { log('no article files — nothing to do'); return; }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // What the gate needs, read once.
  const [{ data: existing }, { data: offers }, { data: settings }, { data: last }] = await Promise.all([
    sb.from('articles').select('slug'),
    sb.from('offers').select('starting_price, tiers:offer_tiers(price_double, price_triple, price_quad, price_quint, is_published)').eq('is_published', true).gte('date_end', today),
    sb.from('settings').select('blog_autopublish, blog_author_name, blog_reviewer_name').eq('id', 1).maybeSingle(),
    sb.from('articles').select('published_at').gt('published_at', now.toISOString()).order('published_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const existingSlugs = new Set((existing ?? []).map((a) => a.slug));
  const priceSet = new Set();
  for (const o of offers ?? []) {
    if (o.starting_price) priceSet.add(Number(o.starting_price));
    for (const t of o.tiers ?? []) {
      if (t.is_published === false) continue;
      for (const k of ['price_double', 'price_triple', 'price_quad', 'price_quint']) if (t[k]) priceSet.add(Number(t[k]));
    }
  }
  let lastSlot = last?.published_at ?? null;

  let inserted = 0, published = 0, skipped = 0, invalid = 0;
  for (const file of files) {
    let draft;
    try { draft = JSON.parse(await readFile(path.join(DIR, file), 'utf8')); } catch (e) { invalid++; log(`SKIP ${file}: invalid JSON (${e.message})`); continue; }
    const missing = REQUIRED.filter((k) => !String(draft?.[k] ?? '').trim());
    if (missing.length) { invalid++; log(`SKIP ${file}: missing ${missing.join(', ')}`); continue; }
    if (existingSlugs.has(draft.slug)) { skipped++; continue; } // already ingested on an earlier build

    const plan = { query_family: draft.query_family ?? null, owner_path: draft.owner_path ?? null, category: draft.category ?? null };
    const gate = qualityGate(draft, { ownerPath: plan.owner_path, existingSlugs, priceSet });
    const decision = publishDecision({ settings, gate });
    const slug = uniqueSlug(draft.slug, existingSlugs, plan.query_family ?? file);
    const slot = nextMorningSlot(lastSlot, now);
    const row = { ...toArticleRow(draft, { plan, settings, slug }), published_at: slot, is_published: decision.publish };

    log(`${file} → /blog/${slug} · ${words(draft.body_fr)} mots · slot ${slot.slice(0, 10)} · ${decision.publish ? 'PUBLIÉ automatiquement' : `brouillon (${decision.reasons.join(' ; ')})`}${gate.flags.length ? ` · flags: ${gate.flags.join(' | ')}` : ''}`);
    if (DRY) { inserted++; if (decision.publish) published++; lastSlot = slot; existingSlugs.add(slug); continue; }

    const { error } = await sb.from('articles').insert(row);
    if (error) { log(`FAILED ${file}: ${error.message}`); continue; }
    inserted++; if (decision.publish) published++;
    lastSlot = slot; existingSlugs.add(slug);

    if (plan.query_family) {
      await sb.from('article_plan')
        .update({ status: 'drafted', drafted_at: now.toISOString(), notes: `${today} — ingéré depuis content/articles/${file} (${decision.publish ? 'publié' : 'brouillon'})`, updated_at: now.toISOString() })
        .eq('query_family', plan.query_family).eq('status', 'queued');
    }
  }
  log(`${DRY ? 'DRY RUN — ' : ''}files ${files.length} · inserted ${inserted} (${published} auto-published) · already ingested ${skipped} · invalid ${invalid}`);
}

main().catch((e) => { log(`unexpected error, build continues: ${e?.message ?? e}`); });
