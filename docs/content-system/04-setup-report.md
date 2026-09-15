# 04 — Setup report

What this run found, reused, built and replaced; where the brief and the
codebase disagreed and what was decided; the slots that cannot be filled; and
the questions only the owner can answer. Written 2026-09-15.

Read `RESUME.md` for the state and the procedure, `RUNBOOK.md` for operations.

---

## Found

Discovery reused run 1's `00-existing-state.md` and diffed it against the
database rather than re-deriving it. The inventory is generated, not asserted:
`npm run content:inventory` reads every row and every prerendered page into
`docs/content-system/inventory.json`, `inventory-posts.csv` and
`data/lander-registry.json`.

| | |
|---|---|
| Blog posts | **36** rows — 28 live, 8 scheduled to 22 Oct 2026, 0 drafts. All 36 trilingual |
| Their depth | **25 of 36 are under 450 French words** (7 under 350, only 2 over 1 000); **34 of 36 carry no FAQ block**; 3 have a year in the slug; 11 carry a year in the French body and 3 carry MAD amounts |
| Pages that own a topic | **58** — 44 indexable. 12 month landers (3 indexable), 9 occasion hubs (5 published), 8 city pages (all indexable), 7 guide pages, the glossary, the barometer (noindex by its own ≥3-departures rule), 8 hotels, 4 live departures, plus home / pillar / hubs / trust |
| Live-renderable data | 4 published departures with 4 tiers each (28 tier rows), 8 hotels, 8 authored city logistics blocks, 7 published text testimonials, 53 FAQ, 42 glossary terms, the settings record |
| The author record | `team_members.yahya-houssini` exists and is **empty** — `role_fr` is literally `[À COMPLÉTER] rôle`, `is_placeholder` true, every bio null. So no byline, no `/equipe` card, no `Person` node renders today; articles are signed with the organisation |
| Images | Already free: `next/og` (Satori) renders the OG card on the Vercel function. No paid service anywhere |
| Publishing | Already publish-by-time: the anon RLS policy on `articles` is `is_published and (published_at is null or published_at <= now())`. Nothing "publishes" a post |

Two defects worth naming, both in the coverage map's footnotes: four occasion
hubs render a broken Arabic H1 (`Omra رمضان`, `Omra الصيفالصيف 2026`,
`Omra عمرة شتنبر 2026 2026` — a Latin word on the Arabic page and a doubled
year), and the two Madinah hotels are still tagged `city = makkah`, so their
schema locality is wrong and `<HotelList city="madinah" />` renders nothing.
The first is fixed in this run; the second is a data edit only the owner can
make.

---

## Reused, not rebuilt

- The whole `$0` pipeline: `content/ARTICLE-BRIEF.md` → `content/articles/*.json`
  → `scripts/ingest-articles.mjs` at `prebuild` → the `articles` table.
- `is_published` / `published_at` as the schedule. They ARE the brief's
  `status='scheduled' AND publish_at <= now()`.
- The tag → server-component renderer from run 1 (`ArticleBody`), extended
  rather than replaced.
- The existing live components the new tags wrap: `OfferCard`, `CtaBlock`,
  `HajjBridge`, the testimonial figure, `getHotels()`, `getTestimonials()`.
- The cluster map (`src/lib/clusters.js`) as the sibling-link source.
- `next/og` and the existing `OgCard` for hero images — scaled, not rewritten.
- The SEO suite and the schema gate as the build's existing gate.

---

## Built

