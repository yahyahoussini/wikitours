# CLAUDE.md — project rules + repo map (read before any SEO / content / schema change)

> Two halves. **Part I** is the map: what exists and where to change it — regenerated
> 2026-09-09 by reading the source, not by assumption. **Part II** is the rulebook, the
> accumulated decisions that outrank convenience. Where a law in `docs/PROJECT-LAWS.md`
> and this file disagree, **this file wins** — it records the later decisions.

## Project summary (10 lines)

1. Wiki Tours International — a licensed Moroccan travel agency in Casablanca (licence `ODV-25012`, operating since 2016).
2. `Bab Makka` is its Omra & Hajj **service line**, not a separate company; `wikitours.ma` is the single site.
3. Next.js 15 App Router with Turbopack, **plain JavaScript** (no TypeScript), Tailwind v4, deployed on Vercel.
4. Supabase is the only datastore; RLS is what makes a row public, so "published" is a database fact, not a code branch.
5. Three locales — `fr` (fallback), `ar` (RTL), `en` — every public URL is `/{locale}/{slug}`.
6. Everything editable lives in the admin at `admin.wikitours.ma`; there is no config file of business data.
7. SEO/AEO/GEO is the product: server-rendered HTML, JSON-LD from DB values, `/llms.txt`, IndexNow, a sitemap that mirrors every indexability rule.
8. Scaffolded surfaces stay `noindex` until real content fills them, and the sitemap never lists a `noindex` URL.
9. The blog releases itself daily from scheduled rows; content is written weekly by a $0 cloud routine, never by a paid API key.
10. `npm run build` is the gate: its `postbuild` runs `scripts/seo-suite.mjs` (every SEO rule, then the schema gate) and `npm test` on the build output; `npm run seo:audit` crawls the live sitemap after deploy.

---

# Part I — The map

## Hard constraints (standing context, verbatim)

```
1. Do NOT change the canonical strategy. Each locale self-canonicalises. The /omra-{month}-2026
   URLs 301 to /omra-{month} and that is correct.
2. Do NOT change the www -> apex redirect.
3. Do NOT add region-coded hreflang (fr-MA, fr-FR, ar-MA). Bare language codes only, plus x-default.
4. Do NOT restructure the /{locale}/{slug} URL architecture.
5. Do NOT migrate any route to client-side rendering. Server-rendered HTML is a hard requirement —
   AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) do not reliably execute JavaScript.
6. Do NOT attach AggregateRating to Product/Offer schema. The 4.8-star / 139 reviews are agency
   reviews. They attach to the Organization node only.
7. Do NOT edit, translate or tidy customer review text. It is mixed FR/AR/Darija and its
   authenticity is the point.
8. Do NOT "correct" Moroccan Arabic month names (شتنبر، غشت، نونبر، دجنبر) to Levantine forms.
9. Do NOT invent facts — staff names, credentials, prices, dates, review counts. If a value is
   needed and not present in the codebase or database, stop and list what you need.
10. Do NOT remove noindex from a month page until that page has real evergreen content.
```

> ✅ **Constraint 6 — resolved 2026-09-13 (owner decision, commercial-inventory task).** The
> `['Product','TouristTrip']` node on `/omra/[slug]` carries **no** `aggregateRating` / `review`.
> The block that was removed had only ever rated an offer from testimonials carrying its
> `offer_id` — no row does — so nothing live changed. Ratings are visible copy + llms.txt only,
> on **no** schema node; the rule that they must never sit on the Organization / TravelAgency /
> LocalBusiness node still holds (enforced in `src/components/site/OrgJsonLd.jsx`).
> `settings.gbp_review_count` is 139 (the sync cron updates it).

## Route inventory

Everything public is `/{locale}/…` with `locale ∈ {fr, ar, en}`. Slugs are **never translated** — the
English and Arabic pages carry the French slug (`/en/omra-pas-cher`, `/ar/guide-omra`).

### Static pages

| Route | File | Notes |
|---|---|---|
| `/{locale}` | `src/app/[locale]/page.js` | Home. `revalidate = 3600` |
| `/{locale}/bab-makka` | `src/app/[locale]/bab-makka/page.js` | The Omra hub. `revalidate = 3600` |
| `/{locale}/omra-pas-cher` | `src/app/[locale]/omra-pas-cher/page.js` | Evergreen cheap-Omra hub. `revalidate = 3600` |
| `/{locale}/hotels-omra` | `src/app/[locale]/hotels-omra/page.js` | Hotel comparison hub |
| `/{locale}/agence-omra-casablanca` | `src/app/[locale]/agence-omra-casablanca/page.js` | Local page; `WebPage.mainEntity → #organization` |
| `/{locale}/hajj` | `src/app/[locale]/hajj/page.js` | Interest-only, no packages |
| `/{locale}/voyages` | `src/app/[locale]/voyages/page.js` | Non-Omra catalog; noindex while empty |
| `/{locale}/blog` | `src/app/[locale]/blog/page.js` | Article index. `revalidate = 3600` |
| `/{locale}/avis` | `src/app/[locale]/avis/page.js` | Reviews |
| `/{locale}/presse` | `src/app/[locale]/presse/page.js` | Driven by `settings.press_url` |
| `/{locale}/agrement` | `src/app/[locale]/agrement/page.js` | Licence |
| `/{locale}/a-propos` | `src/app/[locale]/a-propos/page.js` | About + team `Person` nodes (via `personNode()`) |
| `/{locale}/equipe` | `src/app/[locale]/equipe/page.js` | Team / authors (E-E-A-T): every renderable profile as a card + `Person` node with the `@id` article bylines resolve to. **noindex until one complete (fr+ar bio) published profile exists**; joins the sitemap and the footer at the same moment. `revalidate = 3600` |
| `/{locale}/contact` | `src/app/[locale]/contact/page.js` | Contact + lazy map |
| `/{locale}/barometre-prix-omra` | `src/app/[locale]/barometre-prix-omra/page.js` | Original-data page. `revalidate = 3600` |
| `/{locale}/glossaire-omra` | `src/app/[locale]/glossaire-omra/page.js` | 42 terms live |
| `/{locale}/guide-omra` | `src/app/[locale]/guide-omra/page.js` | Guide pillar |
| `/{locale}/cgv`, `/mentions-legales`, `/politique-de-confidentialite` | 3 thin files → `createLegalPage()` in `src/lib/legal-page.js` | Admin markdown; noindex until fr+ar filled |

### Dynamic routes

