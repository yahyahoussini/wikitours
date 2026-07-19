# PERF-AUDIT.md — Phase 6 Stage A (read-only, measured on the prod build)

Measured 2026-07-19 on the local production build (`NEXT_DIST_DIR=.next-audit`,
`next start`, port 3107, live Supabase). Lab profile = Lighthouse mobile:
**Slow-4G (150 ms RTT, 1.6 Mbps down) + 4× CPU throttle**, 390×844 viewport,
Edge headless via CDP. Targets: LCP ≤ 2.0 s · INP ≤ 200 ms · CLS ≤ 0.05 ·
TTFB ≤ 500 ms dynamic / ≤ 150 ms cached.

**Measurement caveat (honest):** the host was simultaneously running the
turbopack dev server and a dozen zombie `next start` processes, and the 4×
CPU throttle multiplies any host contention. Numbers below are the best of
2–3 runs per template (least-contended) and are **directional upper bounds**;
one contended home-fr run read 19.7 s LCP vs 4.6 s clean. Field p75 (RUM,
§13) and staging Lighthouse (Stage C CI) are the truth sources once live.

## Measured numbers per template

| Template | TTFB cached (curl) | TTFB (lab) | FCP (lab) | LCP (lab, best) | CLS (lab) | HTML (uncompressed) |
|---|---|---|---|---|---|---|
| home `/fr` | 17 ms | 92 ms | 2 456 ms | **4 616 ms** | 0 | 172 kB |
| home `/ar` (RTL) | 16 ms | 67 ms | 1 868 ms | **6 128 ms** | 0 | 178 kB |
| offers hub `/fr/bab-makka` | 18 ms | 46 ms | 3 484 ms | **4 940 ms** | 0.005 | 124 kB |
| month hub `/fr/omra-juillet` | 13 ms | 41 ms | 3 816 ms | **8 668 ms** | 0 | 95 kB |
| offer `/fr/omra/…-confort` | 11 ms | 55 ms | 6 540 ms | **6 540 ms** | 0 | 160 kB |
| hotel `/fr/hotel/anjum` | 10 ms | 36 ms | 1 996 ms | **3 328 ms** | 0.005 | 59 kB |
| guide `/fr/guide-omra` | 12 ms | 32 ms | 2 236 ms | **3 312 ms** | 0.005 | 58 kB |

**Verdict vs targets:** TTFB **PASS** everywhere (9–31 ms cached; there are no
dynamic public templates to hit the 500 ms budget). CLS **PASS** everywhere
(0–0.005 vs ≤ 0.05 — blur placeholders + reserved aspect boxes work). LCP
**FAIL on every template** under Slow-4G (3.3–8.7 s vs ≤ 2.0 s) — this is the
whole Stage B story. INP: not lab-measurable without scripted interactions;
the RUM pipeline captures a field INP proxy (§13) but has no p75 view yet.

## Rendering & server

### 1. Route render map
Every public route is **● SSG + ISR** — none is per-request dynamic, and no
public page reads request data (cookies/headers). Settings/menus come from the
service/anon clients at build/revalidate time only.

| Route class | Mode | Revalidate |
|---|---|---|
| all `[locale]` pages, hubs, offer/hotel/blog/guide/glossaire/barometer/city | ● ISR | 60 s |
| `/[locale]/hajj` | ● ISR | 3600 s |
| `/llms.txt`, `/sitemap.xml` | ○ ISR | 3600 s |
| `/robots.txt` | ○ static | — |
| `/[locale]/[...rest]` (404), admin, api | ƒ dynamic | correct by design |
| **`/[locale]/lp/[slug]`** | **ƒ dynamic** | flagged ↓ |
| **`opengraph-image` routes (×3)** | **ƒ dynamic** | flagged ↓ |

Flags: **(a)** `lp/[slug]` has `revalidate = 60` but no `generateStaticParams`,
so every hit server-renders with DB reads — the only conversion surface paying
per-request latency. **(b)** the Satori `opengraph-image` routes re-render on
every scrape (~100–300 ms + a Supabase render-endpoint fetch); harmless for
users, wasteful for bots. Stage B P1: `generateStaticParams` for published LPs;
give OG images ISR caching.

