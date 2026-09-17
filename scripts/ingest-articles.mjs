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
import { existsSync, readFileSync } from 'node:fs';
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

// The GitHub Actions gate runs `npm run build` with the production database
// secrets, at the same time as Vercel's own build. Only Vercel may insert: two
// real ingests racing each other can schedule the same draft twice (the second
// under a suffixed slug). So a build inside GitHub Actions always ingests dry.
const DRY = process.argv.includes('--dry') || process.env.GITHUB_ACTIONS === 'true';
// --refresh: re-gate every file whose slug is already in the table and UPDATE
// the row when it is still scheduled (published_at in the future). A post
// corrected after a review but before its slot must be correctable — that is
// what the review loop is for. A row whose slot has PASSED is never touched:
// its URL is live, and a live post is edited in the admin, not by a rebuild.
const REFRESH = process.argv.includes('--refresh');
// The AUTHOR record (hard constraint 3): every post is by Yahya Houssini.
// The row exists (migration 024); its profile is the owner's to complete.
const AUTHOR_SLUG = 'yahya-houssini';
// fileURLToPath handles Windows drive letters and the space in this repo's path.
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIR = path.join(ROOT, 'content', 'articles');
const REQUIRED = ['slug', 'title_fr', 'title_ar', 'title_en', 'excerpt_fr', 'excerpt_ar', 'excerpt_en', 'body_fr', 'body_ar', 'body_en', 'seo_title_fr', 'seo_title_ar', 'seo_title_en', 'seo_description_fr', 'seo_description_ar', 'seo_description_en'];
const log = (m) => console.log(`[ingest-articles] ${m}`);
// The calendar (brief C5): a file that names its slot_index is scheduled at
// that slot's publish_at — never earlier than now + 24 h (the generator's
// rule) — and the slot is marked scheduled in the table when it exists.
const CALENDAR = path.join(ROOT, 'data', 'content-calendar.json');
const calendarSlots = existsSync(CALENDAR) ? (JSON.parse(readFileSync(CALENDAR, 'utf8')).slots ?? []) : [];
const MIN_LEAD_MS = 24 * 3600 * 1000;

