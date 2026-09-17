# RUNBOOK — the content system

Operations, one procedure per problem. Everything here is done from the repo
root or from the admin; nothing needs a paid service and nothing needs a cron.

Two facts to hold before touching anything:

- **Publishing is a database fact, not an action.** An article is public the
  moment `published_at` has passed, because the anon RLS policy on
  `public.articles` is `is_published and (published_at is null or published_at
  <= now())`. Nothing "publishes" it. Hourly ISR (`revalidate = 3600` on the
  article page, the blog index, the sitemap and `/llms.txt`) makes it visible
  within the hour.
- **Cadence is a ceiling.** A slot that fails the gate is skipped and logged.
  The calendar never lowers its bar to fill a date.

---

## Pause everything

You want no new article scheduled, without losing the plan.

1. Admin → **Calendrier éditorial** → the toggle in the list is « actif ». Turn
   it off on the slots you do not want written. Or, for the whole system:
2. In `data/content-calendar-spec.json` set `"enabled": false` under
   `settings`, then `npm run content:calendar -- --seed` to push it to
   `content_ops_settings`. The generating session reads `enabled` first and
   stops.
3. Nothing already scheduled is affected — those rows have their `published_at`
   and will go live on time. To stop one of those, see **Unschedule a post**.

Articles already live stay live. This system never unpublishes anything.

---

## Unschedule a post that has not gone live yet

The post is in `articles` with a future `published_at`.

1. Admin → **Articles** → open it → turn the publish toggle **off**. It
   disappears from every public surface within the hour (RLS + ISR) and never
   appears, because `is_published` is now false.
2. If it should never exist: leave it unpublished. Do **not** delete the row if
   the URL was ever live — see **A post is wrong and already live**.
3. Admin → **Calendrier éditorial** → its slot → status « Abandonné » and a
   `Motif d'abandon`, so the next generating session does not re-take it.

To move it instead of dropping it, change `published_at` in the admin to any
future instant. There is no other switch: the date *is* the schedule.

---

## Write one post for tomorrow, by hand

1. Pick the slot: `data/content-calendar.json`, the first `status: "planned"`
   row whose `publish_at` suits you, or add a slot by hand with a free
   `slot_index`.
2. Write `content/articles/AAAA-MM-JJ-<slug>.json` following
   `content/ARTICLE-BRIEF.md` exactly, with `"slot_index": <n>` so the ingest
   uses that slot's `publish_at`.
3. Gate it:
   ```
   npm run content:gate -- content/articles/AAAA-MM-JJ-<slug>.json --offline
   ```
   G6 (link status), G13 and G16 report `pending` without a build — that is
   expected. Everything else must be `ok`.
4. Commit and push. Vercel's build runs `prebuild → scripts/ingest-articles.mjs`,
   which re-runs the strict gate, inserts the row with `published_at` = the
   slot (never earlier than now + 24 h) and marks the slot `scheduled`.
5. The post appears by itself when the instant passes.

For a post that must go out *tomorrow morning* with no slot, omit `slot_index`:
the ingest falls back to the next free 08:00 Africa/Casablanca morning.

---

## Change the cadence

`data/content-calendar-spec.json` → `settings`:

| Field | Meaning |
|---|---|
| `cycle_days` | days per cycle (3) |
| `posts_per_cycle` | posts per cycle (2) |
| `slot_times` | local times of the slots inside a cycle (`["08:30","18:00"]`) |
| `start_date` / `end_date` | the span the calendar covers |
| `buffer_days` | how far ahead the generator keeps writing (60) |
| `similarity_threshold` | gate G15's ceiling (0.85) |

Then:

```
npm run content:calendar          # rebuild data/content-calendar.json + the report
npm run content:calendar -- --seed   # and push it to the tables (026 applied)
```

Slots already `scheduled`, `published` or `skipped` are **never** rewritten by a
rebuild — only `planned` and `unfillable` ones move. Read
`docs/content-system/calendar-report.md` after every rebuild: it lists the new
counts per phase, the series placement and every slot no topic could fill.

