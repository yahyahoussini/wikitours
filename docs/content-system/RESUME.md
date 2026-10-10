# RESUME — read this first

The entry point for every session that touches the content system. It says
where the system stands, the exact procedure for a generating run, and what must
not be touched. Operations (pause, unschedule, cadence, gate reports, a lander
disappearing) are in `RUNBOOK.md`.

---

## The one-paragraph model

Prose is written **ahead of time** by a Claude Code session, following
`content/ARTICLE-BRIEF.md`, into `content/articles/*.json`. Volatile facts are
never in that prose: the body carries **tags** that render as server components
reading Supabase **at request time**. A post declares a commercial **intent**,
never a URL; the resolver picks the best indexable lander when the page is
served. Publishing is not an action — a post is public the moment its
`published_at` has passed, because that is the anon RLS policy, and hourly ISR
makes it visible within the hour. Two gates enforce the bar; a post that fails is
skipped and logged, never softened. No runtime model call exists anywhere, and
nothing costs money.

---

## State

| | |
|---|---|
| Calendar | **253 slots**: 243 cadence slots, 21 Sep 2026 → 19 Sep 2027, 2 posts every 3 days at 08:30 and 18:00 Africa/Casablanca, plus **10 owner-requested extra slots** (#1001–#1010, 2–23 Oct 2026, 08:00, Ramadan) from `spec.extra_slots`. The extra slots are `unfillable` until a topic is named for each — see RUNBOOK § Owner-requested extra slots |
| Slots filled | **169 of 243**. Phases P1–P5 are 100 % filled (21 Sep 2026 → 30 Apr 2027, the whole Ramadan decision window, Ramadan itself and the Hajj lottery bridge); all 74 unfilled slots are May–Sep 2027. Re-read the head of `calendar-report.md` after every `npm run content:calendar` |
| Topic pool | **172 topics** in `data/content-topics/*.json` — one file per batch. Add a batch file to extend it; the builder rejects a topic whose query is a lander's or whose angle is within 0.6 of an existing post |
| Series | `ramadan-1448` 12 (AR co-master) · `hajj-1448` 8 (AR co-master) · `premiere-omra` 8 · `mois-par-mois` 12 · `villes` 7 — each placed exactly once |
| Phase weights | **Not met, deliberately.** See `04-setup-report.md` § "The phase weights are not met, and forcing them would be wrong" — the Ramadan track has 22 distinct angles against a target needing ~60, because 19 of its floor rows are already held by a thin existing post that deserves a rewrite, not a duplicate |
| Posts written and gated | 10 contract-era drafts in `content/articles/` (9 from September, 1 from 2026-10-09), one gate report each in `gate-reports/`. **Slot #10 scheduled for 2026-10-10 17:00 UTC** — the first post of the weekly line (FR 7.2 → 8.2, AR 7.6 → 8.2 after the one rewrite). **2 scheduled** (slots 2 and 4 — Hajj registration, 22 Sep; booking from Europe, 25 Sep), **2 published by owner override** (slots 16 and 22, 2026-09-28 — see below) and **5 skipped** (slots 1, 3, 5, 6, 8). **Owner override, 2026-09-28:** slots #16 and #22 were skipped under the one-rewrite rule (FR 7.6 and 7.8, AR 8.1 and 8.4) and the owner decided to publish both immediately. Recorded as `status: "owner_override"` + `owner_override` on the files and the slots, with the reviewers' notes kept as `review_history`. **The rule itself is unchanged** — this is a decision on two named posts, not a lower bar; a generating run still skips anything under 8 after one rewrite. Every skipped draft carries `status: "skipped"` and a `skip_reason` on the file and the calendar slot, and the ingest refuses it. That guard covers FILES only: a skipped post that is already a row stays whatever the row says — two are published rows today (owner item 00) |
| Why both were skipped — read this before writing another | They promise **experience** ("comment se passe vraiment le mois", "météo, affluence"); the two that passed describe a **procedure**. `data/allowed-facts.json` holds business data only, and `month_pages` is empty, so there is no source for the experiential layer. Both reviewers rejected every way of faking it. **Roughly half the calendar — the month series, most of the Ramadan series, the seasonal block — is blocked the same way.** See `04-setup-report.md` § "The single most useful thing this run found" |
| Existing posts | 40 rows (2026-09-17): 29 live, 2 scheduled (the two contract posts that passed both reviewers, 22 and 25 Sep), **9 held** (`is_published = false`): the 2 posts the reviewers skipped (21 and 24 Sep) and the 7 pre-contract posts still queued (20 Sep → 22 Oct, 330–400 words, no FAQ, below the current bar). The 8th pre-contract post, `telephone-internet-arabie-saoudite`, went live on 16 Sep and stays live (pulling a live URL would 404 it). Held rows keep their slug and slot; a held pre-contract post is released again only after a rewrite that passes both gates and both reviewers (owner decision, 2026-09-17) |
| Landers | 58, of which 44 indexable (`data/lander-registry.json`) |
| Honest ceiling | `02-gaps.md` gives the number of distinct angles the map supports without duplicating an existing URL. It is **lower than the 243 cadence slots**. Cadence is a ceiling, not a target |
| Database | migrations 025 + 026 are written and committed; **applying them is the owner's step** (`RUNBOOK.md` § Apply the database side). Everything works without them: the components fall back to dictionary copy and the repo's JSON files are the record |
| `enabled` | `true` in `data/content-calendar-spec.json`; it reaches `content_ops_settings` on the first `npm run content:calendar -- --seed` after migration 026 |
| Last audit | **2026-09-15** — `audit-2026-09.md`. Three system fixes: the drift re-gate (`content:gate -- --existing`), Hijri anchors as a real placement constraint, sitemap `lastmod` no longer predating publication. 28 published + 8 scheduled rows are below the current bar (all pre-contract); 0 link rot; **no Search Console export exists** |
| Last generator run | **2026-10-09** — slot **#10** (`rajab-ou-chaabane-plutot-que-ramadan`, Rajab or Chaâbane instead of Ramadan), the first post of the weekly line, written AR-first in a local session at the owner's request. Round 1 FR 7.2 / AR 7.6 (unattributed experience — « le calme de la fin de Chaâbane » —, a catalogue range of durations in the key facts, meta sentences, calques); one rewrite; round 2 **FR 8.2 / AR 8.2 → scheduled 2026-10-10 17:00 UTC**. The reviewers' should_fix were applied before the slot and confirmed by both. What they caught is now « Lessons » in § The weekly line. Previous run: **2026-09-28** — slots **#16** (the Ramadan Q&A mega post) and **#22** (arriving before the first night) written AR-first, gated, reviewed, rewritten once, re-reviewed: **AR passed both (8.1 and 8.4), FR failed both (7.6 and 7.8) → skipped**, reasons on the files and the slots. Unlike the earlier skips, neither failed for lack of experiential facts: every factual blocker was cleared by the rewrite. #16 failed on overlap with the `/omra-ramadan` hub FAQ and a FAQ that repeated its own body — retake it as a shorter index page. **#22 exposed a product gap, not a writing one**: its method compares the day of ARRIVAL IN MAKKAH with the earliest possible first night, but `<LiveDepartures>` cards show only the Casablanca departure and return dates, so a reader cannot apply it. Retake #22 after the offer card shows the arrival day in Makkah or the order of the cities. Also found on the way: several official facts carry a `note` that restricts their use (the passport rule is the tourist eVisa, not written for Moroccans; the ACYW delays must not be published without the version date; the ODV list carries no licence number) — **read the notes, not only the values**. Previous run: **2026-09-15** — `batch-2026-09-15.md`. Slots #5, #6, #8 written, reviewed and skipped (no draft cleared both reviewers); #7, #9, #10, #11 blocked by facts missing from `allowed-facts` (listed per slot, with what unblocks each); #12 and #13 writable next. Five gate/ingest defects fixed on the way |

---

## The weekly line (owner decision, 2026-10-09)

**One high-quality article per week, written ahead by the weekly routine, in
the order of `data/content-weekly-line.json`** — not the calendar's two posts
every three days. The line serves the departures on sale (`serve`: the
Chaâbane-Ramadan programmes first, the 25 November departure until mid-November,
the December departures that fall in Rajab), then the Ramadan season. Each post
is scheduled for the next Tuesday 07:30 UTC at least `min_lead_hours` (30 h)
after it is written — the Sunday 21:00 UTC run lands on the Tuesday right after
it — which leaves the owner about a day and a half to read it in Admin → Blog. The
bar does not move: both reviewers ≥ 8 after at most one rewrite, the gate
passing, or the slot is skipped with the reasons.

The routine (`trig_016HWofWPk7TRUsc11dLRNm4`, Sundays 21:00 UTC, Opus 5.5)
works from the repository only: the cloud environment cannot reach wikitours.ma
or Supabase, which is why the old prompt (`/api/content/facts`) never produced a
post after 13 Sep. It runs the gate with `--offline` (database checks skip; the
build's ingest re-gates before anything is published) and the two reviewers as
sub-agents, then pushes. **It also needs the owner to re-enable Claude Code for
the organisation**: the 4 Oct run was refused with « Your organization has
disabled Claude subscription access for Claude Code ».

**First post: slot #10, `rajab-ou-chaabane-plutot-que-ramadan`**, written in a
local session on 2026-10-09 and scheduled for Saturday 10 October, 18:00
Casablanca — the owner asked for a post that week. The routine takes over on
Sunday 11 October; its first post publishes on Tuesday 13 October.

### Lessons from the posts so far — apply every one

1. **A tag shows what its component renders, nothing more.** A `<LiveDepartures>`
   card shows the dates, the total days and nights and the price. The split of
   nights between Makkah and Madinah, the hotels and the breakfast flag are on
   the departure PAGE, and only when the programme gives them. Both reviewers
   caught « its card shows its nights in Makkah and Madinah ».
2. **Read a legal fact for what it says.** Law 11.16 art. 18 puts cancellation,
   the calendar and price revision in the contract — not a change of date. Write
   « ask before signing whether the date can change; read the cancellation terms
   in the contract ».
3. **A FAQ answer starts with the answer and stands alone** — it is extracted
   into FAQPage: no « cette comparaison », no « le tableau plus haut », no
   superlative (« le texte le plus connu »), no sentence copied from the body.
4. **One occurrence per block.** A sourced phrase (« avant l'affluence des dix
   dernières nuits ») or a definition (what a Chaâbane-Ramadan programme is)
   appears once in the body and once in the FAQ, not in every section. Medical
   advice once.
5. **Children before puberty do not have to fast**, even in Ramadan: « without
   obligatory fasting » makes a family's trip easier; it is not « important with
   children ».
6. **The gate counts a hyphenated word as two** (`Chaâbane-Ramadan`,
   `al-Bukhari`): aim for ~50 words in an excerpt by a plain count.
7. **Darija headings agree in the plural** (« علاش كيفكرو عائلات… »), never MSA
   agreement inside a Darija sentence.
8. **Each `<LiveDepartures>` prints its own H2** « Départs ouverts »: three in a
   row give three identical H2s (component fix waiting for a working deploy).
   One block per period, each announced by its own sentence, three at most.
9. **A generalisation must not contradict another section.** « The choice of
   month is organisational » contradicted « Ramadan keeps what no other month
   offers »: scope it (« between Rajab and Chaâbane »).
10. **You cannot see the programmes, so never tie a generic fact to them.** The
    glossary says a Chaâbane-Ramadan trip lets you live the passage into Ramadan
    « à La Mecque »; both programmes on sale (2026-10-09) actually run Makkah →
    Madinah → Makkah, with Madinah around the computed start of Ramadan 1448.
    Write « aux Lieux saints » and send the reader to the departure page for the
    city order. Never say in which city a programme's first nights, first
    fasting days or tarawih fall.

---

## The procedure for a generating run (Prompt 2)

Run this, exactly, and stop cleanly.

1. **Read** this file, `03-dominance-plan.md`, `04-setup-report.md`, then
   `content/ARTICLE-BRIEF.md` (the contract), `data/allowed-facts.json`,
   `data/content-formats.json`, `data/banned-phrases.json`.
2. **Load the settings and the calendar.** `data/content-calendar-spec.json` →
   `settings` (or `content_ops_settings` when 026 is applied). If `enabled` is
   false, stop and say so. Take the slots with `status: "planned"` whose
   `publish_at` falls inside `buffer_days`, ordered by `publish_at` ascending.
   **Never touch a slot whose status is `scheduled`, `published` or `skipped`.**
3. **Take the next 8 slots** — fewer if context is tight. Never start a slot you
   cannot finish. One subagent per slot if the repo supports them; review
   serially.
   **3 bis. Check the facts before drafting a word.** For each slot, list every
   claim its angle, outline and FAQ seeds need, and find the key for each in
   `data/allowed-facts.json`. If a claim the angle depends on has no key, do not
   draft: leave the slot `planned`, and record it as blocked with the missing
   keys in the batch report. On 2026-09-15 this would have caught five of nine
   slots before any writing (`batch-2026-09-15.md`); the reviewers fail exactly
   those posts, and a rewrite cannot add a fact.
4. **Per slot**, assemble the stable facts the slot names from
   `data/allowed-facts.json`, then write the master locale first — FR, or **AR
   for a slot whose `master_locale` is `ar_co_master`** (every Ramadan and Hajj
   slot), in which case the French is adapted from the Arabic afterwards and the
   English is lean. The quality spec is in the brief: answer-first 40–55 words ·
   a key-facts box using live components for anything volatile · ≥ 4
   question-form H2s · a table where data compares · 5–6 FAQ items of 30–75
   words · sources · "Wiki Tours International (Bab Makka)" on first mention ·
   tags for departures, prices, CTA, countdown, policy and quotes · ≥ 4 internal
   links including the pillar and ≥ 2 siblings · `<CommercialCTA intent=…>` ·
   `<HajjBridgeCTA/>` on every Hajj slot · a Hijri component and the
   moon-sighting caveat on every Ramadan and Hajj slot.
5. **Review, then gate.** The FR reviewer (`reviewers/fr-reviewer.md`) and the AR
   reviewer (`reviewers/ar-reviewer.md`) each score out of 10; the threshold is
   **8**. Then `npm run content:gate -- <file> --offline`. One rewrite on
   failure. Still failing → the slot becomes `skipped` with the gate report as
   the reason.
6. **Passing** → set the slot to `scheduled` with its `slug`, commit the article
   file, push. The build's `prebuild` ingest inserts the row at the slot's
   `publish_at` (never earlier than now + 24 h) and marks the calendar row.
7. **Stop** when 8 slots are processed, or context reaches ~70 %, or the buffer
   covers `buffer_days + 30`. End with ONE line:
   `Scheduled X | Skipped Y | Total N/253 | Buffer until DATE | Ramadan series K/12 done | Hajj series K/8 done | Next run resumes at slot #Z`

---

## Rules that do not bend

- **Never regenerate a scheduled post.** Its URL may already be indexed.
- **Never a price, a year, a departure date, a seat count or a hotel distance in
  prose.** The tags carry them. « depuis 2016 » is the single exception.
- **Never a hard-coded lander URL where `<CommercialCTA intent=…>` belongs.** The
  resolver exists so a post survives a lander going noindex.
- **Never a fact outside `data/allowed-facts.json`.** A missing figure means the
  sentence is written without it and a `[À VÉRIFIER]` line goes into
  `needs_review`. Official facts marked `verification: "search-summary"` are
  usable as structure only, never as a figure, until the owner marks them
  `fetched`.
- **Never publish directly.** Scheduling is the only mechanism.
- **A skipped draft stays in the repo, marked.** Set `status: "skipped"` and a
  `skip_reason` on the file and the calendar slot. The ingest refuses such a
  file (it did not before 2026-09-15, which is how skipped posts became rows).
- **A wrong gate is fixed at the gate, not in the post — and reported.** If a
  rule is a false positive, change `scripts/content-gate.mjs`, say so in the
  commit, and re-run every post to see what the change now lets through.
- **A rule only counts for what it reaches.** After any change to a rule, run
  `npm run content:gate -- --existing` as well as the drafts: rows already in the
  table are otherwise never re-read. A failing *scheduled* row exits 1; a failing
  *published* row is backlog and exits 0 — never make that one blocking, it is
  how gates get loosened (`audit-2026-09.md` § Fixes).
- **A Hijri anchor is a deadline, not a label.** An anchored topic is placed at
  least `lead_days + tolerance_days` before its event by
  `build-content-calendar.mjs`; an explicit `earliest` after the anchor is the
  only way to place one after it, and should mean the topic is about what follows.
  The deadline binds series parts too, capped back to front so a part pulled
  before its deadline keeps the series spacing, and an owner extra slot refuses a
  topic whose window or deadline its date misses.
- **"No two posts of one cluster in a row" looks both ways.** A weighted slot
  avoids the cluster of the slot before AND of an already-placed slot after (a
  series part, a pinned or frozen slot); the builder notes every slot where no
  other topic fits.
- **An owner extra slot takes only the topic the spec names**, never a series part
  or a pinned topic. Append new requests to `spec.extra_slots`; never reorder it
  (the list order is the slot numbering).

## Do not touch

| | Why |
|---|---|
| The 36 existing article rows and their slugs | live URLs; the rulebook forbids deletions and renames without a 301 |
| `is_published` / `published_at` as column names | they ARE the publish-by-time model; renaming touches RLS, the admin, the ingest, the queue and the sitemap for no behaviour change |
| The canonical, hreflang and `/{locale}/{slug}` architecture | standing hard constraints 1–5 |
| `aggregateRating` on any node | standing hard constraint 6 |
| Customer review text | standing hard constraint 7 — mixed FR/AR/Darija by design |
| Moroccan Arabic month names | standing hard constraint 8 |
| Yahya Houssini's bio, years, credentials | standing hard constraint 9. The row is `team_members.yahya-houssini`; only the owner fills it |
| `ANTHROPIC_API_KEY` on Vercel, or any paid service | owner cost rule: $0 |
| `CONTENT_PREVIEW_SCHEDULED` on Vercel | local proof builds only — on production it would publish scheduled posts early |
| A slot already `scheduled` / `published` / `skipped` | the calendar rebuild deliberately leaves them alone |

---

## What is waiting on the owner

00. ~~Two posts the reviewers skipped were set to go public~~ — **done 2026-09-17**: `guide-omra-ramadan-1-vivre-le-mois` and `omra-en-novembre-meteo-affluence-conseils` are held again (`is_published = false`). They had been switched back to published on 2026-09-15 at 11:38 UTC by something outside the build (the ingest now skips `status: skipped` files and never refreshes a held row). If they come back a second time, look at who used Admin → Blog at that moment. The 7 pre-contract posts still queued are held too, by owner decision: each is rewritten to the contract and re-released only if it passes — see the Existing posts row.

01. **Chaâbane-Ramadan 2027 is in the database, hidden (added 2026-09-16 from the two owner flyers).** Category `chaabane-ramadan` (`/omra-chaabane-ramadan`), hotel `abeer-al-fadila`, and two programmes with three tiers each: `omra-chaabane-ramadan-2027-15-jours` (1 → 15 Feb 2027, from 16 900 DH) and `omra-chaabane-ramadan-2027-25-jours` (22 Jan → 15 Feb 2027, from 16 500 DH). To put them live: (1) add the images; (2) ~~set the city of Makarem Madinah and Jayden Medina Hotel to `madinah`~~ (done 2026-09-17); (3) publish, in this order, the hotel, then the category, then the two programmes, in one sitting — a published programme must never point at a hidden category. Two things to confirm on the way: the flyers ask for a passport valid **8 months**, while the site-wide policy says 6 months after return (`policies.passport_validity`); and « بالإفطار » was entered as breakfast (`breakfast_included`), not iftar.

**Added by the 2026-09-15 audit — read `audit-2026-09.md` § What remains for the owner.** Top of it: export Search Console into `data/gsc/` (none exists, so no ranking claim can be made); apply migrations 025 + 026; decide the 8 pre-contract queued posts.

0. **Unblock the experiential content — this is what skipped two of the first
   four posts, and it blocks about half the calendar.** Two steps, either of
   which helps, both of which together close it:
   - **Write the `month_pages` blocks** (Admin → Pages mois): "Météo et
     affluence" and "À qui convient ce mois", in French **and** Arabic, for each
     month you sell. The month landers also index only when those blocks exist
     (`monthLanderIndexable()`), so this pays twice. **Février and mars done
     2026-09-17** (all four blocks, fr/ar/en, toggle on). Every statement is
     sourced in `month-pages-sources.md`, and two independent reviews
     (facts, language) checked them. The other ten months are still empty.
     Follow the same method: WMO normals, official crowd sources, no agency
     observation, and the pre-Hajj closure caveat wherever it applies.
   - **Decide whether the agency's own observation is a citable source.** If it
     is, it belongs in `data/allowed-facts.json` as dated, owner-validated
     entries (what your groups actually see at the Haram in Ramadan, in a normal
     month, at the hotel), each with an `as_of`. Rule 1 bis already says how to
     write from such a source; today there is no source to write from.
1. **Apply migrations 025 and 026**, then run the four seeding commands
   (`RUNBOOK.md` § Apply the database side). Until then the calendar lives in
   `data/content-calendar.json` and the policies fall back to dictionary copy.
2. ~~Complete the author record~~ — **done 2026-09-17** (role + bio fr/ar/en from the owner's own words: full-stack developer, expert Omra and Hajj guide; profile published). Still open: the Arabic spelling of the name (`name_ar`), languages and a profile link (`sameas_url`) — never guessed. Original item: — the AUTHOR RECORD block was not supplied
   with the brief, so nothing about Yahya Houssini was invented. Fill
   `team_members.yahya-houssini` in Admin → Équipe (role, bio fr + ar, languages,
   `sameas_url`, and the new `knows_about` / `affiliation` from migration 026).
   The byline, the `/equipe` card and the `Person` node light up the moment a
   bio exists in fr **and** ar; until then articles are signed with the
   organisation, which is honest, not anonymous.
3. **Verify the official facts.** `data/official-facts.json` holds the ministry
   and Nusuk facts with `verification: "search-summary"` — habous.gov.ma could
   not be fetched from this machine (its certificate chain does not verify
   here). Open each source in a browser, confirm, and change the field to
   `fetched`; only then may a session quote a figure from it.
4. ~~Set the two Madinah hotels' city~~ — **done 2026-09-17** (both are `madinah`). Original item: to `madinah` (Admin → Hôtels): Jayden
   Medina Hotel and Makarem Madinah are still tagged `makkah`, so
   `<HotelList city="madinah" />` renders nothing and their schema locality is
   wrong.
5. ~~Re-angle the ten `omra {mois}` rows~~ — **done 2026-09-17**: the ten rows are deactivated (`is_active = false`). Original item: in Admin → Plan éditorial: their
   `query_family` is a month lander's own query, which the gate refuses by
   design. The month series in the calendar already covers those months with
   long-tail angles, so the simplest move is to deactivate those ten rows.