/** The instant a file is released: its calendar slot (≥ now + 24 h), else the next free 08:00 Casablanca morning. */
function releaseInstant(draft, lastSlot, now) {
  const slot = draft.slot_index ? calendarSlots.find((s) => s.slot_index === Number(draft.slot_index)) : null;
  if (slot?.publish_at) {
    const at = Math.max(Date.parse(slot.publish_at), now.getTime() + MIN_LEAD_MS);
    return { at: new Date(at).toISOString(), slot };
  }
  return { at: nextMorningSlot(lastSlot, now), slot: null };
}

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
    sb.from('articles').select('slug, published_at, is_published'),
    sb.from('settings').select('blog_autopublish, blog_author_name').eq('id', 1).maybeSingle(),
    sb.from('articles').select('published_at').gt('published_at', now.toISOString()).order('published_at', { ascending: false }).limit(1).maybeSingle(),
    sb.from('testimonials').select('id').eq('is_published', true),
    sb.from('team_members').select('id, slug').eq('slug', AUTHOR_SLUG).maybeSingle(),
  ]);
  const existingSlugs = new Set((existing ?? []).map((a) => a.slug));
  const existingBySlug = new Map((existing ?? []).map((a) => [a.slug, a]));
  const testimonialIds = new Set((testimonials ?? []).map((t) => t.id));
  const authorId = author?.id ?? null;
  if (!authorId) log(`author record « ${AUTHOR_SLUG} » not found in team_members — rows are inserted with author_name only`);
  let lastSlot = last?.published_at ?? null;

  let inserted = 0, skippedGate = 0, alreadyIn = 0, invalid = 0, refreshed = 0;
  for (const file of files) {
    let draft;
    try { draft = JSON.parse(await readFile(path.join(DIR, file), 'utf8')); } catch (e) { invalid++; log(`SKIP ${file}: invalid JSON (${e.message})`); continue; }
    const missing = REQUIRED.filter((k) => !String(draft?.[k] ?? '').trim());
    if (missing.length) { invalid++; log(`SKIP ${file}: missing ${missing.join(', ')}`); continue; }
    // A draft the reviewers SKIPPED stays in the repo as the record of why, and
    // is never inserted. Before this check the ingest ignored `status`, so a
    // skipped file that still passed the mechanical gate became a scheduled row
    // — public the moment its slot passed — on the next deploy.
    if (draft.status === 'skipped') {
      log(`SKIP ${file} (${draft.slug}) — skipped after review, not ingested: ${String(draft.skip_reason ?? '').slice(0, 140)}`);
      continue;
    }
    if (existingSlugs.has(draft.slug)) {
      const row = existingBySlug.get(draft.slug);
      const stillScheduled = row?.published_at && row.published_at > now.toISOString();
      // A row that was deliberately WITHDRAWN (is_published = false, e.g. a
      // slot skipped after review) is left exactly as it is: refreshing it
      // would quietly resurrect text someone chose to hold back. Re-publishing
      // is an admin decision, never a build's.
      if (REFRESH && stillScheduled && row.is_published === false) {
        alreadyIn++;
        log(`HELD ${file} (${draft.slug}) — row is unpublished (withdrawn); not refreshed`);
        continue;
      }
      if (!REFRESH || !stillScheduled) { alreadyIn++; continue; } // already ingested, or already live — never rewritten by a build
      // Corrected after review, before its slot: re-gate and update in place.
      const plan = { query_family: draft.query_family ?? null, owner_path: draft.owner_path ?? null, category: draft.category ?? null };
      const gate = qualityGate(draft, { ownerPath: plan.owner_path, existingSlugs: new Set(), strict: true, testimonialIds });
      const decision = publishDecision({ settings, gate });
      if (!decision.publish) {
        skippedGate++;
        log(`REFRESH REFUSED ${file} (${draft.slug}) — the row keeps its previous text: ${[...decision.reasons, ...gate.problems].join(' ; ')}`);
        continue;
      }
      if (DRY) { refreshed++; continue; }
      const { error } = await sb.from('articles')
        .update({ ...toArticleRow(draft, { plan, settings, slug: draft.slug, authorId }), updated_at: now.toISOString() })
        .eq('slug', draft.slug);
      if (error) { log(`REFRESH FAILED ${file}: ${error.message}`); continue; }
      refreshed++;
      log(`REFRESHED ${file} → /blog/${draft.slug} · ${words(draft.body_fr)} mots · créneau inchangé ${row.published_at}`);
      continue;
    }

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
    const { at: slot, slot: calendarSlot } = releaseInstant(draft, lastSlot, now);
    const row = { ...toArticleRow(draft, { plan, settings, slug, authorId }), published_at: slot, is_published: true };

    log(`${file} → /blog/${slug} · ${words(draft.body_fr)} mots · programmé ${slot}${calendarSlot ? ` (créneau #${calendarSlot.slot_index})` : ''}${gate.flags.length ? ` · flags: ${gate.flags.join(' | ')}` : ''}`);
    if (DRY) { inserted++; if (!calendarSlot) lastSlot = slot; existingSlugs.add(slug); continue; }

    const { data: insertedRow, error } = await sb.from('articles').insert(row).select('id').maybeSingle();
    if (error) { log(`FAILED ${file}: ${error.message}`); continue; }
    inserted++;
    if (!calendarSlot) lastSlot = slot;
    existingSlugs.add(slug);

    // The calendar row (migration 026) — best effort: without the table the
    // repo's data/content-calendar.json, updated by the generator, is the record.
    if (calendarSlot) {
      const { error: calError } = await sb.from('content_calendar')
        .update({ status: 'scheduled', slug, article_id: insertedRow?.id ?? null, generated_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('slot_index', calendarSlot.slot_index);
      if (calError) log(`calendar row #${calendarSlot.slot_index} not updated (${calError.message}) — table absent until migration 026`);
      await sb.from('content_ops_events').insert({ kind: 'ingest', level: 'info', slot_index: calendarSlot.slot_index, slug, message: `scheduled ${slug} at ${slot} from ${file}` }).then(({ error: e }) => { if (e) log(`ops event not logged (${e.message})`); });
    }

    if (plan.query_family) {
      await sb.from('article_plan')
        .update({ status: 'drafted', drafted_at: now.toISOString(), notes: `${today} — ingéré depuis content/articles/${file}, programmé ${slot.slice(0, 10)}`, updated_at: now.toISOString() })
        .eq('query_family', plan.query_family).eq('status', 'queued');
    }
  }
  log(`${DRY ? 'DRY RUN — ' : ''}files ${files.length} · scheduled ${inserted}${REFRESH ? ` · refreshed ${refreshed}` : ''} · skipped by the gate ${skippedGate} · already ingested ${alreadyIn} · invalid ${invalid}`);
}

main().catch((e) => { log(`unexpected error, build continues: ${e?.message ?? e}`); });