| Route | File | `generateStaticParams` source |
|---|---|---|
| `/{locale}/omra/[slug]` | `src/app/[locale]/omra/[slug]/page.js` | `getPublishedOffers()` |
| `/{locale}/blog/[slug]` | `src/app/[locale]/blog/[slug]/page.js` | `getArticles(500)` |
| `/{locale}/hotel/[slug]` | `src/app/[locale]/hotel/[slug]/page.js` | `getHotels()` |
| `/{locale}/voyage/[slug]` | `src/app/[locale]/voyage/[slug]/page.js` | `getVoyages()` |
| `/{locale}/guide-omra/[slug]` | `src/app/[locale]/guide-omra/[slug]/page.js` | hardcoded `GUIDE_CHILD_SLUGS` (6) |
| `/{locale}/lp/[slug]` | `src/app/[locale]/lp/[slug]/page.js` | `landing_pages` |
| `/{locale}/[flat]` | `src/app/[locale]/[flat]/page.js` | 12 months + 8 cities + DB occasions |
| `/{locale}/[...rest]` | `src/app/[locale]/[...rest]/page.js` | none — pure `notFound()` |

**`[flat]` is the programmatic-SEO router.** Next resolves *static dir > `[flat]` > `[...rest]`*, so
`[flat]` catches every single unmatched segment and `resolveFlat()` (`src/app/[locale]/[flat]/page.js:57-73`)
accepts exactly three shapes, in this order: **month → city → occasion**.

1. **12 month hubs** `/omra-{janvier…decembre}` — `MONTH_SLUGS`, `src/lib/months.js:7-10`
2. **8 city pages** `/omra-depuis-{casablanca|rabat|marrakech|fes|tanger|agadir|meknes|oujda}` — `CITY_SLUGS`, `src/lib/months.js:47-56`
3. **DB occasion hubs** `/omra-{occasion.slug}` — from the `occasions` table

Anything else → `notFound()`. `[...rest]` only ever sees two-or-more unmatched segments.

### Non-locale routes

`src/app/sitemap.js`, `src/app/robots.js`, `src/app/llms.txt/route.js`, `src/app/indexnow-key.txt/route.js`,
`src/app/api/**`, `src/app/admin/**`, plus OG image routes at `src/app/[locale]/opengraph-image.js` and
per-entity overrides under `blog/[slug]/` and `omra/[slug]/`.

### Redirects

| From | To | Status | Where |
|---|---|---|---|
| `/omra-{month}-{yyyy}` | `/omra-{month}` | **301** | `src/middleware.js:144-149` (primary, any year) |
| same, if it reaches the page | same | 308 | `src/app/[locale]/[flat]/page.js:143-145` (backstop) |
| `/bab-makka` (no locale) | `/{detected}/bab-makka` | **307** + `Vary: accept-language` | `src/middleware.js:188-191` |
| `/bab-makkah` (with h) | `/fr/bab-makka` | 301 | `src/lib/redirects/legacy-map.js:19` |
| `www.` | apex | 308 | `src/middleware.js:99-103` |
| `*.bab-makka.com` | `wikitours.ma/fr/…` | 301, one hop | `src/middleware.js:84-95` |
| retired departure (returned > 90 days ago) or an unpublished departed one | `/{locale}/omra-{mois}` — or `/{locale}/bab-makka` when that lander is noindex (logged) | **301** | `src/middleware.js` § 2.5, from `date_end` via `offerLifecycle()` + `retiredRedirectPath()`; the page body 308s as backstop. No cron, no flag |
| admin redirect whose target is a **noindex** month lander | `/{locale}/bab-makka` instead (logged) | 308/307 | `src/middleware.js` § 2 — a redirect never lands on a noindex page |

`next.config.mjs` has **no** `redirects()` or `rewrites()`. All of it is middleware.

## Where to change X

