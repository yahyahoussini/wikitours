#!/usr/bin/env node
/**
 * build-content-calendar.mjs — the year's calendar (brief C5), deterministic.
 *
 *   node --env-file=.env.local --import ./tests/register.mjs scripts/build-content-calendar.mjs [--seed] [--dry]
 *
 * Inputs
 *   data/content-calendar-spec.json   settings, phases + weights, series, Hijri anchors, school holidays
 *   data/content-topics/*.json        the topic pool, one file per batch ({ batch, topics: [...] })
 *   data/lander-registry.json         the pages that OWN a query (a slot never targets one)
 *   docs/content-system/inventory.json  the existing posts (a slot never repeats a title)
 *   data/content-calendar.json        the PREVIOUS calendar — a slot already scheduled /
 *                                     published / skipped is never rewritten
 * Outputs
 *   data/content-calendar.json        { settings, slots: [...] } — the repo's source of truth
 *   docs/content-system/calendar-report.md   counts, series schedule, every unfillable slot and why
 *   --seed: upserts content_ops_settings (id 1), content_series, lander_registry and
 *   content_calendar (migration 026) — rows already scheduled/published/skipped in
 *   the table are left untouched. Without the tables it says so and exits 0.
 *
 * Placement, in order: pinned slots (stage D), series with a placement
 * ("spaced": parts 6–9 days apart from a start; "windows": one date window per
 * part, for the Hajj cycle and the month-by-month series), then the free
 * slots by the phase weights — the track whose share is furthest behind gets
 * the slot, the topic is the highest-priority one whose date hints fit and
 * whose cluster differs from the previous slot's. A slot no topic can fill is
 * kept as `unfillable` with the reason: the honest count the brief asks for.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { targetsLanderQuery } from '@/lib/server/article-gate';

const DRY = process.argv.includes('--dry');
const SEED = process.argv.includes('--seed');
const log = (m) => console.log(`[calendar] ${m}`);
const readJson = (p, fb = null) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fb);

const spec = readJson('data/content-calendar-spec.json');
const registry = readJson('data/lander-registry.json', { landers: [] });
const inventory = readJson('docs/content-system/inventory.json', { posts: [] });
const previous = readJson('data/content-calendar.json', { slots: [] });
const topics = readdirSync('data/content-topics').filter((f) => f.endsWith('.json')).sort()
  .flatMap((f) => (readJson(path.join('data/content-topics', f)).topics ?? []).map((t) => ({ ...t, __batch: f })));
log(`${topics.length} topics from ${new Set(topics.map((t) => t.__batch)).size} batch file(s)`);

// ── helpers ─────────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const dayMs = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (isoDate, n) => iso(Date.parse(`${isoDate}T12:00:00Z`) + n * dayMs);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / dayMs);
/** The UTC instant that reads as `hh:mm` on `isoDate` in the site's zone (Morocco: +1, +0 in Ramadan). */
function zonedInstant(isoDate, hhmm, timeZone) {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = isoDate.split('-').map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, m);
  for (const off of [1, 0, 2, -1, 3, -2]) {
    const candidate = new Date(wanted - off * 3600000);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(candidate);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    if (`${get('year')}-${get('month')}-${get('day')}` === isoDate && Number(get('hour')) % 24 === h && Number(get('minute')) === m) return candidate.toISOString();
  }
  return new Date(wanted).toISOString();
}
const jaccardWords = (a, b) => { const A = new Set(norm(a).split(' ')); const B = new Set(norm(b).split(' ')); let i = 0; for (const x of A) if (B.has(x)) i++; return i / Math.max(1, A.size + B.size - i); };

// ── the empty slots ─────────────────────────────────────────────────────────
const S = spec.settings;
const slots = [];
for (let c = 0, idx = 1; ; c++) {
  const base = addDays(S.start_date, c * S.cycle_days);
  if (base > S.end_date) break;
  for (let k = 0; k < S.posts_per_cycle; k++) {
    const date = addDays(base, k);
    if (date > S.end_date) break;
    const phase = spec.phases.find((p) => date >= p.from && date <= p.to) ?? spec.phases.at(-1);
    slots.push({ slot_index: idx++, date, publish_at: zonedInstant(date, S.slot_times[k] ?? S.slot_times[0], S.timezone), phase: phase.id, weights: phase.weights, status: 'planned' });
  }
}
log(`${slots.length} slots from ${S.start_date} to ${S.end_date} (${S.posts_per_cycle} per ${S.cycle_days} days)`);

