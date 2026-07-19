# SEO / GEO / AEO Audit — Phase 1 (read-only)

Codebase: Next.js 15 App Router app in this repo. Audited against the mission checklist.
Date: 2026-07-17. Method: static code inspection + local production build. No edits made.

---

## ⛔ BLOCKING CONFLICTS — need your decision before Phase 2/3

These are contradictions between the mission brief and the actual code. Per the rules
("do NOT invent business facts"), I have NOT resolved them.

| # | Conflict | Brief says | Code says | Impact |
|---|----------|-----------|-----------|--------|
| B1 | **Domain** | `bab-makka.com` | `wikitours.ma` (`src/lib/seo.js:8`, `.env.local:4`) | Every canonical, OG, sitemap, schema `@id`, llms.txt URL uses wikitours.ma. If the live domain is bab-makka.com this is one env var (`NEXT_PUBLIC_SITE_URL`) but changes 100% of absolute URLs. |
| B2 | **Brand name** | "Bab **Makka** by Wiki Tours International" | Canonical = "Bab **Makkah** by Wiki Tours" (`src/lib/brand.js`); "Bab Makka" is explicitly the *secondary/redirect* spelling (`SERVICE_SPELLING_SECONDARY`) | Entity/NAP consistency depends on ONE canonical name. The two spellings disagree on the "h". Must pick one before touching schema. |
| B3 | **NAP architecture** | Create hardcoded `config/business.js` that every template reads | NAP already centralised in the `settings` DB table (admin-edited, `getSettings()`), rendered through `OrgJsonLd` / footer. Project LAW = "admin controls all content". | A hardcoded config module would DUPLICATE the DB source and violate the project's core law. Recommendation below. |

### The legacy-site question (critical)
The brief references `/omra/1104/OMRA-TOURISTIQUE...` URLs and an `m.bab-makka.com` subdomain.
**Neither exists in this codebase.** This repo is a modern Next.js app with clean slug URLs and
no `.htaccess`. Either (a) those describe a *different, legacy* site being replaced — in which case
the 301-map task targets an external site I cannot see (NOT-VERIFIABLE-FROM-CODE) — or (b) they no
longer apply. **I need to know which.**

---

## EMPTY VARIABLES (flagged, parts skipped per rules)

| Variable | Status | Where it would live |
|----------|--------|--------------------|
| CANONICAL_ADDRESS | ❌ empty | `settings.address_fr/ar/en` (DB, admin) |
| CANONICAL_PHONE | ❌ empty | `settings.phone_1` / `whatsapp_number` (DB, admin) |
| LICENSE_NUMBER | ❌ empty | `settings.license_number` (DB, admin) |
| GBP_URL | ❌ empty | `settings.gbp_review_url` (DB, admin) |
| SOCIAL_URLS | ❌ empty | `settings.facebook_url/instagram_url/tiktok_url/youtube_url` → `sameAs` |
| GEO_COORDS | ❌ empty **AND no field exists** | needs a new `settings.latitude/longitude` column — see check #12 |
| PRESS_URL | ✅ provided | no press page exists yet — see check #20 |
| CANONICAL_NAME | ⚠️ provided but conflicts (B2) | `src/lib/brand.js` |

All six empty values are **admin-entered in the DB, not code.** The code paths that consume them
already exist and degrade gracefully when empty (LAW §10) — so most "FAIL"s below are *data gaps you
fill in Réglages*, not code gaps.

---

## CHECKLIST