| Concern | File |
|---|---|
| **Routing** | |
| Locale list, fallback, `dir` | `src/lib/i18n.js` |
| All redirects, rewrites, locale detection, admin host, bot logging | `src/middleware.js` |
| Static legacy renames | `src/lib/redirects/legacy-map.js` |
| Content moves (admin-editable) | `redirects` DB table → `src/lib/edge-data.js:70` |
| Month slugs, the year a month lander is about (`rolloverYear`/`targetYearFor` — **there is no year constant**), `monthLanderIndexable()` / `indexableMonths()` (the ONE month predicate), `retiredRedirectPath()`, city whitelist, `cityPageIndexable()` | `src/lib/months.js` |
| Month landers' derived blocks (prices observed, last season, Hijri overlap via `Intl` islamic-umalqura) | `src/lib/month-stats.js` |
| Departure lifecycle `live → archived → retired` from `date_end` (`offerLifecycle`, `ARCHIVE_DAYS = 90`) | `src/lib/offers.js` |
| Unit tests (rollover boundaries, lifecycle transitions) — run by `postbuild` and `npm test` | `tests/*.test.mjs` (+ `tests/alias-loader.mjs` for `@/` and JSON imports) |
| Guide child slugs, `guideIndexable()`, `GLOSSARY_MIN_TERMS` | `src/lib/guides.js` |
| **Metadata** | |
| `metadataBase`, title template, default description, verification metas | `src/app/[locale]/layout.js:45-74` |
| Canonical **and** hreflang (one helper, always together) | `hreflangAlternates()` — `src/lib/seo.js:63-71` |
| Sitemap-only alternates (no `x-default`, deliberate) | `sitemapAlternates()` — `src/lib/seo.js:74-78` |
| Title building, brand suffix idempotence | `withBrand()`, `routeTitle()` — `src/lib/titles.js` |
| Description clamp (≤155, word boundary) | `clampDesc()` — `src/lib/seo.js:13` |
| Schema `PostalAddress`, `brandNode()`, E.164 phones | `src/lib/seo.js:114,143`; `toE164()` |
| **I18N** | |
| UI strings | `src/i18n/fr.json`, `ar.json`, `en.json` — 328 leaves each, full parity |
| Dictionary loader | `getDictionary()` — `src/lib/i18n.js` |
| DB per-locale field picker (falls back to `_fr`) | `pickLang()` — `src/lib/i18n.js:27-30` |
| **City display names** | `CITY_SLUGS` — `src/lib/months.js:47-56` (see the warning below) |
| RTL direction | `dirFor()` → `<html dir>` in `src/app/[locale]/layout.js:101` |
| **Sitemap / robots** | |
| Sitemap | `src/app/sitemap.js` (Next metadata convention, `revalidate = 86400`) |
| robots.txt | `src/app/robots.js` (static, 10 UA groups) |
| AI-readable summary | `src/app/llms.txt/route.js` (French only, by design) |
| IndexNow key file + ping | `src/app/indexnow-key.txt/route.js`, `src/lib/server/indexnow.js` |
| **Layout / navigation** | |
| Root layout (there is **no** `src/app/layout.js`) | `src/app/[locale]/layout.js` |
| Header | `src/components/SiteHeader.jsx` → `src/components/site/HeaderClient.jsx` |
| Footer | `src/components/site/SiteFooter.jsx` |
| Announcement bar | `src/components/AnnouncementBar.jsx` + `AnnouncementBarClient.jsx` |
| Breadcrumbs, visible only | `src/components/site/Breadcrumbs.jsx` |
| Breadcrumbs + `BreadcrumbList` JSON-LD | `src/components/site/BreadcrumbTrail.jsx` |
| Nav links (admin-overridable) | `menus` table, `location='header'` / `footer_col1` / `footer_col2` |
| **Data** | |
| Canonical DDL | `supabase/schema.sql` (**has drifted — see below**) |
| Migrations | `supabase/migrations/003…021`, one-paste re-run in `supabase/APPLY-ALL-016-to-021.sql` |
| Public read helpers (anon client, RLS applies) — `getPublishedOffers()` = the listings (not yet returned), `getOfferHistory()` = every published departure for the month landers' derived blocks, `getMonthPages()` = the authored month rows | `src/lib/data/content.js` |
| Settings | `src/lib/data/settings.js` |
| Offer availability + status (single source) | `src/lib/offers.js` |
| Barometer aggregation, shared by page and sitemap | `src/lib/barometer.js` |
| The one Organization node | `src/components/site/OrgJsonLd.jsx` |
| Hotel node + hotel/departure `@id`s — ONE builder for the hotel page, the hub `ItemList` and each departure's `itinerary` | `hotelNode()`, `hotelPostalAddress()`, `hotelNodeId()`, `tripNodeId()` — `src/lib/seo.js` |
| JSON-LD renderer | `src/components/site/JsonLd.jsx` |
| Topical clusters A–G — pillar ↔ hub ↔ article wiring, the mandatory link pairs, the Hajj → Omra bridge | `src/lib/clusters.js` → `ClusterIndex` (pillars link down), `ClusterLinks` (pages link up + siblings), `HajjBridge`, `RelatedArticles` (hub → its articles via `supports_path`, else the map) |
| Internal link graph + orphan report (reads the build output) | `scripts/link-graph.mjs` — `npm run links:graph`, snapshot in `docs/link-graph.md` |
| Authors (E-E-A-T): people = `team_members` rows (+ profile columns, migration 024), article `author_id` / `reviewer_id`; the intake the client fills | `docs/authors-intake.md`, `/equipe` page, `personNode()` in `src/lib/seo.js` |
| **Blog automation** | |
| Quality gate, shared by both engines (no `@/` imports) | `src/lib/server/article-gate.mjs` |
| Weekly writing contract | `content/ARTICLE-BRIEF.md` |
| Build-time ingest (`prebuild`) | `scripts/ingest-articles.mjs` |
| Public grounding facts | `src/app/api/content/facts/route.js` |
| Daily release cron (accelerator only: IndexNow + runway e-mails) | `src/app/api/cron/publish-articles/route.js` |
| Placeholder tags in article bodies (parser + validator; the render map) | `src/lib/content-tags.js`, `src/components/content/ArticleBody.jsx` + `CommercialCTA` / `LiveDepartures` / `ReviewQuote` / `HijriCountdown` / `DepositPolicy` / `HotelList` |
| Stable facts a session may state (source + date per fact) | `data/allowed-facts.json` ← `scripts/build-allowed-facts.mjs` (`npm run content:facts`) |
| Hijri events (Umm al-Qura, admin-adjustable after the sighting) | `src/lib/hijri.js`, `public.hijri_events` (migration 025) ← `scripts/build-hijri-events.mjs` (`npm run content:hijri`) |
| The content architecture: map, decisions, open items | `docs/content-system.md` |
| **Admin** | |
| Authorization (single authority, fails closed) | `src/lib/admin/authz.js` |
| Entity/field registry | `src/lib/admin/registry.js` |
| **Gate** | |
| SEO regression suite (`postbuild`, reads the build output; titles / meta / canonical / hreflang / sitemap / links / language / rendering, then the schema gate; `--self-test`; `BASE_URL=` for a live server) | `scripts/seo-suite.mjs` — `npm run seo:suite` |
| Structured-data gate (run by the suite as its SCHEMA step; `--self-test`) | `scripts/schema-audit.mjs` + `scripts/schema-vocab.json` |
| Page typing + build-output loader shared by both gates — **a new route is classified here** | `scripts/lib/build-pages.mjs` (`STATIC` / `DYNAMIC` / `pageType()`), how-to in `scripts/README.md` |
| SEO audit (crawls the live sitemap; CI runs it after the build) | `scripts/seo-audit.js` |
| Title floor per script, admin-title-or-template | `titleFloor()`, `titleOr()` — `src/lib/titles.js` |
| Description floor (120) + trust-clause padding | `DESC_MIN`, `padDescription()` — `src/lib/page-seo.js` |
| **Delivery** | |
| Library images: `MediaImage` (client wrapper) + `mediaLoader()` — AVIF sources resized by Supabase's render endpoint, everything else `/_next/image` | `src/components/MediaImage.jsx`, `src/lib/media.js` |
| Preconnect / dns-prefetch to the media origin | `src/app/[locale]/layout.js` (`publicMediaOrigin()`) |

## Known-good patterns to follow

**Indexability is one expression, reused.** A scaffold's noindex condition, its sitemap inclusion, its
llms.txt inclusion and its footer link all call the *same* predicate — `cityPageIndexable()`,
`guideIndexable()`, `computePeriods().periods.length`. Never inline a second copy of the rule; a
`noindex` URL in the sitemap is a hard audit failure (`scripts/seo-audit.js:245`).

**Canonical and hreflang ship together.** One call to `hreflangAlternates(locale, path)` returns both.
No page sets `alternates.canonical` by hand.

**`notFound()` inside `generateMetadata`.** Used in 8 files. Metadata resolves before streaming, so the
response carries a real 404 instead of a 200 already committed by a Suspense boundary. Keep doing this.

**Titles use `{ absolute: … }` + `withBrand()`.** The layout template appends `— Wiki Tours International`
to any plain-string title, which blows past 60 chars and can double the brand.

**Read published data through `src/lib/data/content.js`.** It uses the anon client, so RLS decides
visibility. Server-only work uses the service-role client and must never be imported into a client
component.

**Offer status comes from `src/lib/offers.js`.** Never read `offers.status` directly for display, or the
badge and the JSON-LD will disagree.

**One tier resolution path.** `getOfferBySlug()` loads `offer_tiers`, synthesizes a legacy pseudo-tier
when there are none, then overwrites `starting_price` with the true minimum.

**Answer-first lede marked `data-answer`, referenced by `speakable`.** Every page type does both. The
blog was the last holdout and was fixed on 2026-09-09.

**Dictionary-first strings.** UI text belongs in `src/i18n/*.json`, DB text goes through `pickLang()`.

**Internal links come from the cluster map, never from a template.** `src/lib/clusters.js` says which
pillar, hubs and articles form clusters A–G and which contextual targets an article must carry; the
components read it. An article joins a cluster by its explicit entry, else `supports_path`, else
`category` — so a new article is wired the moment it is published. Add a link pair there, not in JSX.

**Logical CSS properties, not RTL overrides.** `ms-*` / `me-*` / `ps-*` / `pe-*` / `text-start` / `text-end`.
There is no `tailwind.config.js` (Tailwind v4) and no RTL plugin.

## Traps this repo has already fallen into