// Owner-requested EXTRA slots (spec.extra_slots): a date outside the cadence,
// asked for by the owner. They are indexed from 1001 in declaration order, so
// no cadence slot's index ever shifts — frozen (scheduled / published /
// skipped) rows are matched by index. An extra slot takes only the topic the
// spec names; the series and the phase weights never fill it. Append new
// requests at the end of the list: reordering it would renumber them.
for (const [k, x] of (spec.extra_slots ?? []).entries()) {
  const phase = spec.phases.find((p) => x.date >= p.from && x.date <= p.to) ?? spec.phases.at(-1);
  slots.push({ slot_index: 1001 + k, date: x.date, publish_at: zonedInstant(x.date, x.time ?? '08:00', S.timezone), phase: phase.id, weights: phase.weights, status: 'planned', extra: true, required_track: x.track ?? null, requested: x.note ?? null, requested_topic: x.topic_id ?? null });
}
if (spec.extra_slots?.length) log(`${spec.extra_slots.length} owner-requested extra slot(s), indexed from #1001`);

// Slots already scheduled / published / skipped in the previous calendar keep their row.
const frozen = new Map((previous.slots ?? []).filter((s) => ['scheduled', 'published', 'skipped'].includes(s.status)).map((s) => [s.slot_index, s]));

// ── validation of the pool ──────────────────────────────────────────────────
const landerQueries = new Set();
for (const l of registry.landers) for (const loc of ['fr', 'ar', 'en']) if (l[loc]?.h1) landerQueries.add(norm(l[loc].h1).replace(/\b20\d{2}\b/g, '').trim());
const existingTitles = new Set(inventory.posts.flatMap((p) => [p.title_fr, p.title_ar, p.title_en]).map((t) => norm(t).replace(/\b20\d{2}\b/g, '').trim()));
const existingSlugs = new Set(inventory.posts.map((p) => p.slug));
const rejected = [];
const valid = [];
const seenQueries = new Set();
for (const t of topics) {
  const why = [];
  const q = norm(t.primary_query_fr);
  if (!q || !t.angle || !t.pillar_path || !t.track) why.push('champs manquants (primary_query_fr, angle, pillar_path, track)');
  if (targetsLanderQuery(t.primary_query_fr) || (t.primary_query_ar && targetsLanderQuery(t.primary_query_ar))) why.push('requête = requête de page commerciale (article-gate LANDER_QUERIES)');
  if (landerQueries.has(q) || (t.primary_query_ar && landerQueries.has(norm(t.primary_query_ar)))) why.push('requête = H1 d\'une page commerciale');
  if (existingTitles.has(q)) why.push('requête = titre d\'un article existant');
  if (seenQueries.has(q)) why.push('requête en double dans le pool');
  if (t.slug && existingSlugs.has(t.slug)) why.push(`slug « ${t.slug} » déjà dans la table`);
  for (const p of inventory.posts) if (jaccardWords(t.angle, `${p.title_fr}`) > 0.6) { why.push(`angle trop proche de /blog/${p.slug}`); break; }
  for (const o of valid) if (o.cluster === t.cluster && jaccardWords(o.angle, t.angle) > 0.6) { why.push(`angle trop proche du sujet ${o.id} (même dossier)`); break; }
  if (why.length) rejected.push({ id: t.id, batch: t.__batch, why });
  else { valid.push(t); seenQueries.add(q); }
}
log(`${valid.length} valid topics · ${rejected.length} rejected`);