---

## Read the gate reports

One JSON per post in `docs/content-system/gate-reports/<slug>.json`:

```json
{ "slug": "...", "ok": false, "failed": ["G4","G12"], "pending": ["G13","G16"],
  "words": { "fr": 1512, "ar": 1180, "en": 1290 },
  "checks": { "G4": { "ok": false, "details": ["body_fr : FAQ de 3 question(s), attendu 5–6"] } } }
```

- `failed` is what blocks. Fix the **post**, never the rule, unless the rule is
  genuinely wrong — then fix `scripts/content-gate.mjs`, say so in the commit,
  and re-run every other post to see what the change lets through.
- `pending` means the rule needs the isolated build (G6's link statuses, G13's
  emitted schema, G16's rendered body). To resolve them:
  ```
  $env:NEXT_DIST_DIR=".next-audit"; $env:CONTENT_PREVIEW_SCHEDULED="1"; npm run build
  npm run content:gate -- --slug=<slug> --require-build
  ```
  `CONTENT_PREVIEW_SCHEDULED=1` is a **local build flag only** — it makes the
  build prerender rows whose slot has not passed. Never set it on Vercel.
- The rule numbers: G0 the shared strict gate · G1 word count · G2 answer-first
  40–55 words · G3 four question H2s · G4 FAQ 5–6 × 30–75 words · G5 volatile
  facts · G6 internal links · G7 external links · G8 query ownership ·
  G9 language purity · G10 banned phrases · G11 quotations · G12 title and meta
  · G13 schema · G14 Hijri component on Ramadan/Hajj · G15 similarity ·
  G16 rendered HTML without JavaScript.

---

## Re-gate what is already in the table (the drift audit)

The gate reads drafts. A rule added later never reaches a row that is already
ingested — that is how two live posts kept 43 prices in prose for a week after
the rule forbidding them landed. Run this after any rule change, and monthly:

```
npm run content:gate -- --existing=scheduled --offline --quiet --out=docs/content-system/gate-reports/drift
npm run content:gate -- --existing=published --offline --quiet --out=docs/content-system/gate-reports/drift
```

- `--existing=scheduled` **exits 1** on any failing row: it has not gone out, so
  fix or unschedule it (§ Unschedule a post). Do not wire it into `prebuild`
  while pre-contract rows are still queued — it would block every deploy.
- `--existing=published` lists failures as **backlog and exits 0**. Keep it that
  way: a gate that is permanently red gets loosened.
- In a normal build a scheduled row has no page, so G13 and G16 report `pending`
  for it rather than failing. To judge them, build with
  `CONTENT_PREVIEW_SCHEDULED=1` first (locally only).
- G6 accepts a link to a still-scheduled sibling when that sibling publishes no
  later than the post linking to it (e5dfcd4), so a G6 link failure is real.

Write the result up as `audit-YYYY-MM.md` beside this file.

---

## Owner-requested extra slots

The owner can ask for a post on a date the cadence does not cover.

1. Append an entry to `spec.extra_slots` in `data/content-calendar-spec.json` —
   `{ "date": "2026-10-02", "time": "08:00", "track": "ramadan", "note": "…" }`.
   Append only: the list order is the slot numbering (#1001, #1002, …), and
   scheduled slots are matched by number.
2. Name the topic for it with `"topic_id"`. The topic must match the track, be
   unplaced, fit its own date window and Hijri deadline, and not be a series
   part or a pinned topic — otherwise the slot stays `unfillable` with the reason.
   A topic already placed in a cadence slot moves to the extra slot on rebuild.
3. `npm run content:calendar`, then check `calendar-report.md`: the extra slot
   shows its topic, and the scheduled / skipped slots are unchanged.
4. The generator writes the post with `slot_index` set to the extra slot's
   number; the ingest schedules it at that slot's `publish_at` (never earlier
   than now + 24 h).

The ten slots #1001–#1010 (2–23 Oct 2026, Ramadan) were requested on
2026-09-15 and are waiting for their topics.

---

## A lander disappears (a month goes noindex, an occasion is unpublished)

Nothing breaks, by design — but check it.

The posts point at **intents**, not URLs. `src/lib/content-resolver.js` resolves
`intent="month:11"` through `monthLanderIndexable()`, `intent="city:fes"`
through `cityPageIndexable()`, `intent="ramadan"` through the occasion's
`is_published`. When the target stops qualifying, the CTA silently falls back to
`/bab-makka` and still renders a live figure. No 404, no link into a noindex
page.

What to do anyway:

1. `npm run content:inventory` — rebuilds `data/lander-registry.json` and
   `docs/content-system/inventory.json` from the database and the build output.
2. `npm run content:calendar` — any planned slot whose `pillar_path` is now gone
   is re-checked; the report names it.
3. `npm run links:audit` and `npm run seo:suite` against the new build: a
   markdown link inside an old body (the 36 pre-system posts have them) can
   still point at a noindex page. Those are the ones to fix by hand.

---

## The Hijri dates move after the sighting

The moon is sighted, the ministry announces, and the computed date was off by a
day.

1. Admin → **Dates hégiriennes** → the row (e.g. `ramadan` / 1448) → correct
   « Date grégorienne » → turn the list toggle **on** (« confirmée »).
2. Every `<HijriCountdown>` and `<RamadanNightsTable>` on the site picks the new
   date up within the hour, drops the « ± deux jours » caveat and keeps the
   moon-sighting one.
3. `npm run content:hijri` never overwrites a confirmed row. Re-run it freely.

---

## A post is wrong and already live

1. Admin → **Articles** → fix the text in place. Never delete the row and never
   change the slug: the URL is live and a deleted URL 404s (rulebook: no
   deletions, no 404s). If the slug truly must change, add the 301 in
   Admin → **Redirections** first.
2. If the error is a *volatile fact in prose* (a price, a date, a distance),
   replace it with the tag that renders it live —
   `content/ARTICLE-BRIEF.md` § « Les balises » lists them — so it can never go
   stale again.
3. If the gate should have caught it, add the rule to
   `scripts/content-gate.mjs`, re-run the gate over every file
   (`npm run content:gate`) and record what it now catches in the commit.

---

## The agency's rules change (deposit, passport, payment)

Admin → **Règles (acompte, passeport)** → edit the text, set « Vérifiée le ».
Every article rendering `<PolicyFact key="…" />` changes at once, in all three
locales, with no rebuild of any post. Then `npm run content:facts` so the
writing sessions quote the new wording.

---

## Apply the database side

In order, in the Supabase SQL editor, on staging then production:

1. `supabase/migrations/025_content_system.sql` — `hijri_events`, the
   `article_plan` columns.
2. `supabase/migrations/026_content_ops.sql` — `content_ops_settings`,
   `content_series`, `content_calendar`, `lander_registry`,
   `content_ops_events`, `policies` (seeded from the published FAQ), and the
   `team_members.knows_about` / `.affiliation` columns.

Then:

```
npm run content:hijri       # seed the Hijri events
npm run content:facts       # rebuild data/allowed-facts.json from the DB
npm run content:inventory   # rebuild the inventory + the lander registry
npm run content:calendar -- --seed   # push the calendar, series and registry
```

Every one of those scripts is idempotent and read-only against content it does
not own. Without the migrations the site still works: the components fall back
to the dictionary copy and the repo's JSON files are the record.

---

## Prove publish-by-time still holds

```
npm run content:proof
```

Reads every article row with the service key and again with the anon key, and
asserts that the anon client sees exactly the rows whose `published_at` has
passed — plus, when an isolated build exists, that the prerendered sitemap lists
no future-dated post. Run it after any change to RLS, to the article helpers or
to the ingest.