| | |
|---|---|
| Resolver | `src/lib/content-resolver.js` — `resolveIntent()` maps an INTENT to the best existing **indexable** lander at request time, through the same predicates the sitemap and footer use; anything that no longer qualifies falls back to `/bab-makka` |
| Live components | `<PriceRange>`, `<HotelCard>`, `<PolicyFact>`, `<HajjBridgeCTA>`, `<RamadanNightsTable>`, and `<CommercialCTA intent>`; the parser now accepts `{{live:alias attr=v}}` as well as `<Tag attr="v" />`, and an unknown `{{live:…}}` renders nothing and logs |
| Gate | `scripts/content-gate.mjs`, G0–G16, one JSON report per post, committed |
| Calendar | `data/content-calendar-spec.json` + `data/content-topics/*.json` → `scripts/build-content-calendar.mjs` → **243 slots**, 21 Sep 2026 → 19 Sep 2027, plus `calendar-report.md` |
| Tables | migration 026: `content_ops_settings`, `content_series`, `content_calendar`, `lander_registry`, `content_ops_events`, `policies` (seeded verbatim from the published FAQ), `team_members.knows_about` / `.affiliation`. 025 gains five month-start Hijri events and a tolerance column |
| Admin | three entities — Calendrier éditorial, Règles (acompte, passeport), Dates hégiriennes |
| Hero images | `/{locale}/blog/{slug}/hero` draws a 1600×900 typographic card when a post has no gallery cover; the article page uses it and the share card scales from the same component |
| Schema | `src/lib/article-schema.js` builds BlogPosting + FAQPage once, for the page **and** the gate (G13), plus the DATA-BASIS line under every article in all three locales |
| Proof | `npm run content:proof` — the anon client sees exactly the rows whose `published_at` has passed, the prerendered sitemap included |
| Reviewers | `docs/content-system/reviewers/{fr,ar}-reviewer.md`, threshold 8, one rewrite then skip |
| Facts | `data/allowed-facts.json` gains policies, catalogue, city logistics and the Hijri anchors; official ministry/Nusuk facts live hand-kept in `data/official-facts.json` with a `verification` field |

---

## Replaced, and why

- **`<CommercialCTA to="/path">` → `<CommercialCTA intent="…">`.** A hard-coded
  lander URL survives neither a month going noindex nor an occasion being
  unpublished. `to=` still parses, so run 1's files keep working.
- **Any external link was a hard blocker → an off-whitelist link is.** The old
  rule came from the API drafter, which could invent a URL. The contract now
  requires a « Sources » section citing the ministry or Nusuk on Hajj and visa
  content, and G7 already whitelists nine official domains.
- **The owner-link rule accepted only `to=`.** It forced every post using the
  intent form to carry a second, duplicate CTA block purely to pass. It now
  resolves an intent through `intentPath()`.
- **`article_plan` → `content_calendar` as the plan.** The plan table stays (the
  admin still edits it) but it holds one line per topic; the calendar holds one
  row per slot with its date, its delta, its outline and its forbidden topics.

The last two were found by the first gated posts, not by inspection — both are
recorded in the commit that fixed them.

---

## What the process caught, and where it was fixed

None of these was found by reading the code. Each surfaced because a real post
was put through the gate and then through two reviewers, and each was fixed at
the rule rather than worked around in the article — which is the discipline the
brief asks for, and the reason the list is worth keeping.

### Rules that were wrong (fixed in the gate)

| Defect | What it did | Fix |
|---|---|---|
| The owner-link rule accepted only `<CommercialCTA to="…">` | A post using the `intent` form — the one the architecture requires — had to carry a **second, duplicate CTA block** just to pass, because a markdown link to a commercial page is itself a G6 failure | `linksOwner` resolves an intent through `intentPath()` |
| Any external link blocked publication | The Hajj post was skipped by the ingest for citing `habous.gov.ma` — **exactly the source the contract requires** | The nine-domain whitelist moved into the shared gate: off-whitelist is a blocking problem, an official source is allowed |
| `clusterOfPath()` returned the first cluster whose pillar **or** pages matched | `/omra-ramadan` is the pillar of cluster D but sits in cluster A's `pages`, so a Ramadan article was asked for cluster A siblings — all commercial pages G6 forbids linking. **The rule was unsatisfiable.** It also made the live Ramadan hub render the wrong cluster's links | A pillar match wins; `tests/clusters.test.mjs` pins every pillar |
| The prose rules read markdown link **targets** as prose | Linking one of the three existing posts whose slug carries a year — which the sibling rule asks for — failed "année en clair" | `proseText()` strips link targets, keeps the visible label |
| A post already ingested counted as a duplicate of itself | Re-gating a correction failed G8 and G0 on its own slug, making **the review loop's one allowed rewrite ungateable** | A slug is exempt while its slot is still in the future |
| The ingest was idempotent by slug with no way back | A post corrected after review could never reach its row | `--refresh` updates a row that is still scheduled, never a live one |

### Things no rule can see (found by the reviewers)

The mechanical gate passed all of these. Every one is a claim asserted in the
present tense of general truth that only the agency could have observed.

- A **health rule** — "les examens et les vaccinations fixés par les autorités
  sanitaires compétentes" — with no source, and it had reached the answer-first
  block that `speakable` points at.
- A **fabricated statistic** — "c'est, de loin, la cause la plus fréquente de
  dossiers retardés".
- A **fiqh ruling** stated twice in juristic form with no named source.
- A claim about the **origin-composition of crowds** at the Haram.
- A claim that the **Rawdah is easier to reach** in a quiet month, which
  contradicts the glossary key in the same fact file: access goes through a
  Nusuk reservation, not a queue.

