# COVERAGE-MATRIX.md — Phase 5 full-taxonomy coverage

Trees audited: **Tree 1** = Phase 4 verification taxonomy (A1–A5, checks 1–26).
**Tree 2** = GEO 10-front framework (entity → measurement). Statuses assigned
against the repo as of 2026-07-18, one line of evidence per node. Rules
applied: a node is COVERED only with citable evidence; unsure ⇒ GAP.

Statuses: `COVERED-CODE` · `COVERED-PROCESS` · `PENDING-ADMIN` ·
`PENDING-EXTERNAL` · `GAP` · `N/A`.

## Tree 1 — A1 SEO deep pass

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| 1 | Duplicate titles/descriptions across pages | GAP | `scripts/seo-audit.js` checks per-page lengths only — no cross-page duplicate map. |
| 2 | Canonicals self-referencing + absolute | COVERED-CODE | `src/lib/seo.js` `hreflangAlternates()` emits absolute canonical on every public page; presence enforced `scripts/seo-audit.js:84`. |
| 3 | hreflang reciprocity + x-default + RTL | COVERED-CODE | Single generator emits fr/ar/en + x-default (`src/lib/seo.js:31`) ⇒ reciprocal by construction; `dir="rtl"` via layout `dirFor`. |
| 4 | Redirect-chain detection (no 301→301) | GAP | No chain detector; `/bab-makkah` legacy 301 (`middleware.js:56`) + bare-path locale redirect (`middleware.js:91`) is an unverified 2-hop risk. |
| 5 | Orphans / sitemap ⟷ crawl consistency | GAP | Sitemap excludes noindex by construction (`src/app/sitemap.js:44-68`) but no crawler cross-check exists. |
| 6 | Heading integrity (one H1, no skips, H1≠title) | GAP | One-H1 enforced (`scripts/seo-audit.js:83`); skipped-levels and H1/title duplication unchecked. |
| 7 | 404 page: real status, useful links, noindex | COVERED-CODE | `[...rest]` catch-all → `src/app/[locale]/not-found.js` (localized copy + home link, real 404 status). |
| 8 | Lighthouse on 5 templates | PENDING-EXTERNAL | Needs the running staging app; AVIF/WebP delivery already forced (`next.config.mjs:44`). Owner: run Lighthouse on staging. |
| 9 | Trailing-slash + casing + host canonical | COVERED-CODE | Next `trailingSlash:false` (308) + www→apex `middleware.js:19-23`. |

## Tree 1 — A2 Local SEO

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| 10 | LocalBusiness schema complete (hasMap, geo, priceRange, areaServed cities, hours) | GAP | `OrgJsonLd.jsx` has geo/phones/address/rating but **no hasMap, no priceRange, no city areaServed** (line 70: `areaServed:'MA'`); no `gbp_url` settings field. |
| 11 | NAP render sitewide + tel:/mailto + map | COVERED-CODE | `SiteFooter.jsx:114` tel: links from settings; map embed on /contact (CSP `next.config.mjs:7`). Values [ADMIN DATA]. |
| 12 | City pages: noindex default + admin toggle + unique slots + city FAQs | GAP | `/omra-depuis-{ville}` exist (`[flat]/page.js:52-54`) but are **indexable, templated, all in sitemap** (`sitemap.js:61`) — no toggle, no unique-content slots, no city FAQ block. Anti-doorway guard absent. |
| 13 | "Casablanca"/"Maroc" in home + /omra titles | COVERED-CODE | `fr.json:35` metaTitle "…Omra & Hajj depuis le Maroc"; Casablanca in description/badge (`fr.json:17,37`). |

## Tree 1 — A3 AEO

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| 14 | FAQ: schema only when DB has FAQs + 25–75-word answer detector | GAP | Conditional emission ✓ (`[flat]/page.js:208-215`), but no answer-length detector in the audit. |
| 15 | Direct-answer-first on all hubs | COVERED-CODE | `[flat]/page.js:232-235` (`data-answer` lede) + `SeasonalHub.jsx:91` (same, on /omra-pas-cher), speakable both. |
| 16 | Real HTML price `<table>` on /omra-pas-cher + ramadan | GAP | Only `hotels-omra` renders a table; SeasonalHub and occasion hubs have none. |
| 17 | Question-coverage / ownership map | GAP | No keyword→page ownership doc exists in the repo. |

## Tree 1 — A4 Local AEO

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| 18 | City-question FAQ slots per city page | GAP | Same as #12 — no city FAQ mechanism. |
| 19 | /contact answers "Où se trouve l'agence ?" as direct-answer block | GAP | No `data-answer` block in `src/app/[locale]/contact/page.js` (grep empty). |
| 20 | Arabic parity mechanism for AEO blocks | COVERED-CODE | Trilingual `faqs` table (`registry.js:111-127`, `textarea3`) + `pickLang`. AR content itself [ADMIN DATA]. |