// ── placement ───────────────────────────────────────────────────────────────
const used = new Set();
const byIndex = new Map(slots.map((s) => [s.slot_index, s]));
const assign = (slot, topic, how) => {
  Object.assign(slot, {
    status: 'planned', how,
    track: topic.track, pillar: topic.pillar, cluster: topic.cluster, format: topic.format, audience: topic.audience ?? null, season: topic.season ?? null, hijri_anchor: topic.hijri_anchor ?? null,
    series_id: topic.series_id ?? null, series_part: topic.series_part ?? null, master_locale: topic.master_locale ?? 'fr',
    primary_query_fr: topic.primary_query_fr, primary_query_ar: topic.primary_query_ar ?? null, primary_query_en: topic.primary_query_en ?? null,
    secondary_queries: topic.secondary_queries ?? [], intent: topic.intent ?? null, commercial_intent: topic.commercial_intent ?? null,
    pillar_path: topic.pillar_path, sibling_paths: topic.sibling_paths ?? [], working_titles: topic.working_titles ?? {}, angle: topic.angle,
    closest_existing_url: topic.closest_existing_url ?? null, delta: topic.delta ?? null, outline: topic.outline ?? [],
    stable_facts_needed: topic.stable_facts_needed ?? [], live_components_needed: topic.live_components_needed ?? [],
    faq_seed_questions: topic.faq_seed_questions ?? [], forbidden_topics: topic.forbidden_topics ?? [], length_target: topic.length_target ?? topic.format ?? 'explainer',
    topic_id: topic.id, slug: topic.slug ?? null,
  });
  used.add(topic.id);
};
const isFree = (slot) => slot.status === 'planned' && !slot.topic_id && !frozen.has(slot.slot_index) && !slot.extra;
/**
 * A Hijri anchor is a CONSTRAINT, not a label. A topic anchored to an event
 * has to be live — and found — before that event, so its slot must sit at
 * least `lead_days` ahead of it, plus the `tolerance_days` by which the real
 * Moroccan sighting can move the date. Until this existed the anchor was only
 * copied onto the slot and seven topics landed on or after their own event:
 * « la dernière semaine de Chaabane » published the day AFTER Ramadan began,
 * and the Chawwal post a month after Chawwal had started.
 */
const HIJRI = spec.hijri_anchors ?? {};
const HIJRI_MARGIN = Number(HIJRI.tolerance_days ?? 2) + Number(HIJRI.lead_days ?? 7);
const anchorDeadline = (topic) => {
  const iso = topic.hijri_anchor ? HIJRI[topic.hijri_anchor] : null;
  if (typeof iso !== 'string') return null;
  const deadline = addDays(iso, -HIJRI_MARGIN);
  // An explicit `earliest` is the author's deliberate call and outranks the
  // anchor, because a few topics are ABOUT what follows their anchor — the
  // homecoming after the Hajj, preparing for the next season — and say so with
  // a window that opens after it. The anchor only caps a topic that has none.
  return topic.earliest && topic.earliest > deadline ? null : deadline;
};
/** The last date a topic may be published: its own `latest`, its anchor's deadline, or both. */
const effectiveLatest = (topic) => {
  const dates = [topic.latest, anchorDeadline(topic)].filter(Boolean);
  return dates.length ? dates.sort()[0] : null;
};
const fits = (topic, slot) => {
  if (topic.earliest && slot.date < topic.earliest) return false;
  const latest = effectiveLatest(topic);
  return !latest || slot.date <= latest;
};
const nearestFree = (date, from = 0, to = 10) => {
  for (let d = from; d <= to; d++) {
    const s = slots.find((x) => x.date === addDays(date, d) && isFree(x));
    if (s) return s;
  }
  return null;
};
/**
 * The free slot closest to `date` WITHOUT going past it when there is one —
 * a deadline ("parts 1–6 before 1 January") is a ceiling, so landing a day
 * late to find a free slot defeats it. Falls forward only when nothing is free
 * in the `back` days before the target.
 */
const nearestFreeBefore = (date, back = 4, forward = 14, floor = null) => {
  for (let d = 0; d <= back; d++) {
    const day = addDays(date, -d);
    if (floor && day < floor) break;
    const s = slots.find((x) => x.date === day && isFree(x));
    if (s) return s;
  }
  return nearestFree(date, 1, forward);
};

