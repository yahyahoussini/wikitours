> **STATUS: SHIPPED (2026-07-18).** P1–P5 implemented, plus the 5-item polish
> round. Build: 0 errors. `npm run seo:audit`: 79/102 pass; the 23 remaining are
> admin-content gaps (long/missing descriptions, doubled AR hotel `seo_title`,
> unseeded offer FAQs) — the gate correctly surfacing them for human fix. See
> `AUDIT-REPORT.md` § AFTER-STATE for before/after.

# FIX-PLAN — Phase 2 (awaiting approval before Phase 3)

Based on your 4 decisions. One P-level per commit group. Small, reviewable diffs.
**No business facts invented** — every empty value stays a `[CONTENT NEEDED]` / admin field.

## Locked decisions (recap)
1. **Domain** = `wikitours.ma` (main). bab-makka.com handled later (host-level redirect, out of scope here).
2. **Canonical name** = **"Bab Makka"** (no h). `"Bab Makkah"` → `alternateName` in schema only.
   Org = *Wiki Tours International*; Brand = *"Bab Makka by Wiki Tours International"* on the Omra hub + packages.
3. **Legacy** = external sites, real. Scaffold a 301 legacy-map module now (sample + wire), fill later from your URL inventory.
4. **NAP** = keep `settings` DB as single source. **No** `config/business.js`. Add `settings.latitude/longitude/press_url`.
   All JSON-LD server-rendered from DB. `seo-audit.js` crawls the **running app's HTML**. Add a production guard for empty critical settings.

---

## ⛔ NEW DECISIONS — the offers-system addition conflicts with the current model

Verified against code. These need your call (I recommend an answer for each):

| # | Issue | Evidence | My recommendation |
|---|-------|----------|-------------------|
| C5 | **No seat-count field exists.** Scarcity display + seats→SoldOut automation require a real number. LAWS §6 forbids inventing one. | `grep seats/places/remaining` in `schema.sql` = 0 hits. Only a `status` enum (open/few_left/full). | Add **nullable** `offers.seats_remaining`. Show "X places restantes" **only when set**; otherwise fall back to the `status` enum ("dernières places"), no number. Never invent. |
| C6 | **`/omra/[month]/` collides with `/omra/[slug]/`** (offer detail). A month slug would be read as an offer slug → 404. | Existing route `src/app/[locale]/omra/[slug]/`. | Use **evergreen `/omra-{month}`** (drop the year) instead — fits the existing `[flat]` + `/omra-{occasion}` pattern, no collision. 301 old `/omra-{month}-{year}` → `/omra-{month}`. |
| C7 | **RLS hides past offers from the public**, so a past package URL returns **404, not 301** — directly contradicts "no 404s, auto-301". | `schema.sql:683` `using (... date_end >= current_date)`; `getOfferBySlug` → null → `notFound()`. | Relax RLS to a **60-day grace** (`date_end >= current_date - 60`): the page renders a "parti — prochains départs" state for recently-ended offers; a **cron** (`/api/cron/rollup` exists) writes a 301 into the `redirects` table at +60 days. Public never sees truly-old offers. |
| C8 | **Offer slugs embed dates** (`omra-juillet-2026-confort`) — violates "dates never in URLs". | Live slug seen in `llms.txt`. Slugs are admin-entered data. | **Editorial, not code:** CLAUDE.md rule + admin hint to slug evergreen (`omra-confort-premium`). Do **not** auto-rewrite existing slugs (would need 301s + it's the admin's data). |
| C9 | **One offer = one departure** (single `date_start/date_end`). "Departures (plural) per package" would need a new `departures` table. | `schema.sql:188-189`. | **Keep 1-offer-1-departure** (each monthly departure is its own evergreen package). Confirm — a multi-departure model is a much larger change I'd scope separately. |

---

## P1 — Entity base, schema, NAP, critical-settings guard

### 1.1 Canonical name flip ("Makka") — `src/lib/brand.js` (single source)
| Constant | From | To |
|---|---|---|
| `service` | `Bab Makkah` | `Bab Makka` |
| `lockup` | `Bab Makkah by Wiki Tours` | `Bab Makka by Wiki Tours International` |
| `alternates` (new) | — | `['Bab Makkah by Wiki Tours International', 'Bab Makkah', 'Bab Makka by Wiki Tours']` |
| `SERVICE_SPELLING_SECONDARY` | `Bab Makka` | `Bab Makkah` (flip) |