- **`pickLang()` silently falls back to French.** An unfilled `_ar` column renders French text on the
  Arabic page, and nothing in the code shows it. This is the largest source of untranslated output.
- **City names are localized — read them with `cityName(slug, locale)`, never `CITY_SLUGS` directly.**
  Display names live in `src/i18n/*.json` under `cities` (ar `الدار البيضاء`, en `Marrakesh`/`Fez`/
  `Tangier`); `CITY_SLUGS` in `src/lib/months.js` now holds only the slug whitelist and the French
  fallback. Using the map directly is what made the Arabic footer read `عمرة انطلاقاً من Casablanca`.
  URL slugs stay Latin (`omra-depuis-casablanca`) — slug migration is a separate, higher-risk task.
- **Run `npm run i18n:audit` after touching copy.** It flags Latin script inside `ar` values, `en`
  values identical to `fr`, keys missing from a locale (silent French fallback) and user-visible
  literals hardcoded in JSX. `docs/i18n-audit.md` is the checked-in report; regenerate with
  `npm run i18n:audit -- --write`. It is a report, not a gate — it always exits 0.
- **The month-hub meta description is hardcoded French** (`src/app/[locale]/[flat]/page.js:99`) while the
  title beside it is localized — the head is half-translated.
- **`withBrand()` only guards `{absolute:…}` titles.** Plain-string titles get the template suffix
  unconditionally, so `/hajj` renders "Hajj avec Wiki Tours — Wiki Tours International". The
  contact / a-propos / agrement / voyages / presse pages did the same until 2026-09-14 — it
  made `/fr/contact` and `/en/contact` identical and gave every Arabic title a Latin brand;
  they now use `routeTitle()` templates (`seoTitles` in the dictionaries). The suite fails
  both symptoms.
- **Vercel's image optimizer passes AVIF sources through untouched.** `/_next/image?url=…avif&w=640`
  returned the 1672px / 112KB original for every `w` — the mobile LCP image at desktop size.
  Library images render through `MediaImage`, whose `mediaLoader()` sends AVIF objects to
  Supabase's render endpoint (`/storage/v1/render/image/public/…?width=`) and keeps every
  other source on `/_next/image`. A `loader` function cannot cross the server → client
  boundary, which is why the wrapper exists — never pass `loader=` from a server component.
- **`experimental.inlineCss` broke every web font.** Turbopack writes next/font's
  `@font-face` with relative `url(../media/…)`; inlined into the page those resolved to
  `/media/…` → the 404 page (156KB, VeryHigh priority, three per view) and Montserrat /
  Inter / Tajawal never applied. Keep the stylesheet as a `<link>` (18KB over the wire,
  immutable-cached).
- **`articles.category` is a raw enum rendered uppercase**, so Arabic blog cards read `CONFIANCE`.
- **Prices use `Intl.NumberFormat('fr-MA')` at 14 sites**, hardcoded, not derived from locale.
- **`supabase/schema.sql` has drifted.** `public.legal_pages` (migration 014) and `leads.tier_label`
  (migration 004) exist only in migrations. Update both files when changing the schema.
- **A UA with its own robots.txt group ignores `*` entirely.** Add new rules to the shared `disallow`
  array in `src/app/robots.js:9`, never to `*` alone.
- **Three UA lists must stay in step**: `src/app/robots.js`, `BOT_UA` in `src/middleware.js:31-32`, and
  `htmlLimitedBots` in `next.config.mjs:52-53`.
- **`/lp/{slug}` is in the sitemap but linked from nowhere**, so it trips the orphan check the moment a
  `landing_pages` row goes indexable.
- **`offers.created_at` is not a booking signal.** Every row was created 11–74 days before its
  departure because the site was built in July 2026 — deriving "typical booking lead time" from it
  would invent a fact. That block is authored (`month_pages.lead_time_*`).
- **The `redirects` table holds six rows the old rollup cron wrote** (July 2026 departures →
  `/omra-juillet`, which is noindex). The middleware now swaps a noindex month-lander target for
  `/bab-makka`; the rows are harmless but can be deleted from the admin.

---

# Part II — The rulebook (unchanged)

## Brand & naming
- Canonical name: **"Bab Makka"** (no h) — matches the domain, Google Business
  Profile, press and reviews. Users see "Bab Makka" everywhere.
- **"Bab Makkah" (with h) is `alternateName` ONLY** — it may appear in schema
  `alternateName`, never as the visible/primary name. `BRAND.alternates` holds
  the variants; `BRAND.service` / `BRAND.lockup` hold the canonical forms.
- Organization = **Wiki Tours International** (the entity). "Bab Makka by Wiki
  Tours International" is the **Brand** applied to the Omra hub + package pages.
- Never present Bab Makka as independent of Wiki Tours (BRAND LAW).

## Business data — never invent
- NAP (name/address/phone), licence, ratings, geo, socials, press URL all live
  in the **`settings` DB table**, edited in admin (`/admin/reglages`). There is
  **no `config/business.js`** and must not be — the DB is the single source.
- All JSON-LD is **server-rendered from DB values**, emitted only when present
  (LAW §10). Empty ⇒ the field is omitted, never a placeholder.
- Never fabricate prices, testimonials, seat counts, dates, or city claims.
  Missing factual copy is marked `[CONTENT NEEDED]`; missing translations
  `[TRANSLATION NEEDED]`. Neither is ever shipped as visible text — gate the
  page `noindex` (or omit the block) until the real value exists.
- `criticalSettingsHealth()` (`src/lib/seo/health.js`) surfaces empty critical
  settings: admin banner, a prod log, and `GET /api/health/seo`.
- **One business entity.** `OrgJsonLd` (`TravelAgency` `#organization`) is the
  only node carrying NAP / geo / hours / `hasMap`; its `url` is locale-invariant.
  Never add a second `LocalBusiness` for the office — it split one premises
  into per-locale entities. Pages about the office use `WebPage.mainEntity →
  #organization`. `Product.brand` references the stable `#brand` node by `@id`.
  Schema `PostalAddress` comes from `postalAddress()` (FR source, locale-neutral)
  and `telephone` from `toE164()` — never the raw admin string.
- **`gbp_rating` / `gbp_review_count` are for VISIBLE content and llms.txt only.**
  Never re-attach `aggregateRating` to the Organization / TravelAgency /
  LocalBusiness node: Google treats a rating a business publishes about itself as
  self-serving, which is ineligible for star snippets AND a documented
  "spammy structured markup" manual-action trigger that can strip rich results
  site-wide. `Product` / `TouristTrip` carries none either (owner decision
  2026-09-13, hard constraint 6): the per-offer block in `omra/[slug]/page.js`
  was removed — it had never fired, no testimonial carries an `offer_id`.

## Blog automation — GENERATE-AHEAD, RENDER-LIVE, PUBLISH-BY-TIME (2026-09-14)
- **All prose is written ahead of time in Claude Code sessions** following
  `content/ARTICLE-BRIEF.md` → `content/articles/*.json` → `scripts/ingest-articles.mjs`
  at `prebuild`. **No runtime model call exists**: `/api/cron/draft-article` is a
  410 stub with no cron entry. Map + decisions: `docs/content-system.md`.