### 2. Revalidation coverage (`revalidateForTable`)
Gaps — all currently masked by the 60 s ISR window (severity: correctness, not
speed): missing tables entirely: **`city_pages`, `guide_pages`,
`glossary_terms`** (admin edits wait for the ISR window; llms.txt waits 1 h).
Incomplete path lists: `faqs` → only `/` + `/agrement`, but FAQs also render on
offer pages, `[flat]` hubs, `/bab-makka`, city pages, guide pages; `offers` →
misses the 12 `/omra-{month}` hubs, occasion hubs, `/omra-pas-cher`,
`/barometre-prix-omra`; `hotels` → misses `/hotels-omra` and offer pages (tier
hotel cards); `testimonials` → misses `/omra/{slug}` (reviews block);
`occasions` → misses the occasion hubs. Stage B P1 fixes the map.

### 3. DB efficiency per route
- **No N+1 anywhere**: tiers fetched with one `.in('offer_id', ids)`
  (`content.js:126`), covers batched (`getCovers`, `content.js:265`), hotels
  embedded via PostgREST joins.
- **Parallelized**: every page `Promise.all`s its reads (15 call sites,
  e.g. `omra/[slug]/page.js:149`, `page.js:70`). `getSettings` is
  request-`cache()`d so layout + page share one fetch.
- **Indexes**: already comprehensive — offers `date_end`/`is_featured`/
  `occasion_id`/`is_published` (schema.sql:214-217), `offer_tiers(offer_id)`
  (:242), `faqs(category, sort_order)` (:310), `galleries(entity)` (:117),
  `menus(location)` (:428), articles, events, bot_hits. Slugs are UNIQUE
  constraints. **No new index migration is warranted** — the mission's assumed
  gap does not exist in the schema; adding speculative indexes would just slow
  writes.

### 4. TTFB per template
Table above. `next start` serves gzip (verified: `Content-Encoding: gzip`,
`Cache-Control: s-maxage=60, stale-while-revalidate`); brotli comes from the
CDN/edge in production — verify on staging (Stage C). HTML 58–178 kB raw
compresses to ~20–30 kB.

## Assets

### 5. Images
- `next/image` everywhere on the public site **except two raw `<img>`**: the
  partner-logo chip (`PackagesSection.jsx:168`) and team-face avatars
  (`omra/[slug]/page.js:756`) — both tiny, below-fold; low priority.
- LCP element per template: home = HeroSlideshow slide 0 (`priority` ✓,
  `sizes="100vw"` ✓); offer = SmartGallery slide 0 (`priority` +
  `placeholder="blur"` ✓); hotel/blog cards `sizes` ✓; **month/occasion hubs
  have no hero image — their LCP is the text block**, so their 8.7 s LCP is
  font/CSS/contention, not images.
- Blur placeholders: `lib/blur.js` used across 7 site components ✓.
- AVIF: `formats: ['image/avif','image/webp']` (next.config.mjs) + Supabase
  remotePattern; **end-to-end AVIF content-type verify belongs on staging**
  ([EXTERNAL] — local `_next/image` verified config-side only).
- Rendered-vs-intrinsic oversizing: not measurable reliably under contention —
  fold into the Stage C Lighthouse CI (image-weight budget per template).

### 6. Fonts
- `next/font/google`, self-hosted at build ✓. **Four families**: Montserrat
  (variable), Inter (variable), Playfair Display (italic only), Tajawal
  400/500/700 (arabic subset). Tajawal's class — hence its download — is
  applied **only on `ar`** (`layout.js:92`) ✓.
- `display: 'swap'` + next/font's automatic `size-adjust` fallback metrics →
  corroborated by measured CLS ≈ 0 on fr AND ar (zero-swap-CLS **PASS**).
- Payload: ~122 kB woff2 preloaded on fr/en (3 latin subsets), ~150 kB extra
  across Tajawal weights on ar. Stage B P3 candidates: drop Playfair (one
  decorative italic style) or subset it to the glyphs actually used; trim
  Tajawal to 2 weights; audit that `ar` doesn't preload latin-ext it never
  paints.

### 7. JS
- Shared baseline **115 kB**; per-route first-load **143–152 kB** (max:
  offer + `/bab-makka` at 152 kB). No chart lib, no date lib, no UI kit in
  dependencies — the barometer is server-rendered (route JS 0 B ✓), so the
  mission's "chart lib must be dynamic-imported" is already satisfied by
  *not having one*.
- Analytics is already the ideal shape: 1.9 kB `wt.js`, `defer`, `keepalive`
  fetch/sendBeacon ✓; `wt-motion.js` defer ✓; pixels consent-gated, injected
  async by an inline loader (`TrackingScripts.jsx`) ✓.
