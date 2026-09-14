#!/usr/bin/env node
/**
 * ingest-articles.mjs — the content path, run automatically as `prebuild` on
 * every Vercel build (npm runs it before `next build`).
 *
 *   content/articles/*.json  ──gate──▶  public.articles (one 08:00 Casablanca slot per day)
 *
 * GENERATE-AHEAD, RENDER-LIVE, PUBLISH-BY-TIME (content/ARTICLE-BRIEF.md):
 * a Claude Code session writes one JSON per article ahead of time; this
 * script, running with the service key Vercel already holds, validates each
 * file with the STRICT gate (no year / price / date / seat count in prose,
 * placeholder tags only from the registry, no lander query), applies the
 * mechanical publish decision (Réglages → Blog automatique), assigns the next
 * free 08:00 Africa/Casablanca slot after the last scheduled post, inserts
 * the row as SCHEDULED (is_published = true, published_at = the slot — the
 * anon RLS policy makes it public the moment the slot passes, no cron), and
 * marks the matching plan row drafted.
 *
 * Cadence is a ceiling: a file that fails the gate is SKIPPED and logged
 * (build log + the plan row's notes) — never inserted, never filling a slot.
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
// The AUTHOR record (hard constraint 3): every post is by Yahya Houssini.
// The row exists (migration 024); its profile is the owner's to complete.
const AUTHOR_SLUG = 'yahya-houssini';
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
  const [{ data: existing }, { data: settings }, { data: last }, { data: testimonials }, { data: author }] = await Promise.all([
    sb.from('articles').select('slug'),
    sb.from('settings').select('blog_autopublish, blog_author_name').eq('id', 1).maybeSingle(),
    sb.from('articles').select('published_at').gt('published_at', now.toISOString()).order('published_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('testimonials').select('id').eq('is_published', true),
    sb.from('team_members').select('id, slug').eq('slug', AUTHOR_SLUG).maybeSingle(),
  ]);
  const existingSlugs = new Set((existing ?? []).map((a) => a.slug));
  const testimonialIds = new Set((testimonials ?? []).map((t) => t.id));
  const authorId = author?.id ?? null;
  if (!authorId) log(`author record « ${AUTHOR_SLUG} » not found in team_members — rows are inserted with author_name only`);
  let lastSlot = last?.published_at ?? null;

  let inserted = 0, skippedGate = 0, alreadyIn = 0, invalid = 0;
  for (const file of files) {
    let draft;
    try { draft = JSON.parse(await readFile(path.join(DIR, file), 'utf8')); } catch (e) { invalid++; log(`SKIP ${file}: invalid JSON (${e.message})`); continue; }
    const missing = REQUIRED.filter((k) => !String(draft?.[k] ?? '').trim());
    if (missing.length) { invalid++; log(`SKIP ${file}: missing ${missing.join(', ')}`); continue; }
    if (existingSlugs.has(draft.slug)) { alreadyIn++; continue; } // already ingested on an earlier build

    const plan = { query_family: draft.query_family ?? null, owner_path: draft.owner_path ?? null, category: draft.category ?? null };
    const gate = qualityGate(draft, { ownerPath: plan.owner_path, existingSlugs, strict: true, testimonialIds });
    const decision = publishDecision({ settings, gate });

    if (!decision.publish) {
      // Cadence is a ceiling: the slot stays empty, the reason is logged where
      // the next writing session reads it (the plan row) — never a draft row.
      skippedGate++;
      const reasons = [...decision.reasons, ...gate.problems].join(' ; ');
      log(`SKIPPED ${file} (${draft.slug}): ${reasons}`);
      if (!DRY && plan.query_family) {
        const { data: row } = await sb.from('article_plan').select('notes').eq('query_family', plan.query_family).eq('status', 'queued').maybeSingle();
        await sb.from('article_plan')
          .update({ notes: `${row?.notes ? `${row.notes}\n` : ''}${today} — ${file} ignoré par le contrôle : ${reasons}`.slice(0, 4000), updated_at: now.toISOString() })
          .eq('query_family', plan.query_family).eq('status', 'queued');
      }
      continue;
    }

    const slug = uniqueSlug(draft.slug, existingSlugs, plan.query_family ?? file);
    const slot = nextMorningSlot(lastSlot, now);
    const row = { ...toArticleRow(draft, { plan, settings, slug, authorId }), published_at: slot, is_published: true };

    log(`${file} → /blog/${slug} · ${words(draft.body_fr)} mots · programmé ${slot}${gate.flags.length ? ` · flags: ${gate.flags.join(' | ')}` : ''}`);
    if (DRY) { inserted++; lastSlot = slot; existingSlugs.add(slug); continue; }

    const { error } = await sb.from('articles').insert(row);
    if (error) { log(`FAILED ${file}: ${error.message}`); continue; }
    inserted++;
    lastSlot = slot; existingSlugs.add(slug);

    if (plan.query_family) {
      await sb.from('article_plan')
        .update({ status: 'drafted', drafted_at: now.toISOString(), notes: `${today} — ingéré depuis content/articles/${file}, programmé ${slot.slice(0, 10)}`, updated_at: now.toISOString() })
        .eq('query_family', plan.query_family).eq('status', 'queued');
    }
  }
  log(`${DRY ? 'DRY RUN — ' : ''}files ${files.length} · scheduled ${inserted} · skipped by the gate ${skippedGate} · already ingested ${alreadyIn} · invalid ${invalid}`);
}

main().catch((e) => { log(`unexpected error, build continues: ${e?.message ?? e}`); });