- **Volatile facts are never in prose.** Prices, departures, dates, seats, hotel
  lists, the deposit policy, review quotes, Hijri countdowns and CTAs render at
  request time through placeholder tags (`src/lib/content-tags.js` →
  `src/components/content/ArticleBody.jsx`): `<CommercialCTA to>`, `<LiveDepartures>`,
  `<ReviewQuote id>`, `<HijriCountdown event>`, `<DepositPolicy>`, `<HotelList city>`.
  Stable facts come from `data/allowed-facts.json` (`npm run content:facts`), each
  with a source and a date.
- **The strict gate fails** any year (except « depuis 2016 »), amount, departure
  date or seat count in a title / excerpt / description / body; an unknown tag; a
  `ReviewQuote` of an unpublished testimonial; a Levantine month name or a Latin
  city name in the Arabic body; a `query_family` that is a lander's query. A
  failing file is **skipped and logged** (build log + `article_plan.notes`), never
  inserted — cadence is a ceiling. Existing rows are never re-gated.
- **Publish = `published_at` has passed**: the anon RLS policy
  (`is_published and published_at <= now()`) IS the brief's
  `status='scheduled' AND publish_at <= now()`. The ingest assigns the next free
  08:00 **Africa/Casablanca** slot (`nextMorningSlot`, zone-aware — Ramadan's
  UTC+0 included). ISR ≤ 3600 on the article page, the sitemap and llms.txt makes
  the 07:00 `publish-articles` cron an accelerator only (IndexNow + runway
  e-mails), not the publishing mechanism.
- Author: the `team_members` row `yahya-houssini` (`articles.author_id`), no
  reviewer ever. Never write his bio, years or credentials (constraint 9).
- Hijri: `src/lib/hijri.js` (`@umalqura/core`) → `public.hijri_events`
  (migration 025, `npm run content:hijri`), always rendered with the
  moon-sighting caveat. **Never loosen the gate to raise the publish rate** —
  LAW §10 and Google's scaled-content policy are why it exists.
- Every article carries `supports_path` (its owner page) so that page lists it
  under « Pour aller plus loin » (`RelatedArticles`): the internal-linking loop
  runs both ways — article → hub (gate-enforced) and hub → article.
- Every new topic is declared in `docs/keyword-map.md` (AI-drafted backlog)
  before it is added to the plan.
- **Cost rule (owner, 2026-09-07): $0.** The default content engine is the
  weekly cloud routine on the owner's subscription: `content/ARTICLE-BRIEF.md`
  → `content/articles/*.json` → `scripts/ingest-articles.mjs` at build
  (`prebuild`), grounded on the public `/api/content/facts`. The API drafter is
  dormant without `ANTHROPIC_API_KEY`; do not set that key or add any paid
  service without an explicit decision. Both engines share ONE gate:
  `src/lib/server/article-gate.mjs`, which must stay free of `@/` imports so
  plain Node can run it at build time.

## Admin access — a session is NOT authorization
- `ADMIN_EMAILS` (env, comma-separated) is the allowlist. `src/lib/admin/authz.js`
  is the single authority; every server action, `/api/admin/*` route and the
  `(protected)` layout checks it against the **server-verified** session email.
  It **fails closed** — unset ⇒ nobody gets in.
- The same list must exist in the DB as `public.admin_allowlist` (migration 017),
  because RLS is what stops a self-registered account calling PostgREST directly
  with its own token. `authenticated` alone must never mean admin again.
- Keep env and table in sync. Seed the table BEFORE applying 017 — the migration
  aborts on an empty allowlist rather than locking every admin write.

## URLs, redirects, offers lifecycle
- **Offer dates are data, never URLs; expired offers are updated or redirected,
  never deleted.** (no deletions, no 404s.)
- Hubs are the **permanent SEO layer** and carry evergreen URLs — the year lives
  in the H1/title/content, never the path (`/omra-ramadan`, `/omra-{month}`,
  `/omra-pas-cher`, `/hotels-omra`). Dates in **hub** URLs are forbidden.
- Per-departure **offer** pages are ephemeral by design: they 301 to their month
  hub after expiry (see below), so date-based offer slugs are tolerated there.
- **Never delete or rename a public URL without adding its 301** — static ones in
  `src/lib/redirects/legacy-map.js`, content moves in the admin `redirects` table.
- One offer = one departure (current model). Every offer page must link its
  month hub + relevant seasonal hub; hubs live in main nav + internal linking.
  A multi-departure packages model is a future phase (offer URLs 301 in then).
- **Departure lifecycle (2026-09-13) derives from the RETURN date, never a flag
  or a cron** — `offerLifecycle()` in `src/lib/offers.js`, tested in
  `tests/offers.test.mjs`:
  `live` (future or in progress) → index, follow, self-canonical, in the sitemap;
  `archived` (returned 1–90 days ago) → 200, `noindex, follow`, self-canonical,
  localised banner to the month lander; `retired` (> 90 days) → **301** to
  `/{locale}/omra-{mois}` from the middleware (page body 308 backstop), or to
  `/bab-makka` when that lander is noindex (logged). An unpublished departure
  that has left 301s the same way, so no expired URL ever 404s. RLS no longer
  hides the past (migration 023): a published departure stays readable forever,
  and the month landers build their historic blocks from those rows. The
  `redirects` table is for admin content moves only; the rollup cron no longer
  writes expiry rows. **Never unpublish a departed offer to hide it** — that is
  what used to 404; let it archive.