// 1. frozen rows come back as they were — and the topic each one already
// carries is marked used, or the series loop below would place it a SECOND
// time in a free slot (which is what made every series show one part too many
// once the first slots were scheduled).
for (const [i, row] of frozen) {
  Object.assign(byIndex.get(i) ?? {}, row);
  if (row.topic_id) used.add(row.topic_id);
}
// 1 bis. owner extra slots take exactly the topic the spec names, before
// anything else can claim it.
for (const slot of slots.filter((x) => x.extra && !frozen.has(x.slot_index))) {
  const t = slot.requested_topic ? valid.find((x) => x.id === slot.requested_topic) : null;
  if (!slot.requested_topic) { slot.status = 'unfillable'; slot.skip_reason = `owner extra slot for ${slot.date}: no topic named yet in spec.extra_slots`; continue; }
  if (!t) { slot.status = 'unfillable'; slot.skip_reason = `owner extra slot for ${slot.date} names ${slot.requested_topic}, which is not a valid topic`; continue; }
  if (slot.required_track && t.track !== slot.required_track) { slot.status = 'unfillable'; slot.skip_reason = `owner extra slot for ${slot.date} wants track ${slot.required_track}; ${t.id} is ${t.track}`; continue; }
  if (used.has(t.id)) { slot.status = 'unfillable'; slot.skip_reason = `owner extra slot for ${slot.date}: ${t.id} is already placed`; continue; }
  assign(slot, t, 'extra');
}
// 2. pinned topics
for (const t of valid.filter((t) => t.pinned_slot_index)) {
  if (used.has(t.id)) continue;
  const slot = byIndex.get(t.pinned_slot_index);
  if (slot && isFree(slot)) assign(slot, t, 'pinned');
  else log(`pinned topic ${t.id} wants slot #${t.pinned_slot_index}, which is taken — left unplaced`);
}
// 3. series
const seriesReport = [];
for (const series of spec.series) {
  const parts = valid.filter((t) => t.series_id === series.id && !used.has(t.id)).sort((a, b) => a.series_part - b.series_part);
  const placed = valid.filter((t) => t.series_id === series.id && used.has(t.id)).map((t) => ({ part: t.series_part, slot: slots.find((s) => s.topic_id === t.id) }));
  let lastDate = placed.length ? placed.sort((a, b) => a.part - b.part).at(-1).slot.date : null;
  // A series with deadlines is SPREAD to them rather than packed at the
  // minimum spacing. Without this the twelve Ramadan parts all landed inside
  // ten weeks and part 12 — Eid al-Fitr in Makkah — published three months
  // before Eid. Parts up to `deadline_part6` are spread from the series start
  // to that date, the rest from there to `deadline_part12`; the minimum gap
  // still wins if the interpolated step would be tighter.
  const firstStart = series.start_date ?? S.start_date;
  const anchorPart = series.deadline_part6 ? Math.ceil(series.parts / 2) : null;
  const targetDate = (part) => {
    if (!series.deadline_part6 || !series.deadline_part12) return null;
    const [from, to, lo, hi] = part <= anchorPart
      ? [firstStart, series.deadline_part6, 1, anchorPart]
      : [series.deadline_part6, series.deadline_part12, anchorPart, series.parts];
    const span = daysBetween(from, to);
    return addDays(from, Math.round((span * (part - lo)) / Math.max(1, hi - lo)));
  };
  for (const t of parts) {
    let slot = null;
    if (series.placement === 'windows' && t.window_from) {
      slot = nearestFree(t.window_from, 0, Math.max(0, daysBetween(t.window_from, t.window_to ?? t.window_from)) + 3);
    } else if (targetDate(t.series_part)) {
      const [minGap] = series.spacing_days ?? [6, 9];
      const earliest = lastDate ? addDays(lastDate, minGap) : firstStart;
      const wanted = targetDate(t.series_part);
      slot = wanted > earliest ? nearestFreeBefore(wanted, 4, 14, earliest) : nearestFree(earliest, 0, 14);
    } else {
      const [minGap, maxGap] = series.spacing_days ?? [6, 9];
      const from = lastDate ? addDays(lastDate, minGap) : (series.start_date ?? S.start_date);
      slot = nearestFree(from, 0, lastDate ? maxGap - minGap + 2 : 14);
    }
    if (slot) { assign(slot, t, `series:${series.id}`); lastDate = slot.date; }
    else seriesReport.push(`${series.id} part ${t.series_part}: no free slot in its window`);
  }
  seriesReport.push(`${series.id}: ${valid.filter((x) => x.series_id === series.id && used.has(x.id)).length}/${series.parts} parts placed`);
}
// 4. the free slots by phase weights
const counters = {}; // phase → track → assigned
const expected = (slot, track) => (slot.weights[track] / 100);
let prevCluster = null;
for (const slot of slots) {
  if (!isFree(slot)) { prevCluster = slot.cluster ?? prevCluster; continue; }
  const c = (counters[slot.phase] ??= { ramadan: 0, omra: 0, hajj: 0, total: 0 });
  const order = ['ramadan', 'omra', 'hajj'].sort((a, b) => (c[a] / Math.max(1, c.total) - expected(slot, a)) - (c[b] / Math.max(1, c.total) - expected(slot, b)));
  let chosen = null;
  for (const track of order) {
    const pool = valid.filter((t) => t.track === track && !used.has(t.id) && !t.series_id && !t.pinned_slot_index && fits(t, slot) && t.cluster !== prevCluster)
      .sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2) || (effectiveLatest(a) ?? '9999').localeCompare(effectiveLatest(b) ?? '9999'));
    if (pool.length) { chosen = pool[0]; break; }
  }
  if (!chosen) {
    // relax the cluster rule before giving up
    for (const track of order) {
      const pool = valid.filter((t) => t.track === track && !used.has(t.id) && !t.series_id && !t.pinned_slot_index && fits(t, slot)).sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2));
      if (pool.length) { chosen = pool[0]; slot.note = 'cluster rule relaxed (no other topic fits)'; break; }
    }
  }
  if (chosen) { assign(slot, chosen, `weights:${slot.phase}`); c[chosen.track]++; c.total++; prevCluster = chosen.cluster; }
  else { slot.status = 'unfillable'; slot.skip_reason = `no distinct topic left for ${slot.phase} (${order.join(' > ')}) on ${slot.date}`; }
}