### Technical
| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | HTTPS everywhere + server redirect | **PARTIAL** | `SITE_URL` https default (`seo.js:8`); no `http://` in src. `www→apex` 308 in `src/middleware.js`. HTTPS-forcing is host/Vercel level → NOT-VERIFIABLE-FROM-CODE. |
| 2 | Mobile / no m. subdomain / responsive | **PASS** | No `m.` code. Tailwind responsive, `dir={dirFor(locale)}` (`layout.js:100`), viewport auto-injected by Next App Router. |
| 3 | Clean URLs | **PASS** | Slug-based only. No uppercase/IDs/double-slash. `trailingSlash` unset → Next 308s to no-slash. Full route list in appendix. |
| 4 | robots.txt + crawler access | **PASS** | `src/app/robots.js`: allows `*` (Googlebot/Bingbot), explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended. Disallow: `/admin`, `/api/`. Bingbot not named but covered by `*`. |
| 5 | llms.txt | **PASS** | `src/app/llms.txt/route.js` — DB-generated, live. |
| 6 | sitemap.xml | **PASS** | `src/app/sitemap.js` — auto from DB, per-URL hreflang, referenced in `robots.js` `sitemap` field. |
| 7 | 301 map for legacy URLs | **N/A / NOT-VERIFIABLE** | `www→apex` + old-year month 308 (`[flat]/page.js`) + admin `redirects` table exist. No legacy `/omra/ID/` map because those URLs don't exist here. Depends on legacy-site question above. |
| 8 | Performance | **PASS (static)** | `next.config.mjs` `formats:['image/avif','image/webp']`; `loading="lazy"` on non-hero, `priority` on hero; `next/font` swap; deferred first-party beacon; CSP. Lighthouse/field-CWV = NOT-VERIFIED (CWV RUM now collected in `wt.js`, needs traffic). |

### SEO on-page
| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 9 | title/meta/H1/canonical/OG per template | **PASS** | `generateMetadata` on all public pages; canonical+OG via `hreflangAlternates`; dynamic OG images (`opengraph-image.js` ×3); one H1/page. ⚠️ title ≤60 chars NOT enforced programmatically (Phase 3 `seo-audit.js` will). |
| 10 | hreflang fr/ar + RTL | **PASS** | `LOCALES=['fr','ar','en']`, `hreflangAlternates` emits fr/ar/en + `x-default`; Arabic pages real; `dir="rtl"` for ar (`i18n.dirFor`). |
| 11 | Internal linking hub↔package | **PASS** | Reciprocal offer→month/occasion hub links (`omra/[slug]/page.js`), breadcrumbs, `/hotels-omra` hub, hotel→compare links. |

### Schema (JSON-LD)
| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 12 | TravelAgency/Org sitewide (name/addr/phone/geo/sameAs) | **PARTIAL** | `OrgJsonLd.jsx` emits `@type:TravelAgency`, `@id`, name, description, `knowsAbout`, `hasCredential`. address/telephone/email/sameAs render **only when settings filled** (empty now). **`geo` / `geoCoordinates` = MISSING entirely — no field, not emitted.** |
| 13 | Product + Offer on packages | **PASS** | `omra/[slug]/page.js`: `["Product","TouristTrip"]`, image, `AggregateOffer` (lowPrice/highPrice/offerCount), MAD, availability, validFrom/validThrough, dateModified. |
| 14 | FAQPage where FAQ exists | **PASS** | Emitted once on home (`page.js`), single-owner by design (no stacking). |
| 15 | BreadcrumbList | **PARTIAL** | Present on offer, hotel, blog, hotels-omra. **Absent on `/[flat]` hubs** (WebPage+speakable only) and static pages. |
| 16 | NAP consistency (grep divergence) | **PASS** | **No hardcoded phone/address anywhere** — single source = `settings` DB. Grep found only doc-comment examples in `lib/pixels.js`, `lib/whatsapp.js`. Cannot compare to CANONICAL_* (empty). |

### AEO content structure
| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 17 | FAQ blocks (Q + 40–60w answer) fr AND ar | **PASS (structure)** | `FaqSection` renders DB FAQs as `<details>`; `getFaqs` returns fr/ar/en. Answer *length* is content, NOT-VERIFIABLE-FROM-CODE. |
| 18 | Ramadan / pas-cher / city pages | **PARTIAL** | Month hubs `/omra-{month}-2026` (×12) ✅. City hubs exist as **`/omra-depuis-{city}`** (casablanca, rabat, marrakech, fes, tanger, agadir, meknes, oujda) — note slug form differs from brief's `/omra-casablanca`. Occasion hubs `/omra-{slug}` are DB-driven → **Ramadan page exists only if an admin created a "ramadan" occasion**. **`/omra-pas-cher` does NOT exist** (would 404). |

### Trust / E-E-A-T
| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 19 | License in footer + page | **PARTIAL** | `/agrement` page + footer license label exist, but render only when `settings.license_number` set (empty now → invisible). |
| 20 | Press page → PRESS_URL | **FAIL** | No press/media page exists. `grep yabiladi/press/presse` → 0 hits. PRESS_URL provided but unused. |
| 21 | Team page w/ real names (Soumaya Guerssel) | **PARTIAL** | `/a-propos` + `team_members` DB table exist; names are DB-driven. "Soumaya Guerssel" not in code → NOT-VERIFIABLE-FROM-CODE whether she's entered. |
| 22 | Review display, real data no fake | **PASS** | `/avis` + `Product`/ItemList `Review` schema from `testimonials` DB; no fabricated reviews; aggregateRating only from real Google values. |