- **Month landers are evergreen (2026-09-13).** The year in title/H1/copy/links
  is `targetYearFor(monthIndex)` — calendar rollover (a month earlier than the
  current one is next year's) unless a published departure names a later year —
  so `/omra-janvier` in September 2026 says *janvier 2027*. `OMRA_YEAR` is gone;
  `tests/months.test.mjs` proves the month and year boundaries. Indexability is
  ONE predicate, `monthLanderIndexable()`: a departure this cycle, OR the
  authored `month_pages` blocks (weather + suits, fr AND ar, toggle on) — never a
  `never_sold` month. The page body: departures → prices observed (real past
  departures) → last season's pattern → Hijri overlap (computed) → weather &
  crowds, who it suits, when to book (authored) → month FAQ (`faqs` category
  `mois-{slug}`) → the notification form LAST. A block with no data is omitted.
  "Typical booking lead time" is **authored**, not derived: `offers.created_at`
  reflects the July 2026 site build-out, not booking behaviour.

## Schema availability (compute from data, not the raw status)
`SoldOut` if `status==='full'` OR `seats_remaining===0` OR `date_end < today`;
`LimitedAvailability` if `status==='few_left'` or low seats; else `InStock`.
`seats_remaining` (nullable) overrides the enum when set. Emit
`validFrom` / `validThrough` on every Offer; show real "X places restantes"
ONLY when `seats_remaining` is set — never a countdown or urgency copy not in
the DB.

## Titles
- Public titles use `{ absolute: … }` (bypasses the `%s — Wiki Tours International`
  template, which otherwise blows past 60 chars).
- **Brand suffix is idempotent:** build titles with `withBrand()` (`lib/titles.js`)
  — it appends `| Bab Makka` only if the title has no brand token yet (any
  spelling/script incl. "Makkah"/Arabic). Never hardcode the suffix on an admin
  `seo_title`; that's how "… | Bab Makka | Bab Makka" doubling happens.
- Clamp descriptions with `clampDesc()` (`lib/seo.js`) → ≤155 at a word boundary.

## On-page limits
- `<title>` `titleFloor(locale)`–60 chars (30, Arabic 20 — denser script), never duplicated
  across routes; `<meta name=description>` 120–155, ending on a sentence (the composer pads
  a short one with the shared trust clauses, never truncates); exactly one `<h1>`;
  canonical + hreflang (fr/ar/en + x-default) on every public page. `scripts/seo-suite.mjs`
  fails the build on each of these.
- FAQ answers: 40–60 words, direct answer first. Answer-first lede under H1,
  marked `data-answer` for `speakable`.
- **fr / ar / en parity** for every user-facing string. Arabic pages: `dir="rtl"`.

## Keyword ownership & original-data pages
- **Every new public page declares its keyword owner in `docs/keyword-map.md`
  before merge** — one query family, one owning page. Answering an
  already-owned question on a second page is cannibalization (audit FAIL).
- **Original-data pages (`/barometre-prix-omra`, and any future stats page)
  render ONLY from real DB rows** — a period/figure below its minimum sample
  (≥3 offers) is dropped, never extrapolated; the page is noindex while empty.
- Scaffolded surfaces (`/guide-omra*`, `/glossaire-omra`, `/omra-depuis-*`)
  follow the **noindex-until-filled guard**: they index only when the admin
  content exists (fr+ar) AND the admin toggle is on; their empty states carry
  `data-guard="empty"`, which the audit cross-checks against indexability.

## Before shipping any SEO change
Run the gate against a running build:
```
npm run build && npm start &   # then, once up:
npm run seo:audit              # BASE_URL defaults to http://localhost:3000
```
It fails (exit 1) on: missing title/description/H1/canonical/JSON-LD, title>60,
offer pages missing Offer schema or an FAQ block, or a **stale offer** (bookable
with a past `validThrough`, or an Offer missing `validThrough`).

Against production: `BASE_URL=https://wikitours.ma npm run seo:audit`
(246/246 green on 2026-09-09). Locally, use the isolated build so a running dev
server is never clobbered: `NEXT_DIST_DIR=.next-audit npm run build`.

**Every SEO rule is gated at build time.** `npm run build` ends with `postbuild → npm run
seo:suite && npm test` (same on Vercel and in CI, both run `npm run build`).
`scripts/seo-suite.mjs` reads EVERY prerendered page and the prerendered sitemap — no
server, no DB, ~2 s — and exits 1 on: a title outside `titleFloor(locale)`–65 or duplicated
across routes, or carrying a year before this one; a description outside 120–155 or ending
in an ellipsis / without terminal punctuation; a canonical that is not self-referencing; an
hreflang set that is not exactly fr / ar / en / x-default, a region-coded one, a target that
is not a built 200 page or does not list the page back; an indexable page missing from the
sitemap, a noindex or redirecting or non-200 URL in it, a URL without `<lastmod>`; an
internal link into a redirect (dated month hub, legacy path, missing locale, trailing
slash, www) or a 404; a header/footer link to a noindex page; an indexable page with < 2
inbound links; a Latin-script city name on `/ar`; a French sentence on `/ar` or `/en`
(the `pickLang()` fallback — reviews excepted); a page type whose `<main>` is a JS shell.
A title is also failed when a brand token appears twice (the layout's `%s — Wiki Tours
International` template on a plain-string title) or when an Arabic title carries a Latin
brand; a canonical must sit on `NEXT_PUBLIC_SITE_URL` (https in production) with no query
or fragment; an inbound link only counts from a DIFFERENT page (the header's language
switcher links every page from its own siblings); a block byte-identical to the `/fr` page
that carries a French stopword is a `pickLang()` fallback however short.
`npm run seo:suite -- --self-test` reintroduces every one of those defects in memory (41
mutations) and proves each is caught with its specific message; it then runs the schema
gate's own self-test. `BASE_URL=https://wikitours.ma npm run seo:suite` runs the same
assertions against a live server. `scripts/README.md` says how to add a page type.

**Structured data** is the suite's SCHEMA step: `scripts/schema-audit.mjs` reads the
prerendered HTML for a representative page of
every page type in every locale and exits 1 on: invalid JSON-LD or a non-schema.org
`@context`; an `@type` or property unknown to schema.org, or a property outside its
type (`scripts/schema-vocab.json`, refresh with `--update-vocab`); a missing required
field per type (Offer bare-number price + `MAD` + availability enum + `validThrough` +
`seller`, TravelAgency licence + address + `sameAs`, FAQPage ≥1 Question, BreadcrumbList
positions 1..n, …); an `@id` referenced but not defined on the same page (or ≠1
`#organization` / `#website`); copy in the wrong language for the page; **any**
`aggregateRating`; markup content absent from the rendered page; a page type missing
its node types. `npm run schema:audit` runs it on demand — `--all` (every prerendered
page), `--only=/fr/hotel/anjum`, `--inventory`, and `--self-test`, which mutates real
pages in memory (22 deliberate breakages) and proves each is caught with its specific
message. Run `--self-test` after editing the gate. Legal pages that 404 (no admin row)
are skipped, not audited. `npm test` (node:test, `tests/`) runs right after it in the
same `postbuild`: month rollover boundaries, the departure lifecycle transitions, the
author-profile rules.

## Migrations
Numbered SQL in `supabase/migrations/`. Apply in order on staging, run
`npm run seo:audit` green, then production. `supabase/schema.sql` is the
canonical full schema and must be kept in sync with each migration.

---

## SEO baseline as of 2026-09-09

Observed against **production** (`https://wikitours.ma`), read-only. Head tags and
robots.txt are the *rendered* bytes, not the source template. Structured-data rows
are from source. Re-verify before trusting after any deploy.

> **Superseded on 2026-09-09, after this snapshot was taken.** Four rows below
> record defects that have since been fixed in the same session:
> - The 24 city titles/descriptions were rewritten from authored templates
>   (`src/lib/city-seo.js`). `/fr/omra-depuis-casablanca` is now
>   `Omra depuis Casablanca 2026 — Départ Mohammed V | Bab Makka` (59), and no
>   city description ends in an ellipsis — all 24 previously did.
> - `/ar/omra-depuis-casablanca` is now `عمرة من الدار البيضاء 2026 — مطار محمد الخامس | باب مكة`.
> - The Arabic footer no longer renders Latin city names, and `Omra Ramadan`
>   is now `عمرة رمضان` (`pages.ramadanShort`).
> - `/fr/agence-omra-casablanca` is now in the footer on every page.
>
> Everything else in this section — robots.txt, the structured-data inventory,
> the hreflang and canonical findings — still holds.

### Structured data — how it is built

No `next-seo`, no `schema-dts`, no library of any kind. Every node is a hand-built
plain object rendered by one component, `src/components/site/JsonLd.jsx`, which emits
`<script type="application/ld+json">` and escapes `<`. That file is the **only**
`application/ld+json` in the repo.

`src/components/site/OrgJsonLd.jsx` is mounted once in `src/app/[locale]/layout.js:110`,
so the `TravelAgency` node ships on **every** public page.

| `@type` | Routes | Fields populated |
|---|---|---|
| `TravelAgency` (`@id` `#organization`) | every public page (via layout) | `name`, `alternateName`, locale-invariant `url`, `logo`/`image`, `description`, `telephone` (E.164), `email`, `address` → `PostalAddress`, `geo` → `GeoCoordinates`, `openingHoursSpecification`, `hasMap`, `contactPoint` (24/7 WhatsApp), `brand` → `#brand`, `hasCredential` → `EducationalOccupationalCredential` + `GovernmentOrganization`, `areaServed` → `Country` + 8 `City`, `priceRange`, `currenciesAccepted`, `knowsLanguage`, `sameAs`. **No `aggregateRating`, deliberate.** |
| `WebSite` (`#website`) | `/` | `url`, `name`, `inLanguage`, `publisher` → `#organization` |
| `WebPage` + `SpeakableSpecification` | `/`, `/bab-makka`, `/omra-pas-cher`, `/hotels-omra`, `/contact`, `/agence-omra-casablanca`, `/presse`, `/glossaire-omra`, `/barometre-prix-omra`, `/guide-omra(/*)`, all `[flat]` hubs | `name`, `description`, `url`, `inLanguage`, `isPartOf` → `#website`, `speakable.cssSelector: ['h1','[data-answer]']` |
| `FAQPage` | `/`, `/agence-omra-casablanca`, `/omra-depuis-{city}`, `/omra-{occasion}`, `/omra-pas-cher`, `/hotel/[slug]`, `/guide-omra(/*)` | `mainEntity[]` → `Question` + `acceptedAnswer` → `Answer` |
| `BreadcrumbList` | `/omra/[slug]`, `/hotel/[slug]`, `/blog/[slug]`, all `[flat]` hubs, `/barometre-prix-omra`, `/glossaire-omra`, `/presse`, `/guide-omra(/*)`, `/omra-pas-cher`, `/hotels-omra`, `/voyage/[slug]` | `itemListElement[]` → `ListItem` (`position`, `name`, `item`) |
| `['Product','TouristTrip']` | `/omra/[slug]` | `name`, `description`, `image`, `brand` → `#brand`, `offers` → `AggregateOffer` (`lowPrice`, `highPrice`, `offerCount`, `priceCurrency`) or `Offer` (`price`), each with `availability`, `validFrom`, `validThrough`, `priceValidUntil`, `availabilityEnds`, `seller` → `#organization`; `@id` (FR URL + `#trip`); `departureTime` / `arrivalTime` (the Trip properties — `startDate`/`endDate`/`dateModified` are not defined on Product or Trip and the gate rejects them); `additionalProperty` → `PropertyValue` (duration DAY, nights, airline, distance to Haram as `value` or `minValue`/`maxValue` in MTR, room types); `itinerary` → full `Hotel` nodes via `hotelNode()`. **No `aggregateRating` / `review` (2026-09-13).** |
| `['Product','TouristTrip']`, or plain `TouristTrip` when nothing is bookable | `/voyage/[slug]` | `Offer` (with `seller`) only when price **and** `date_start` both exist; without it the node is a `TouristTrip` alone — a `Product` with no offers is a Rich Results error |
| `Hotel` | `/hotel/[slug]`, nested in the `/hotels-omra` `ItemList`, and in each `/omra/[slug]` `itinerary` — all through `hotelNode()` | `@id` (FR URL + `#hotel`), `name`, `url`, `address` → `PostalAddress` (`streetAddress` / `postalCode` parsed from `address_en`, locality from `city`), `geo` only when both coordinates exist (migration 022), `starRating` → `Rating`, `amenityFeature` → `LocationFeatureSpecification` (distance as `value` + `unitCode: MTR`, breakfast). The hotel page also emits an `ItemList` of `TouristTrip` (the departure's `@id`, `itinerary` → this hotel's `@id`) — the reverse edge |
| `ItemList` / `ListItem` | `/bab-makka`, `/hotels-omra`, `/voyages`, `/avis`, `/omra-pas-cher` | `itemListElement`, `itemListOrder`, `numberOfItems` |
| `BlogPosting` | `/blog/[slug]` | `headline`, `description`, `image`, `inLanguage`, `mainEntityOfPage`, `author` → `Person`, `reviewedBy` → `Person`, `datePublished`, `dateModified`, `publisher` → `#organization`, `speakable` |
| `Article` | `/guide-omra`, `/guide-omra/[slug]` | `headline`, `author` → `Person` (+`sameAs`), only when a body exists |
| `DefinedTermSet` / `DefinedTerm` | `/glossaire-omra` | `name`, `description` per term |
| `Dataset` | `/barometre-prix-omra` | the price-barometer periods |
| `Review` / `Rating` / `Person` | `/avis` (`itemReviewed` → `#organization`) | `reviewRating`, `author`, `reviewBody` |
| `VideoObject` | `/avis` | one per uploaded reel that has a poster **and** a date — `thumbnailUrl` + `uploadDate` are Google-required, so an incomplete reel emits nothing (none qualifies today); `name` = caption or H1, `description` from the dictionary |
| `Person` (`@id` = FR `/equipe` URL + `#slug`) | `/equipe`, `/a-propos`, and embedded as `BlogPosting.author` / `reviewedBy` on `/blog/[slug]` — all through `personNode()` | name in the page's script (`name_ar` on /ar, `alternateName` for the other scripts), `jobTitle`, `description` (bio), `knowsLanguage`, `image`, `hasCredential`, `sameAs`, `worksFor` → `#organization`. Only renderable profiles (published, not `is_placeholder`, with a slug and a bio — `src/lib/authors.js`). An article signed with the agency's name has `author` → `#organization`; a placeholder never renders, and any `[À COMPLÉTER]` / `[PLACEHOLDER]` / `[CONTENT NEEDED]` / `[TRANSLATION NEEDED]` text on a page fails the gate |
| *(none beyond the sitewide node)* | `/blog`, `/hajj`, `/agrement`, `/lp/[slug]`, the 3 legal routes, 404 | — |

### robots.txt — exact served contents

Generated by `src/app/robots.js` (static, no DB input). Ten user-agent groups, all
carrying identical rules.

```
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: GPTBot
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: OAI-SearchBot
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: ChatGPT-User
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: ClaudeBot
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: Claude-Web
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: Google-Extended
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /api/

User-Agent: CCBot
Allow: /
Disallow: /admin
Disallow: /api/

Host: https://wikitours.ma
Sitemap: https://wikitours.ma/sitemap.xml
```

- **Sitemap directive** → yes, `https://wikitours.ma/sitemap.xml`.
- **`/_next/` disallowed** → **no**. The string `_next` does not appear at all, so CSS, JS and optimised images stay crawlable. Keep it that way.
- **Disallowed AI/search agents** → **none.** GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, CCBot each have their own `Allow: /` group. Claude-SearchBot, Claude-User, Perplexity-User, meta-externalagent, Bytespider and Applebot-Extended have **no** group and therefore fall under `*`, which also allows them.
- Trap: under robots.txt group precedence a UA with its own group ignores `*` entirely. Add new rules to the shared `disallow` array in `src/app/robots.js:9`.

### Rendered head, ten sampled routes

| Route | `<title>` (len) | Description len | Canonical | Robots |
|---|---|---|---|---|
| `/fr` | `Omra 2026 depuis le Maroc \| Bab Makka` (37) | 152 | `…/fr` | — indexable |
| `/ar` | `عمرة 2026 من المغرب — باب مكة من ويكي تورز` (42) | 142 | `…/ar` | — indexable |
| `/en` | `Umrah 2026 from Morocco \| Bab Makka` (35) | 150 | `…/en` | — indexable |
| `/fr/bab-makka` | `Bab Makka — Omra depuis le Maroc : programmes & prix` (52) | 44 | `…/fr/bab-makka` | — indexable |
| `/fr/agence-omra-casablanca` | `Agence Omra à Casablanca — Wiki Tours International` (51) | 147 | `…/fr/agence-omra-casablanca` | — indexable |
| `/fr/omra-depuis-casablanca` | `Omra depuis Casablanca` (22) | 152 | `…/fr/omra-depuis-casablanca` | — indexable |
| `/fr/omra-octobre` | `Omra octobre 2026 depuis le Maroc \| Bab Makka` (45) | 103 | `…/fr/omra-octobre` | — indexable |
| `/fr/omra-janvier` | `Omra janvier 2026 depuis le Maroc \| Bab Makka` (45) | 103 | `…/fr/omra-janvier` | **noindex, follow** |
| `/fr/barometre-prix-omra` | `Baromètre des prix Omra \| Bab Makka` (35) | 124 | `…/fr/barometre-prix-omra` | **noindex, follow** |
| `/ar/omra-depuis-casablanca` | `عمرة انطلاقاً من Casablanca` (27) | 151 | `…/ar/omra-depuis-casablanca` | — indexable |

Every one of the ten emits **four** page-level hreflang links — `fr`, `ar`, `en` and
`x-default` → the `fr` URL — and every canonical is self-referential per locale.
All titles ≤ 60, all descriptions ≤ 155.

### External-crawl claims, checked

| Claim | Verdict | Evidence |
|---|---|---|
| `/fr/omra-depuis-casablanca` title is exactly `Omra depuis Casablanca`, 22 chars | **Confirmed** | rendered `<title>`, length 22 |
| `/fr/omra-janvier` is `noindex, follow` with title `Omra janvier 2026 depuis le Maroc \| Bab Makka` | **Confirmed** (both) | rendered head; trigger is `src/app/[locale]/[flat]/page.js:101` — no published offer in that month of `OMRA_YEAR` |
| `/fr/agence-omra-casablanca` is in neither the header nor the footer | **Was confirmed — since FIXED** | At audit time: zero `href="/fr/agence-omra-casablanca"` on `/fr` and `/fr/bab-makka`, one on its own page. It now leads the footer hub row (`src/components/site/SiteFooter.jsx`) in all three locales, so it is 1 click from every page, plus contextual links from the home story section, `/agrement`, `/contact` and `/a-propos`. Still absent from the **header** (`src/components/SiteHeader.jsx:19-34`) |
| Arabic footer renders `عمرة انطلاقاً من Casablanca` with a Latin city name | **Confirmed** | present in the rendered `/ar`; all 8 cities render Latin. Cause: `CITY_SLUGS` in `src/lib/months.js:47-56` is one French label filling a translated `{city}` template |
| Arabic footer renders `Omra Ramadan` untranslated | **Confirmed** | present in the rendered `/ar`; hardcoded at `src/components/site/SiteFooter.jsx:134` while every neighbouring link uses a `t.*` key |
| The sitemap carries no `hreflang="x-default"` | **Confirmed** | 0 occurrences across 246 `<url>` entries, 738 `xhtml:link`. **Intentional** — `sitemapAlternates()` (`src/lib/seo.js:74`) is deliberately narrower than the page-level `hreflangAlternates()` (`src/lib/seo.js:63`), which does emit `x-default` |
| No `FAQPage`, `TravelAgency`, `Product` or `BreadcrumbList` JSON-LD anywhere | **Refuted — all four are emitted** | `TravelAgency` on every page (`OrgJsonLd.jsx:64`); `FAQPage` at `page.js:117`, `[flat]/page.js:248`, `hotel/[slug]/page.js:116`, `GuideSection.jsx:74`, `SeasonalHub.jsx:54`, `agence-omra-casablanca/page.js:90`; `Product` at `omra/[slug]/page.js:278` and `voyage/[slug]/page.js:88`; `BreadcrumbList` at `BreadcrumbTrail.jsx:18`, `blog/[slug]/page.js:75`, `hotel/[slug]/page.js:127`, `omra/[slug]/page.js:338` |

### Counts behind the baseline

| Entity | Live | Note |
|---|---|---|
| Sitemap URLs | 246 | 82 unique paths × 3 locales |
| Blog articles | 27 live | 36 rows; 9 scheduled ahead, runway to 2026-10-22 |
| Hotels | 8 published | `city` is `'makkah'` on all 8 rows while Jayden Medina Hotel and Makarem Madinah are Madinah properties (their own `address_*` say Madinah; tiers reference them only as `hotel_madinah_id`). Corrected by the data section of migration 022 / the bundle — until applied, the admin's "Hôtel Médine" dropdown (`relFilter city='madinah'`) is empty and their schema locality reads Makkah |
| City pages | 8, all indexable | |
| Month hubs | 12 routes, 3 indexable | September / October / November have a departure this cycle; the other nine index once their authored `month_pages` blocks exist in fr + ar (2026-09-13: none written yet, and no month has public history — every derived block is empty until departures accumulate) |
| Offers | 4 live departures (2026-09-13) | Sept ×1 (23 → 7 Oct), Oct ×2, Nov ×1; `omra-9-au-23-septembre-2026` departed and was **unpublished** — it 301s via the lifecycle rule |
| Guide pages | 7 rows | 1 pillar + **6** children |
| Glossary terms | 42 | |