They are one family, and the fix is one rule: `content/ARTICLE-BRIEF.md`
**1 bis** — what the agency observes is written as an observation, in one of two
forms only (attributed, or referred to the page that owns the question), never
in the key-facts box, never in the answer-first block, and never as a table
column unless a key supports it. That closes the family for the eleven
remaining month posts and the eleven remaining Ramadan parts.

**This is the argument for keeping both reviewers in the loop.** The gate is
mechanical and catches what is countable; it cannot tell a sourced sentence from
a plausible one. Two of the four posts were rejected by a reviewer after passing
every automated rule.

---

## Contradictions between the brief and the repo

1. **`status='scheduled' AND publish_at <= now()`** — the repo has
   `is_published` + `published_at`, enforced by RLS on every anon read.
   **Decision: keep them.** They are the same model; renaming would touch RLS,
   the admin, the ingest, the queue and the sitemap for no behaviour change.
   `npm run content:proof` demonstrates the semantics the brief asked for.
2. **"cycle_days=3, posts_per_cycle=2, start_date=today+7"** gives **243** slots
   to 19 Sep 2027, not the brief's "~244". The figure is arithmetic, not a
   target.
3. **`<HijriCountdown event="ramadan_1448_start">`** — run 1 shipped bare keys
   (`ramadan`). **Decision: accept both.** A bare key means the next occurrence;
   a dated key pins the Hijri year so a post written for 1448 keeps saying 1448
   after it has passed.
4. **"Body = markdown + tags like `{{live:departures filter=ramadan}}`"** — run 1
   shipped `<Tag />`. **Decision: accept both spellings**, one registry, one
   renderer.
5. **The AUTHOR RECORD block was not supplied.** The brief's header reads
   `[AUTHOR RECORD — paste the block from above]` with nothing above it.
   **Decision: invent nothing** (hard constraint 9). The row is untouched, the
   columns the block would fill are added by migration 026, and the byline,
   `/equipe` card and `Person` node light up the moment the owner fills a bio in
   fr and ar.
6. **"Similarity: Supabase gte-small if available, else transformers.js, else
   n-gram Jaccard."** Neither embedding path exists here and adding
   transformers.js would be a ~90 MB dependency for one check.
   **Decision: 3-gram word Jaccard**, and the gate says so in its report
   (`method` field) rather than implying an embedding ran.
7. **"web-search the official Moroccan Hajj timeline"** — done, but
   `habous.gov.ma` cannot be fetched from this machine: its certificate chain
   does not verify here. **Decision: the facts are recorded with
   `verification: "search-summary"` and are usable as STRUCTURE only** — who
   organises, the two channels, the levels of the draw, the waiting list, the
   age and the ten-year rule. No date, quota or amount from them may enter
   prose, and the gate refuses those anyway. The owner promotes a fact to
   `fetched` after checking it in a browser.
8. **Migrations cannot be applied from here.** PostgREST exposes no DDL and the
   service key cannot run SQL. **Decision: 026 is written, committed and
   documented; applying it is the owner's step.** Everything works without it —
   the components fall back to dictionary copy and the repo's JSON files are the
   record.
9. **"enabled=false … then set enabled=true"** — the brief asks for both.
   **Decision: `enabled: true`** in `data/content-calendar-spec.json`, since
   stage E is explicitly "go live". It reaches `content_ops_settings` on the
   first `--seed` after 026 is applied.
10. **Ten `article_plan` rows target a month lander's own query**
    (`omra janvier` … `omra decembre`). The gate refuses them mechanically. The
    month series in the calendar now covers those months with long-tail angles,
    so the ten rows are redundant; deactivating them is an owner action.

---

## The honest number of slots

The calendar has **243** slots. The gap analysis (`02-gaps.md`) counts the
distinct angles the map supports without duplicating an existing URL and lands
on **109** — 45 % of the year. Counting the 28 floor rows that a thin existing
post already occupies and that therefore deserve a rewrite in place rather than
a second URL, the usable total is **137**, still a 44 % shortfall.

The topic pool written in this run holds more entries than 109 because it
contains series parts that split one subject across several pages on purpose;
the calendar builder rejects any topic whose angle is within 0.6 similarity of
an existing post or of another topic in the same cluster, and every slot it
cannot fill is recorded `unfillable` with its reason in
`docs/content-system/calendar-report.md`.

### The phase weights are not met, and forcing them would be wrong