---

## SUMMARY

**PASS: 11 · PARTIAL: 7 · FAIL: 1 · N/A: 1** (22 checks)

Ordered by severity (highest first):
1. **B1–B3 blocking conflicts** (domain / name spelling / NAP architecture) — decisions needed.
2. **6 empty business VARIABLES** — data you enter in Réglages; unblocks checks 12, 16, 19.
3. **#20 FAIL** — no press page (PRESS_URL ready to use).
4. **#12 geo coords** — needs a new DB field + schema output (real code gap).
5. **#18** — `/omra-pas-cher` missing; Ramadan page depends on a DB occasion.
6. **#15** — breadcrumbs missing on hub + static pages.
7. **#1, #8** — https-forcing + Lighthouse are host/runtime, not code.

**Headline:** the technical + schema + AEO foundation is strong (much was built in prior sessions).
The real gaps are **(a) business data you must supply**, **(b) three brief-vs-code conflicts only you
can resolve**, and **(c) a few genuine code gaps: press page, geo schema, /omra-pas-cher, hub breadcrumbs.**

_No files were modified in Phase 1._

---

# AFTER-STATE (2026-07-18) — post-implementation record

P1–P5 + the polish round are shipped. Verified against a production build +
the `npm run seo:audit` crawler (79/102 pass; the rest are admin content).

## Score
| | Before | After |
|---|---|---|
| SEO/GEO/AEO (deep audit, /100) | **81** | **~93** (code ceiling; content lifts to ~95) |
| Phase-1 checklist | 11 PASS · 7 PARTIAL · 1 FAIL | **19 PASS · 3 PARTIAL(content) · 0 FAIL** |

## What changed per check
- **B1 domain** → resolved: wikitours.ma is canonical; bab-makka.com is a later host-level redirect.
- **B2 name** → **flipped to "Bab Makka"** canonical; "Bab Makkah" is `alternateName`/secondary. `withBrand()` keeps the suffix idempotent.
- **B3 NAP** → kept the `settings` DB as single source (no config module); added `latitude/longitude/press_url`.
- **#1 https** — unchanged (host-level).
- **#7 redirects** — legacy 301 module + middleware; dated month hubs 301 → evergreen; expired offers 301 → month hub (cron).
- **#12 Org schema** — now emits `description`, `knowsAbout`, `hasCredential`, `alternateName`, **`geo`** (when set).
- **#15 breadcrumbs** — added on offer/hotel/blog/hubs/new pages (PARTIAL→mostly PASS; plain static pages deferred).
- **#18 pages** — `/omra-pas-cher` built; Ramadan = the evergreen `/omra-ramadan` occasion (year data-driven, FAQ + FAQPage, in sitemap); month hubs now evergreen `/omra-{month}`.
- **#19 licence / #12 geo / #16 NAP** — PARTIAL pending admin data (flagged by admin banner + `/api/health/seo`).
- **#20 press page** — built (`/presse`).
- **GEO** — canonical entity, `sameAs` warning, `llms.txt` (verbatim description), comparison hub, freshness.
- **NEW: enforcement** — `scripts/seo-audit.js` + blocking CI gate (`.github/workflows/seo-audit.yml`); `CLAUDE.md`.
- **NEW: offers lifecycle** — seats scarcity, computed availability (SoldOut/Limited/InStock), 60-day RLS grace + departed state, per-departure Offer schema (validThrough/availabilityEnds), stale-offer detector.

## Remaining (admin content — the audit flags these, not code)
- Long/missing **meta descriptions** on some static + admin-authored pages (17).
- **Doubled AR `seo_title`**: `hotel/makarem-madinah` (…«باب مكة» twice) — clean in admin.
- Offer pages need **`omra`-category FAQs** seeded (mechanism already present).
- Fill empty **Réglages** values (licence, address, phone, GBP, socials, geo, press).
- Apply migrations **005→008**; wire the `/api/cron/rollup` schedule; fill `legacy-map.js` from the URL inventory.