## Tree 1 — A5 GEO

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| 21 | Live UA crawler probe (GPTBot…CCBot → 200) | PENDING-EXTERNAL | Requires the running staging host/WAF. Detector hook added in Stage C (`UA_PROBE=1`). |
| 22 | robots.txt explicit AI allows + llms.txt with NAP/licence/URLs/updated date | GAP | robots ✓ (`robots.js:10`), llms.txt ✓ DB-driven — but **no updated-date line**, and Bingbot/CCBot not explicit. |
| 23 | ONE canonical description across schema/og/llms//a-propos | GAP | Single source in `OrgJsonLd.jsx:37` + `llms.txt:35` only — og:description & /a-propos not verified to render the same string. |
| 24 | sameAs incl. GBP + press link + Person (Soumaya Guerssel) | GAP | Socials ✓ (`OrgJsonLd.jsx:69`); no GBP URL field, no Person schema anywhere (grep: only review/article authors). |
| 25 | Freshness: schema dateModified + visible "Mis à jour" on hubs + sitemap lastmod | GAP | Offers/blog schema ✓ (`omra/[slug]:267`, `blog/[slug]:65`); seasonal hub visible ✓ (`SeasonalHub.jsx:93-95`); sitemap lastmod ✓ (`sitemap.js:51-53`) — **month/occasion hubs show nothing**. |
| 26 | IndexNow key + ping on publish | COVERED-CODE | `src/lib/server/indexnow.js` wired in `src/lib/revalidate.js`; key is [ADMIN DATA] (`schemas.js:155`). |

## Tree 2 — GEO 10 fronts