- 17 site client components. Justified: LeadForm, SelectorBar,
  TierAndRoomSelector/RoomSelector/ChooseGammeButton, HeaderClient, BlogGrid
  (search), ConsentBanner, HeroSlideshow. **P4 candidates** (interactivity is
  CSS-achievable): ScreenshotWall, ReelsRow, Carousel (scroll-snap),
  HotelsGrid/PackagesSection "load more" (could be `<details>`-based). Expected
  win is modest (~5–10 kB/route) — the 115 kB shared React/Next floor
  dominates.

### 8. CSS
Single Tailwind v4 stylesheet: **8.8 kB raw / 1.6 kB gzipped** — negligible,
no unused-CSS problem, render-blocking cost is one tiny fetch. PASS, nothing
to do.

## Perceived

### 9. loading.js / Suspense
- `loading.js` at `[locale]` (generic card-grid skeleton; header/footer
  persist), `omra/[slug]` (offer-shaped), and admin. Child segments inherit
  the `[locale]` fallback → every public navigation gets an instant skeleton ✓.
- Skeletons are **plausible but not pixel-identical** per template (hub pages
  get the card-grid even when the destination is a text page). Lab CLS ≈ 0 on
  hard loads; soft-nav settle shift not measured. P5: per-segment skeletons
  for hubs + guide.
- `<Suspense>` used only in `omra/[slug]`. Below-fold data (reviews,
  testimonials) elsewhere is awaited before first byte of the page body — P5:
  stream below-fold blocks on home + hubs.

### 10. Prefetch on the money path
Zero raw internal `<a>` in site components (grep) — all internal navigation is
`next/link`, prefetch enabled by default on ISR routes in prod ✓. No
full-reload navigations found. PASS.

### 11. Interaction feedback
- LeadForm: state machine + `disabled={state==='sending'}` + visual dim ✓
  (<100 ms feedback). Tier/room selectors: synchronous local state ✓.
- Admin: only LoginForm + DeleteMediaButton show pending; `EntityForm` saves
  without a pending state — P5 (admin-only, low priority).
- Long tasks >50 ms: needs tracing on staging hardware (Stage C Lighthouse
  TBT ≤ 200 ms budget covers it).

### 12. Layout stability
Measured CLS 0–0.005 on all templates ✓. Server-rendered (no pop-in):
announcement bar, departed-offer banner, seat-count line ✓. Unverified
reserves (visual check on Stage B): `/contact` map embed box, `/avis` video
embeds.

### 13. RUM
- Pipeline live: `wt.js` captures **LCP (exact), CLS (exact session-window),
  INP (max-interaction proxy)** → `events` rows (`type='web_vital'`,
  `meta.label='LCP:2400'`) with **route** (`path`) ✓ and **device** via
  sessions/visitors join ✓ (migration 006).
- **Gaps → Stage B item (as the mission anticipated): TTFB is not captured**,
  and **no admin p75 view exists** (`lib/admin/analytics.js` has zero
  `web_vital` aggregation). Build: add TTFB to the beacon; admin panel with
  p75 per route class × device, threshold-highlighted against the targets.

---

## Stage B preview (impact order, pending approval)

| P | What (from findings above) | Expected effect |
|---|---|---|
| P1 | Fix `revalidateForTable` map (+3 tables, +hub/offer paths); `generateStaticParams` for LPs; cache OG images | correctness + only dynamic public surface removed |
| P2 | LCP diet on hero templates: tighter hero `sizes`, verify AVIF e2e on staging, preconnect to the Supabase host, trim home/offer HTML (172/160 kB → the RSC payload duplicates dictionary strings) | LCP −1–2 s on home/offer |
| P3 | Fonts: drop/subset Playfair, Tajawal 2 weights | −40–80 kB critical path |
| P4 | Convert ScreenshotWall/ReelsRow/Carousel/load-more to server + CSS | −5–10 kB/route |
| P5 | Per-segment skeletons (hubs/guide), stream below-fold, admin EntityForm pending state | perceived + INP |
| P6 | Delivery: verify brotli + immutable asset headers + HSTS on staging | edge wins |
| RUM | TTFB metric + admin p75 panel (closes §13) | field truth |

**STOP — Stage B awaits explicit approval (per mission).**

---

# Stage B — implemented 2026-07-19 (P1→P6 approved)

Gate: fresh isolated build (`.next-audit`) green; `npm run seo:audit` = 78
URLs, 72 pass; all 6 fails are **pre-existing live-content issues** (below),
none caused by these changes.

## What shipped