Because everything reads `BRAND.*`, this auto-propagates to OG cards, `llms.txt`, breadcrumbs, headers, footer.
- **Display strings** in `i18n/{fr,ar,en}.json` (`nav.babmakkah`, `brand.footerLine`, `brand.premiumService`, etc.) → "Bab Makkah" → "Bab Makka" for FR/EN; AR keeps `باب مكة` (already h-less).
- **URL slug `/bab-makkah` stays unchanged** (URL stability; Google doesn't require slug=brand). A future rename to `/bab-makka` is optional and would go through the redirect module — flagged, not done now.

### 1.2 Schema: Organization + Brand + alternateName — `src/components/site/OrgJsonLd.jsx`, `omra/[slug]/page.js`
- `TravelAgency` (Org) `name` = "Wiki Tours International"; add `alternateName: BRAND.alternates`.
- `Product.brand` / hub brand `name` = "Bab Makka by Wiki Tours International", `alternateName: 'Bab Makkah by Wiki Tours International'`.
- Add `geo` (`GeoCoordinates`) to Org **and** the Casablanca `LocalBusiness`, emitted only when `settings.latitude`+`longitude` present.

### 1.3 Geo + press DB fields — new migration `supabase/migrations/007_geo_press.sql` + `schema.sql`
- `alter table settings add column latitude numeric(9,6), longitude numeric(9,6), press_url text;`
- Add to zod `settingsSchema` (`.strict()` — mandatory) + `SettingsForm` (new "Localisation & presse" section).

### 1.4 Critical-settings production guard — `src/lib/seo/health.js` (new)
- `criticalSettingsHealth(settings)` → list of missing critical keys (license, address, phone, geo, gbp, sameAs, verification, press).
- Surfaced 3 ways: (a) existing admin banner (done); (b) **runtime `console.warn` once in production** when a public page renders with criticals missing; (c) tiny internal `GET /api/health/seo` returning `{ ok, missing[] }` (noindex, no secrets) for uptime/CI checks.

---

## P2 — hreflang/titles/URLs, redirects, sitemap (mostly PASS — deltas only)

### 2.1 Legacy 301 redirect module — `src/lib/redirects/legacy-map.js` (new) + wire into `src/middleware.js`
- Export `LEGACY_REDIRECTS` = `Map(oldPath → { to, permanent })` with **one sample entry** + `// [URL INVENTORY NEEDED]` marker.
- Middleware consults it **before** the locale logic; 301 (permanent) to the new path. Complements the existing DB `redirects` table (admin) and `www→apex`.
- Note: this handles legacy *paths on wikitours.ma*. bab-makka.com→wikitours.ma is host-level (your later work).

### 2.2 Title length guard
- No code change to titles now; enforcement moves to `seo-audit.js` (P4) which fails builds on `title > 60` / `description > 155`.

*(hreflang, canonical, sitemap, llms.txt already PASS — no work.)*

---

## P3 — Missing pages + FAQ + geo output

### 3.1 Press page (#20) — `src/app/[locale]/presse/page.js` (new)
- Reads `settings.press_url` (your Yabiladi link, entered in Réglages). Renders press mentions list, `[CONTENT NEEDED]` for any quote/outlet not in DB.
- Adds `sameAs`-adjacent trust: links out to the coverage; breadcrumb + `WebPage` schema. Added to sitemap + footer + `/a-propos`.

### 3.2 `/omra-pas-cher` scaffold (#18) — `src/app/[locale]/omra-pas-cher/page.js` (new, static route beats `[flat]`)
- Full AEO structure: H1, answer-first lede pulling **real** min price from published offers (no invented prices), gamme explainer, FAQ skeleton (`[CONTENT NEEDED]` FR/AR answers 40–60 words), `Product`/`ItemList` from real offers, `speakable`, breadcrumb.
- Zero fabricated prices/claims — computed from DB or marked `[CONTENT NEEDED]`.

### 3.3 Ramadan page — **no scaffold**; documented
- `/omra-ramadan-2026` already works IF you create a "ramadan" occasion in admin (DB-driven). Plan: add a note in CLAUDE.md; optionally seed the occasion (your call, needs your dates/prices → `[CONTENT NEEDED]`).

### 3.4 Breadcrumbs everywhere (#15)
- Add `<Breadcrumbs>` + `BreadcrumbList` JSON-LD to: `/[flat]` hubs, `/voyages`, `/hajj`, `/avis`, `/agence-omra-casablanca`, `/agrement`, `/a-propos`, `/contact`, `/blog`, `/omra-pas-cher`, `/presse`.

---

## P4 — Audit script, CLAUDE.md, internal linking

### 4.1 `scripts/seo-audit.js` (A) — crawls the RUNNING app
- Node, **zero deps** (native `fetch` + regex/JSON-LD extraction — no cheerio/puppeteer).
- Input: `BASE_URL` (default `http://localhost:3000`). Fetches `/sitemap.xml`, crawls every URL.
- Per page asserts: one `<title>` ≤60, `<meta name=description>` ≤155, exactly one `<h1>`, `<link rel=canonical>`, ≥1 `application/ld+json`. For `/*/omra/*`: `Offer`/`AggregateOffer` present **and** an FAQ/Question block. Exits `1` on any failure with a per-URL report.
- Wire: `package.json` → `"seo:audit": "node scripts/seo-audit.js"` and a CI recipe (`build → start → wait → audit → exit code`).

### 4.2 `CLAUDE.md` at repo root (B)
- Encodes: schema from **DB** (never a config module); canonical name **"Bab Makka"** (+ alternateName rule); title ≤60 / meta ≤155; FAQ answers 40–60 words; **fr/ar/en parity** with `[TRANSLATION NEEDED]` markers; **301 policy** (never delete a URL without a redirect); **never invent business data**; NAP single-source in `settings`; run `npm run seo:audit` before shipping SEO changes.

### 4.3 Internal linking (already strong — small adds)
- Press + `/omra-pas-cher` + `/hotels-omra` into the footer hub; reciprocal links verified by the audit script.

---

## P5 — Time-limited offers system (assumes C5–C9 recommendations approved)

### 5.1 Evergreen month hubs — `/omra-{month}` (drop the year)  *(addition #1, C6)*
- `src/lib/months.js`: `monthPagePath` → `/omra-{month}` (no year); keep `MONTH_SLUGS`. `[flat]` `parseMonthSlug` accepts bare `/omra-{month}` **and** legacy `/omra-{month}-{year}`.
- Legacy `/omra-{month}-{year}` → **301** `/omra-{month}` (via the P2 redirect module + `[flat]` rollover).
- Year stays out of the URL, lives in H1/title/content only. Update sitemap, internal links, breadcrumbs.
- Occasion hubs (`/omra-ramadan`) are already evergreen — no change. ✓

### 5.2 Per-departure Offer schema, auto availability  *(addition #2)*
- `omra/[slug]/page.js` Offer/AggregateOffer: add `availabilityStarts`=`date_start`, `availabilityEnds`/`validThrough`=`date_end`, keep `price`/`priceCurrency` MAD, `validFrom`.
- **Availability computed server-side** from data, not the raw status:
  `SoldOut` if `status==='full'` **or** `seats_remaining===0` **or** `date_end < today`; `LimitedAvailability` if `few_left` or low seats; else `InStock`.

### 5.3 Expiry automation — no deletes, no 404s  *(addition #3, C7)*
- **RLS grace window** (migration): `date_end >= current_date - interval '60 days'`.
- Offer page: if `date_end < today` → render **"Parti · prochains départs"** state (links to month + occasion hubs, similar offers). Still 200, still indexable-then-redirected.
- **Cron** `/api/cron/rollup`: for offers ended >60 days, upsert a 301 `redirects` row `/omra/{slug}` → `/omra-{month}`. Middleware already applies it. Nothing deleted.

### 5.4 Real scarcity component — `src/components/site/SeatsRemaining.jsx` (new)  *(addition #4, C5)*
- Renders `settings`/offer `seats_remaining` **only when a real number exists**; bound to DB, server-rendered. Below a threshold → "dernières places". **No countdown, no urgency copy not in the DB** (LAWS §6).
- New nullable `offers.seats_remaining` (migration) + zod + admin offer form field.

### 5.5 Freshness  *(addition #5)*
- `dateModified` already on Product (P1) — extend to Offer node. Sitemap `lastmod` already `updated_at` ✓.
- Visible **"Mis à jour le {date}"** on month/occasion hubs, computed from `max(updated_at)` of listed offers, as `<time datetime>`.

### 5.6 Audit: stale-offer detector  *(addition #6)*
- Extend `scripts/seo-audit.js`: parse each rendered page's JSON-LD Offers → **FAIL** if any has a past `validThrough`/`date_end` while availability ∈ {InStock, LimitedAvailability}, **or** an Offer missing `validThrough`.

### 5.7 CLAUDE.md rule  *(addition #7)*
- Add verbatim: **"Offer dates are data, never URLs; expired offers are updated or redirected, never deleted."** Plus the evergreen-slug guidance (C8) and the availability-from-data rule.

---

## Commit groups (one per P-level)
1. `p1: canonical Makka flip + geo/press fields + schema Org/Brand + settings guard`
2. `p2: legacy redirect module + middleware wire`
3. `p3: press page + /omra-pas-cher scaffold + breadcrumbs everywhere + geo schema output`
4. `p4: seo-audit.js crawler + CLAUDE.md + footer hub links`
5. `p5: evergreen month hubs + per-departure Offer schema + expiry cron + seats + freshness + stale-offer audit`

## Migrations you'll apply (live Supabase)
- `005_story_team.sql` (pending, prior), `006_web_vitals.sql` (pending, prior), **`007_geo_press.sql` (new)**,
  **`008_offers_lifecycle.sql` (new: `seats_remaining` + RLS 60-day grace)**.

## What still needs YOU after Phase 3
- **Réglages:** license, address, phone, GBP, socials (`sameAs`), verification metas, **latitude/longitude**, **press_url**.
- **Legacy URL inventory** → fill `legacy-map.js`.
- **FR/AR copy** for `/omra-pas-cher` FAQ (`[CONTENT NEEDED]`), press quotes, Ramadan occasion data.
- **Per-offer `seats_remaining`** entered in the admin offer form (optional per offer; blank = falls back to status enum).
- Confirm: keep URL slug `/bab-makkah` (recommended) or rename to `/bab-makka` (adds a 301).
- **Cron trigger** for `/api/cron/rollup` (Vercel Cron / external scheduler) so expiry-301s fire daily.

---

**Estimated end state:** all P1–P2 PASS under `seo-audit.js`; 0 non-canonical NAP (already 0); press+geo+pas-cher live; audit gate + CLAUDE.md enforcing it going forward.

_Awaiting your approval to start Phase 3._