| # | Node | Status (before) | Evidence |
|---|------|--------|----------|
| G1a | Entity status — schema side (@id, alternateName, knowsAbout) | COVERED-CODE | `OrgJsonLd.jsx:27-40`. |
| G1b | Knowledge Panel / Wikidata | PENDING-EXTERNAL | Owner task: claim GBP/KP, evaluate Wikidata notability. |
| G2 | Brand mentions across the web | PENDING-EXTERNAL | Outreach/press task. On-site mechanism (/presse + press_url) COVERED; more outlets [ADMIN DATA]. |
| G3 | Reddit / Quora / forums presence | PENDING-EXTERNAL | Community seeding is user-side; nothing for code to hold. |
| G4 | Comparison content (best/top/vs) | GAP | `hotels-omra` is the one comparison surface; no best/vs pages. Competitor claims need admin-supplied facts (LAW: never invent). |
| G5 | Extractable structure (answer-first, question headings, stats) | COVERED-CODE | `data-answer` ledes + speakable + FAQPage + DB-driven stats (see #15). |
| G6a | Fact consistency — on-site single description | GAP | Same as #23. |
| G6b | Fact consistency — GBP/LinkedIn/directories | PENDING-EXTERNAL | Owner: paste `t.brand.description` (fr.json:17) verbatim into every external profile. |
| G7a | Crawler access — robots + llms.txt | COVERED-CODE | `robots.js:10`, `src/app/llms.txt/route.js`. |
| G7b | Crawler access — live probe past WAF | PENDING-EXTERNAL | Same as #21. |
| G8 | Reviews as citation fuel | PENDING-ADMIN | `gbp_rating`/`gbp_review_count` render when set (`OrgJsonLd.jsx:71`); growing volume is external. |
| G9 | Freshness | GAP | Same as #25. |
| G10 | Measure (AI-referral tracking + monthly prompt log) | GAP | Analytics has no ai_source dimension (`lib/admin/analytics.js` groups by utm only); no citation log. Manual monthly prompt runs stay PENDING-EXTERNAL. |

## Counts (before builds)

| Status | Count |
|--------|-------|
| COVERED-CODE | 12 |
| COVERED-PROCESS | 0 |
| PENDING-ADMIN | 1 |
| PENDING-EXTERNAL | 7 |
| GAP | 19 |
| N/A | 0 |
| **Total nodes** | **39** |

**GAP list (Stage B/C input):** T1: 1, 4, 5, 6, 10, 12, 14, 16, 17, 18, 19,
22, 23, 24, 25 · T2: G4, G6a, G9, G10.

---

# AFTER Stage B/C builds (2026-07-18)

Every GAP above was closed except G4. Status changes, with evidence:

| # | After | Evidence |
|---|-------|----------|
| 1 | COVERED-PROCESS | Cross-page duplicate title/desc detector (`scripts/seo-audit.js`, per locale). Caught /fr↔/a-propos + /avis↔/blog live; fixed. |
| 2 | COVERED-CODE | Emission unchanged; audit now verifies the canonical is **self-referencing**, not just present. |
| 4 | COVERED-PROCESS | Manual-redirect crawler: FAIL on sitemap URLs that redirect and on >1-hop chains in sampled internal links. |
| 5 | COVERED-PROCESS | Orphan detector (sitemap URL not internally linked) + noindex-in-sitemap detector. |
| 6 | COVERED-PROCESS | Skipped-level detector; fixes: `PackagesSection`/`HotelsGrid` h3→h2, `lib/markdown.js` normalizes body headings so the smallest level renders as h2. |
| 10 | COVERED-CODE | `OrgJsonLd.jsx`: `hasMap` (settings.gbp_url, migration 009), `priceRange` computed from real offers, `areaServed` = Maroc + the 8 whitelisted cities. gbp_url value [ADMIN DATA]. |
| 12 | COVERED-CODE | `city_pages` table + admin entity `pages-villes` (toggle = index switch), unique intro/logistics slots, `cityPageIndexable()` guard in `[flat]` metadata, sitemap + footer gated, `data-guard="empty"` audit hook. |
| 14 | COVERED-PROCESS | 25–75-word answer detector live (caught 37; dictionary FAQs rewritten fr/ar/en). 4 Arabic **DB** answers on `/ar` remain [ADMIN DATA]. |
| 16 | COVERED-CODE | `OffersPriceTable.jsx` (real `<table>`, DB-driven) on SeasonalHub (/omra-pas-cher) + occasion hubs (ramadan). |
| 17 | COVERED-PROCESS | `docs/keyword-map.md` (owner per query family + AEO question ownership) + CLAUDE.md merge rule. |
| 18 | COVERED-CODE | City FAQ slots via `faqs` category `ville-{slug}` + FAQPage schema in `[flat]`; content [ADMIN DATA]. |
| 19 | COVERED-CODE | /contact "Où se trouve l'agence ?" direct-answer block from settings address, `data-answer` + speakable WebPage. |
| 21 | PENDING-EXTERNAL | `UA_PROBE=1 npm run seo:audit` now performs the live probe; run it against staging/prod (owner task). |
| 22 | COVERED-CODE | llms.txt: "Dernière mise à jour" line + guide/glossaire/baromètre links; robots.js adds explicit Bingbot + CCBot. |
| 23 | COVERED-CODE | Canonical string now renders in Organization schema, default/OG meta description (clamped ≤155), llms.txt and the /a-propos `data-answer` lede (verbatim). |
| 24 | COVERED-CODE | sameAs gains GBP URL; team `Person` schema on /a-propos with `sameas_url` slot (migration 009). Soumaya Guerssel row + profile URL = [ADMIN DATA]. |
| 25 | COVERED-CODE | `[flat]` hubs: visible "Mis à jour le" + WebPage `dateModified` from real offer changes. |
| G6a | COVERED-CODE | Same as #23. |
| G9 | COVERED-CODE | Same as #25. |
| G10 | COVERED-CODE | `ai_source` dimension (`lib/admin/analytics.js aiSourceOf`) + "Référents IA" & "Conversions par page" admin tables + bot logger (migration 009, middleware, weekly rollup, admin report) + existing `keyword_checks` log (/admin/seo). Monthly prompt runs stay [EXTERNAL]. |
| G4 | **GAP (deliberate)** | Honest competitor comparisons need admin-supplied competitor facts (LAW: never invent). `hotels-omra` + the price barometer are the original-data comparison surfaces for now; a "vs" page is a future phase once facts are provided. |

New Phase 5 builds beyond the trees: analytics events `tel_click` (auto),
`faq_expand` (auto), `devis_request` (LeadForm) + fixed the silent batch-drop
bug (`tier_select`/`room_select` were rejected by zod + DB check); guide
cluster `/guide-omra` + 6 chapters (Article + author Person schema, FAQ slots,
noindex-until-filled); `/glossaire-omra` (DefinedTermSet, ≥8 published terms
to index); `/barometre-prix-omra` (Dataset schema, ≥3 offers per period, never
extrapolated); HSTS header; VideoObject on /avis video testimonials.

## Counts (after)

| Status | Before | After |
|--------|--------|-------|
| COVERED-CODE | 12 | 24 |
| COVERED-PROCESS | 0 | 6 |
| PENDING-ADMIN | 1 | 1 |
| PENDING-EXTERNAL | 7 | 7 |
| GAP | 19 | 1 |
| **Total** | **39** | **39** |

## What remains

**[ADMIN DATA]** (fills in `/admin`, no code needed): gbp_url in Réglages ·
apply migration 009 · 5 Arabic home FAQ answers <25 words · doubled AR
`seo_title` on the two hotels · FAQs for offer `omra-juillet-2026-confort` ·
city-page intros/logistics + toggles · guide chapters + glossary terms ·
Soumaya Guerssel team row with profile URL · IndexNow key.

**[EXTERNAL]** (off-site owner tasks): Lighthouse + `UA_PROBE=1` run on
staging · GBP/Knowledge-Panel claim + Wikidata evaluation · press/mention
outreach · Reddit/Quora presence · paste the canonical description into every
external profile · grow Google reviews · monthly AI-engine prompt log
(mechanism: /admin/seo keyword_checks).

`npm run seo:audit` (this build): **78 URLs · 72 pass · 6 fail** — all 6 are
the [ADMIN DATA] items above; zero code failures.