- **P1 rendering/correctness** — `revalidateForTable` rewritten
  (`src/lib/revalidate.js`): covers `city_pages`/`guide_pages`/
  `glossary_terms`, revalidates whole dynamic segments in one call
  (`'/[locale]/[flat]'`-style entries), pings `llms.txt`, and expands
  `faqs`/`offers`/`hotels`/`testimonials`/`occasions` to every surface that
  renders them. `lp/[slug]` gained `generateStaticParams` (table is empty
  today, so 0 prerendered is correct — future LPs render once, then cache).
  All 3 OG image routes now serve `immutable, max-age=31536000` (verified) —
  Satori no longer renders per scrape.
- **P2 LCP diet** — new `src/lib/offer-card.js:toOfferCard()` narrows offer
  rows at all 5 client-boundary call sites (raw rows carried ~12 long-text
  columns × 3 locales + full embedded hotel rows per tier). Hero/gallery LCP
  images at `quality={65}` (registered in `images.qualities`). Measured HTML:
  home fr 172→144 kB (−16%), ar 178→150 kB, `/bab-makka` 124→95 kB (−24%),
  `/omra-juillet` 95→65 kB (−31%); offer page ~unchanged (its bulk is the
  detail content itself). Supabase preconnect was **not** added — hero images
  are same-origin `/_next/image` proxies, so it would not touch the LCP path.
- **P3 fonts** — Playfair removed (one `.accent-line` consumer now rides
  `ui-serif, Georgia`); Tajawal 3→2 weights (500 dropped; CSS matching
  resolves it to the nearest loaded weight). Verified: critical font preload
  on fr/en 155→102 kB (−53 kB, 5→4 files).
- **P4 client boundaries** — audited every `'use client'` on the public site:
  all justified (HotelsGrid already server-renders all cards CSS-hidden;
  ReelsRow needs IO for autoplay; ScreenshotWall's lightbox is real UI). **No
  conversions made** — the honest win was P2's payload narrowing, not
  component surgery.
- **P5 perceived** — prose-shaped `loading.js` for `guide-omra/` (covers
  pillar + children), `glossaire-omra/`, `blog/[slug]/`. Below-fold streaming
  NOT added: every public route is ISR-cached, so only revalidation misses
  would benefit (offer page already streams its slow blocks). Correction to
  §11: admin `EntityForm` already had a full pending state — Stage A was
  wrong.
- **P6 delivery** — `Cache-Control` added: `/brand/*` 7 d + SWR, `wt.js`/
  `wt-motion.js` 1 h + 1 d SWR (verified). HSTS/immutable `_next/static`
  already existed. Brotli remains an edge/staging concern.

## Post-change lab status

Local lab re-measurement was **abandoned as untrustworthy**: the host was
running the dev server concurrently and 4× CPU throttle amplifies contention
(one home-fr run: TTFB 1 815 ms → LCP 5 488 ms; next navigation timed out).
The byte-level wins above are deterministic and verified; the LCP verdict
must come from staging Lighthouse + field RUM (Stage C).

## New findings (pre-existing, discovered during the gate)

1. **Site-wide soft 404s**: unknown slugs on every ISR route (`/fr/omra/x`,
   `/fr/hotel/x`, `/fr/blog/x`, `/fr/lp/x`) and even the `[...rest]` catch-all
   return **HTTP 200** with the 404 UI streamed inside — the `[locale]`
   `loading.js` Suspense boundary commits the 200 before `notFound()` throws.
   Predates Stage B (verified on untouched routes). Fix candidates: eliminate
   the root-level streaming boundary for unknown-param renders, or
   `dynamicParams=false` on fully-enumerable segments (`[flat]`) — needs its
   own change, ideally with an `seo:audit` rule asserting 404 statuses.
2. **seo:audit content fails (admin tasks, not code)**: 5 Arabic `confiance`
   FAQ answers are 19–22 words (target 25–75); `hotels.seo_title_ar` for
   `makarem-madinah` is saved **doubled** in the DB and `dhiafat-al-rajaa-hotel`
   has fr+ar concatenated in one field (the exact CLAUDE.md doubling
   anti-pattern — fix the rows in `/admin`); offer-page FAQ block is empty
   because the `faqs` table has **zero `omra`-category rows** (all 6 are
   `confiance`) — add omra FAQs fr+ar+en and the 3 offer-page fails clear.

## Still open for Stage C

Staging Lighthouse CI with budgets (LCP ≤ 2.5 s mobile lab, first-load JS
≤ 152 kB ratchet, image weight per template), brotli + AVIF e2e verify on
staging, RUM TTFB metric + admin p75 panel, soft-404 fix above.
