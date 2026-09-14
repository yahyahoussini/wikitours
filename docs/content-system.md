# The content system — generate-ahead, render-live, publish-by-time

Decided 2026-09-14 (standing brief). Goal: #1 in Morocco for Omra, Omra Ramadan
and Hajj queries, in French and Arabic. This file is the map of what exists,
what was built, what the brief contradicted in the repo, and what stays open.
The writing contract is `content/ARTICLE-BRIEF.md`; the rules are enforced by
`src/lib/server/article-gate.mjs` (strict mode) at every build.

## How a post is born, lives and shows

| Step | Where | Notes |
|---|---|---|
| Written ahead of time | a Claude Code session, following `content/ARTICLE-BRIEF.md` → `content/articles/AAAA-MM-JJ-<slug>.json` | No runtime model call exists. The API drafter is retired (`/api/cron/draft-article` answers 410; its cron entry is gone). |
| Stable facts | `data/allowed-facts.json`, rebuilt by `npm run content:facts` (`scripts/build-allowed-facts.mjs`, read-only on the DB) | One entry per fact with `source` and `as_of`: settings (licence, address, phones, hours, Google rating/count), brand, the 53 published FAQ, the 42 glossary terms, departure cities and Moroccan month names in three scripts. `official` is hand-maintained (URL + date), never by a model. |
| Volatile facts | placeholder tags in the body → `src/components/content/ArticleBody.jsx` | `<CommercialCTA to>` `<LiveDepartures>` `<ReviewQuote id>` `<HijriCountdown event>` `<DepositPolicy>` `<HotelList city>` — server components reading Supabase at request time (`src/lib/content-tags.js` is the parser + validator; nothing from a body is ever injected as raw HTML). |
| Gate | `scripts/ingest-articles.mjs` (`prebuild`) → `qualityGate(draft, { strict: true })` | Fails: any year (except "depuis 2016"), price or currency amount, departure date, seat count in a title/excerpt/description/body; an unknown tag or attribute; a `ReviewQuote` id that is not a published testimonial; a Levantine month name or a Latin city name in the Arabic body; a `query_family` that is a lander's query; a missing `<CommercialCTA>` / owner link. A failing file is skipped and logged (build log + `article_plan.notes`) — never inserted. |
| Publish | `is_published = true` + `published_at` = next free 08:00 **Africa/Casablanca** slot (`nextMorningSlot`, zone-aware — Ramadan's UTC+0 included) | The anon RLS policy on `articles` is `is_published and published_at <= now()`: a post is public the moment its slot passes. **These two columns are the brief's `status='scheduled'` / `publish_at`** — see decision 1 below. |
| Surfaces | `/blog`, `/blog/[slug]`, `/sitemap.xml`, `/llms.txt`, hubs' « Pour aller plus loin » | All read through the anon client (RLS decides). ISR: blog index 3600, article page 3600 (was `false`), sitemap 3600 (was 86400), llms.txt 3600 (was 86400) — a due post surfaces within the hour without a cron. |
| Hijri | `src/lib/hijri.js` (`@umalqura/core`, MIT, zero dependency) → `public.hijri_events` (migration 025) via `npm run content:hijri` | Events: ramadan, laylat-al-qadr, eid-al-fitr, dhul-hijja, arafat, eid-al-adha, ashura, mawlid, for the current Hijri year + 2. The admin can move a date after the sighting (`is_confirmed` rows are never overwritten). Every rendering carries the caveat (`content.hijriCaveat`: « sous réserve de l'observation de la lune » / « حسب رؤية الهلال »). |
| Author | `team_members` row `yahya-houssini` → `articles.author_id`; `reviewer_id` / `reviewed_by` always null | The profile is the owner's to complete (`docs/authors-intake.md`); until then the byline shows the name and the schema author falls back per `src/lib/authors.js`. Nothing about him is ever written by code. |
| Plan | `article_plan` + migration 025 columns `slot` (omra / ramadan / hajj), `query_family_ar`, `secondary_queries`, `secondary_queries_ar`, `angle_ar` (admin → Plan éditorial) | Ramadan and Hajj slots are co-mastered in Arabic; secondary queries carry the transliterations (3omra, oumra, umrah, hadj, 7ajj, ramdan) and Darija phrasings. |
| Tests | `npm test` → `tests/content-tags.test.mjs`, `tests/hijri.test.mjs`, `tests/articles.test.mjs` (+ the earlier three) | The gate rules, the parser, the Casablanca slot in all 12 months, the Hijri conversions. |

## Found and reused (nothing rebuilt that existed)

- Publish-by-time was already the database's rule (RLS, migration 020); the
  07:00 release cron never published anything — it revalidated caches and pinged
  IndexNow because the article page was `revalidate = false`.
- The $0 pipeline (JSON files → `prebuild` ingest → the dependency-free gate)
  is exactly "generated in Claude Code sessions"; it was extended, not replaced.
- Live components that already existed and are reused by the tags: `OfferCard`
  (`<LiveDepartures>`), `CtaBlock` + `waLink` (`<CommercialCTA>`), the
  testimonial figure and `getTestimonials()` (`<ReviewQuote>`), `getHotels()`
  (`<HotelList>`), `t.offer.depositLine` + `meta.trustNoPayment`
  (`<DepositPolicy>`), `departuresInMonth` / `targetYearFor` / `monthName` /
  `cityName` / the cluster anchors.
- The "reviews table" is `testimonials` (no `reviews` table exists; Google
  review text is never stored, by design).
- Moroccan month names come from ICU's `ar-MA` data (`monthName`), Arabic city
  names from `src/i18n/ar.json` `cities`; the religious register terms are
  already in the dictionaries.

## Contradictions between the brief and the repo — and what was decided

1. **`status='scheduled' AND publish_at <= now()`** — the repo has
   `is_published` + `published_at`, enforced by RLS on every anon read.
   Decision: keep the existing pair; it *is* the model (renaming would touch
   RLS, the admin, the ingest, the queue and the sitemap for no behaviour).
   Reopen only if the owner wants the literal column names.
2. **"No cron"** — five crons exist. `draft-article` is retired (this run).
   `publish-articles` never published; with the ISR changes it is only an
   accelerator (same-hour IndexNow ping + runway e-mails). Kept for now;
   removing it loses those two things unless a render-time IndexNow ping is
   added (run 2 candidate). `rollup`, `sync-reviews`, `ping` are not content.
3. **"No runtime LLM call"** — the drafter module (`article-drafter.js`) still
   exists because `/api/content/facts` imports `buildFactSheet` from it; the
   route that called the model is a 410 stub and the cron is gone. Moving
   `buildFactSheet` out and dropping `@anthropic-ai/sdk` is run-2 cleanup.
4. **Existing content carries years and prices** (36 live articles, 3 slugs
   with a year, the price article `prix-omra-maroc-par-gamme-et-mois`). The
   strict gate applies to NEW files only (the ingest skips slugs already in
   the table). Existing URLs stay (never break a URL); converting their bodies
   to tags is a content task, not done here.
5. **Ten plan rows target lander queries** (`omra janvier` … `omra decembre`,
   owner `/omra-{mois}`): the gate now refuses them mechanically. They need
   re-angling to long-tail questions (e.g. « que porter pour la Omra en
   janvier », « omra pendant les vacances de février avec des enfants ») —
   owner's plan, not rewritten here.
6. **Arabic register** — the old contract said "arabe standard moderne"; the
   new one says Moroccan register with the Moroccan month names, Arabic city
   names and the religious terms, Darija only in secondary queries and FAQ
   questions. The gate checks the month and city rules; the register itself
   is a writing rule.
7. **Hijri via `@umalqura/core`** — the site already computed Hijri with ICU's
   Umm al-Qura calendar (`month-stats.js`, month-level). The package was added
   because the countdown needs the reverse conversion (Hijri → Gregorian);
   both use the same Umm al-Qura tables and the unit test pins them together.
8. **Deposit policy "from Supabase"** — it is dictionary copy today
   (`t.offer.depositLine`, also on every departure page). `<DepositPolicy>`
   renders that one source; a `settings.deposit_policy_{fr,ar,en}` column is a
   one-migration change when the owner wants to edit it from the admin.
9. **"reviews table"** — `testimonials` (see above). No second table.
10. **The forensic audit of 9 Sept 2026** is not a file in the repo; the record
    of that date is CLAUDE.md § "SEO baseline as of 2026-09-09". Nothing here
    contradicts it.

## Skipped in this run, and why

- Renaming `is_published/published_at` (decision 1).
- Removing `publish-articles` and `@anthropic-ai/sdk` (decisions 2–3): needs
  the render-time IndexNow ping first, otherwise a feature is lost.
- Re-angling the ten month plan rows and converting the 36 existing bodies to
  tags: the owner's content, and constraint 9 forbids inventing the replacement
  angles' facts.
- `<ReviewQuote>` ids in `/api/content/facts`: the session needs a list of
  published testimonial ids to pick from — the endpoint does not expose them
  yet (run 2).
- A `settings.founded_year` column: 2016 is a code constant cited as such in
  `data/allowed-facts.json`.

## Next step

Run 2: (a) apply migration 025 and `npm run content:hijri`; (b) expose
published testimonial ids (and nothing else about them) in
`/api/content/facts`; (c) render-time IndexNow ping (`after()`) so the release
cron can go; (d) the owner re-angles the ten month rows and completes the
author profile; (e) the first generated batch under the new contract, gated.