// ── report ──────────────────────────────────────────────────────────────────
const filled = slots.filter((s) => s.topic_id || frozen.has(s.slot_index));
const unfillable = slots.filter((s) => s.status === 'unfillable');
const perPhase = spec.phases.map((p) => { const ss = slots.filter((s) => s.phase === p.id); const f = ss.filter((s) => s.track); return `| ${p.id} ${p.from} → ${p.to} | ${ss.length} | ${f.filter((s) => s.track === 'ramadan').length} / ${f.filter((s) => s.track === 'omra').length} / ${f.filter((s) => s.track === 'hajj').length} | ${p.weights.ramadan}/${p.weights.omra}/${p.weights.hajj} | ${ss.filter((s) => s.status === 'unfillable').length} |`; });
const report = `# Calendar report — generated ${new Date().toISOString().slice(0, 16)}Z

Slots: **${slots.length}** (${S.start_date} → ${S.end_date}, ${S.posts_per_cycle} posts every ${S.cycle_days} days at ${S.slot_times.join(' / ')} ${S.timezone}).
Filled: **${filled.length}** · unfillable: **${unfillable.length}** · topics in the pool: ${topics.length} (valid ${valid.length}, rejected ${rejected.length}, unused valid ${valid.filter((t) => !used.has(t.id)).length}).

## Phases (assigned ramadan / omra / hajj vs the brief's weights)

| Phase | Slots | Assigned R / O / H | Weights | Unfillable |
|---|---|---|---|---|
${perPhase.join('\n')}

## Series

${seriesReport.map((l) => `- ${l}`).join('\n')}

${spec.series.map((s) => `### ${s.id}\n\n| Part | Slot | Date | Query |\n|---|---|---|---|\n${slots.filter((x) => x.series_id === s.id).sort((a, b) => a.series_part - b.series_part).map((x) => `| ${x.series_part} | ${x.slot_index} | ${x.date} | ${x.primary_query_fr} |`).join('\n')}`).join('\n\n')}

## Unfillable slots (${unfillable.length})

${unfillable.length ? unfillable.map((s) => `- #${s.slot_index} ${s.date} (${s.phase}) — ${s.skip_reason}`).join('\n') : '- none'}

## Rejected topics (${rejected.length})

${rejected.length ? rejected.map((r) => `- ${r.id} (${r.batch}): ${r.why.join('; ')}`).join('\n') : '- none'}

## Unused valid topics (${valid.filter((t) => !used.has(t.id)).length})