The brief sets a Ramadan / Omra-core / Hajj split per phase. The calendar does
not hit it, and the miss is not random:

| Phase | Target R/O/H | Actual R/O/H |
|---|---|---|
| P1 13 Sep – 31 Oct 2026 | 35 / 50 / 15 | 21 / 64 / 14 |
| P2 1 Nov – 31 Dec 2026 | 50 / 35 / 15 | 25 / 72 / 2 |
| P3 1 Jan – 7 Feb 2027 | 60 / 25 / 15 | 23 / 69 / 8 |
| P4 8 Feb – 9 Mar 2027 | 60 / 20 / 20 | **0** / 90 / 10 |
| P5 10 Mar – 30 Apr 2027 | 25 / 35 / 40 | 0 / 65 / 35 |

Two separate causes, and only one of them is a shortage.

**The Ramadan track runs out of distinct angles before the year does.** Twenty-
two Ramadan topics exist against a target that would need roughly sixty. The
gap analysis independently reached the same place: the Ramadan block holds 31
floor rows, of which 19 are already occupied by a thin existing post that
should be rewritten rather than duplicated. Filling the target would mean
writing the second post on a question the site already answers — which G8 and
G15 refuse, and which is the cannibalisation this whole system exists to stop.

**P4 is zero for a structural reason, not a shortage.** The brief also says the
twelve-part series must be published *before Ramadan starts*, and the standalone
Ramadan topics are decision-and-preparation pieces whose usefulness expires when
the month begins. Both instructions are followed; the consequence is that by
8 February the Ramadan track has said what it has to say. A reader inside
Ramadan is either already there or has missed it, and the commercial intent has
moved to Chawal and to the 1449 cycle — which the seasonal pool covers, and
which is why P4 fills with Omra-core.

**What would actually close it**, in order: authored `month_pages` blocks, which
turn every month into a source rather than a guess; a Search Console export in
`data/gsc/`, which would show which Ramadan queries the site already ranks 5–15
for and deserve a dedicated page; and the rewrite of the 19 thin Ramadan-adjacent
posts, which is editorial work on existing URLs, not new slots. Adding Ramadan
topics to hit the number, without any of those, would mean inventing angles —
the one thing the brief forbids.

**Where the gap falls matters more than its size.** Every unfilled slot is in
the last three phases — May to September 2027. The calendar is **fully covered
from 21 September 2026 through the end of April 2027**, which spans the entire
Ramadan 1448 decision window, Ramadan itself, and the Hajj lottery-to-Omra
bridge — the three moments the dominance plan is built around. Nothing needed
in the next seven months is missing; what thins out is the far end of the year,
which is exactly the part a plan should expect to rewrite once real data
arrives. That is the right shape for a calendar, not a defect in it.

**The gap does not close by inventing angles.** It closes three ways, in this
order: rewriting the 25 thin posts in place (no new URL, no cannibalisation);
letting the live data grow, since a month with real departures supports a
support post that an empty month does not; and a Search Console export in
`data/gsc/`, which turns "what could we write" into "what are we already
ranking 5–15 for". Until then, cadence is a ceiling and the calendar will show
unfilled slots — which is the correct behaviour, not a failure.

---

## Open questions for the owner

1. **The AUTHOR RECORD.** It was not in the brief. Without it nothing about
   Yahya Houssini can be written (hard constraint 9). Fill Admin → Équipe:
   role, bio fr + ar, languages, `sameas_url`, and the new `knows_about` /
   `affiliation`.
2. **Is Wiki Tours International among the agencies selected by the Ministry of
   Tourism for the Hajj agency channel?** The Hajj post deliberately does not
   say so and presents `/hajj` as an interest page. If the answer is yes, that
   changes the article and the page.
3. **The official facts.** Confirm each entry of `data/official-facts.json` in a
   browser and flip `verification` to `fetched`; only then may a figure from it
   be quoted.
4. **May a relative in Morocco sign the contract and pay the deposit on a
   pilgrim's behalf?** Flagged `[À VÉRIFIER]` in the diaspora post, which says
   the agency settles it case by case.
5. **Umrah visa conditions for a non-Moroccan passport** — same, flagged, not
   asserted.
6. **Deposit, cancellation and waiting-list terms in Ramadan specifically.** The
   `policies` table holds the general rule; the Ramadan series will need the
   Ramadan variant if one exists.
7. **The two Madinah hotels' city** — a one-field edit that unblocks
   `<HotelList city="madinah" />` and their schema locality.