${valid.filter((t) => !used.has(t.id)).map((t) => `- ${t.id} [${t.track}/${t.cluster}] ${t.primary_query_fr}${t.earliest || t.latest ? ` (window ${t.earliest ?? '…'} → ${t.latest ?? '…'})` : ''}`).join('\n') || '- none'}
`;

const out = { generated_at: new Date().toISOString(), settings: S, slots: slots.map(({ weights, ...s }) => s) };
if (!DRY) {
  writeFileSync('data/content-calendar.json', `${JSON.stringify(out, null, 2)}\n`);
  mkdirSync('docs/content-system', { recursive: true });
  writeFileSync('docs/content-system/calendar-report.md', report);
  log('wrote data/content-calendar.json + docs/content-system/calendar-report.md');
}
log(`filled ${filled.length}/${slots.length} · unfillable ${unfillable.length} · rejected ${rejected.length}`);

// ── seed the tables (migration 026) ─────────────────────────────────────────
if (SEED && !DRY) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { log('no Supabase env — not seeding'); process.exit(0); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const probe = await sb.from('content_calendar').select('slot_index, status').limit(1000);
  if (probe.error) { log(`content_calendar not available (${probe.error.message}) — apply supabase/migrations/026_content_ops.sql, then re-run with --seed`); process.exit(0); }
  const keep = new Set((probe.data ?? []).filter((r) => ['scheduled', 'published', 'skipped'].includes(r.status)).map((r) => r.slot_index));
  const settingsRow = { id: 1, cycle_days: S.cycle_days, posts_per_cycle: S.posts_per_cycle, slot_times: S.slot_times, start_date: S.start_date, buffer_days: S.buffer_days, enabled: S.enabled, similarity_threshold: S.similarity_threshold, timezone: S.timezone };
  const e1 = (await sb.from('content_ops_settings').upsert(settingsRow, { onConflict: 'id' })).error;
  const e2 = (await sb.from('content_series').upsert(spec.series.map((s) => ({ id: s.id, title_fr: s.title_fr, title_ar: s.title_ar, title_en: s.title_en, parts: s.parts, master_locale: s.master_locale, track: s.track, pillar_path: s.pillar_path, description: s.description ?? null })), { onConflict: 'id' })).error;
  const e3 = (await sb.from('lander_registry').upsert(registry.landers.map((l) => ({ path: l.path, kind: l.kind, indexable: l.indexable, h1_fr: l.fr?.h1 ?? null, h1_ar: l.ar?.h1 ?? null, h1_en: l.en?.h1 ?? null, title_fr: l.fr?.title ?? null, title_ar: l.ar?.title ?? null, title_en: l.en?.title ?? null, query_fr: l.fr?.h1 ? norm(l.fr.h1).replace(/\b20\d{2}\b/g, '').trim() : null, query_ar: l.ar?.h1 ? norm(l.ar.h1).replace(/\b20\d{2}\b/g, '').trim() : null, query_en: l.en?.h1 ? norm(l.en.h1).replace(/\b20\d{2}\b/g, '').trim() : null, month: l.month, occasion: l.occasion, city: l.city, hotel: l.hotel, last_seen_at: registry.generated_at })), { onConflict: 'path' })).error;
  const rows = out.slots.filter((s) => !keep.has(s.slot_index)).map((s) => ({
    slot_index: s.slot_index, publish_at: s.publish_at, track: s.track ?? 'omra', pillar: s.pillar ?? 'omra', cluster: s.cluster ?? '-', format: s.format ?? 'explainer', audience: s.audience, phase: s.phase, hijri_anchor: s.hijri_anchor,
    series_id: s.series_id, series_part: s.series_part, master_locale: s.master_locale ?? 'fr', primary_query_fr: s.primary_query_fr ?? '(unfillable)', primary_query_ar: s.primary_query_ar, primary_query_en: s.primary_query_en,
    secondary_queries: s.secondary_queries ?? [], intent: s.intent, commercial_intent: s.commercial_intent, pillar_path: s.pillar_path ?? '/bab-makka', sibling_paths: s.sibling_paths ?? [], working_titles: s.working_titles ?? {}, angle: s.angle ?? s.skip_reason ?? '-',
    closest_existing_url: s.closest_existing_url, delta: s.delta, outline: s.outline ?? [], stable_facts_needed: s.stable_facts_needed ?? [], live_components_needed: s.live_components_needed ?? [], faq_seed_questions: s.faq_seed_questions ?? [], forbidden_topics: s.forbidden_topics ?? [],
    length_target: s.length_target, status: s.status, slug: s.slug ?? null, skip_reason: s.skip_reason ?? null,
  }));
  const e4 = (await sb.from('content_calendar').upsert(rows, { onConflict: 'slot_index' })).error;
  for (const [name, e] of [['content_ops_settings', e1], ['content_series', e2], ['lander_registry', e3], ['content_calendar', e4]]) log(`${name}: ${e ? `ERROR ${e.message}` : 'ok'}`);
  log(`seeded ${rows.length} calendar rows · left ${keep.size} scheduled/published/skipped row(s) untouched`);
}
