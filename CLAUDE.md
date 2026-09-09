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
10. `npm run seo:audit` is the gate — it crawls the live sitemap and fails the build on any regression.

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

> ⚠️ **Constraint 6 conflicts with shipped code — do not "fix" either side without a decision.**
> `src/app/[locale]/omra/[slug]/page.js:258-345` emits `AggregateRating` **and** `Review` on the
> `['Product','TouristTrip']` node, and Part II below explicitly sanctions it ("the per-offer
> `aggregateRating` in `omra/[slug]/page.js` is legitimate and stays"). Both statements agree that
> the rating must **never** sit on the Organization / TravelAgency / LocalBusiness node — that part
> is settled and is enforced in `src/components/site/OrgJsonLd.jsx`. What is unsettled is the
> per-offer node. Raise it before changing it. (The review **count** also differs: the constraint says
> 139, `settings.gbp_review_count` is **129**.)

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
| `/{locale}/a-propos` | `src/app/[locale]/a-propos/page.js` | About + team `Person` nodes |
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
| expired offer | `/{locale}/omra-{mois}` | 301 | `redirects` table, written by `src/app/api/cron/rollup/route.js:14-37` |

`next.config.mjs` has **no** `redirects()` or `rewrites()`. All of it is middleware.

## Where to change X

| Concern | File |
|---|---|
| **Routing** | |
| Locale list, fallback, `dir` | `src/lib/i18n.js` |
| All redirects, rewrites, locale detection, admin host, bot logging | `src/middleware.js` |
| Static legacy renames | `src/lib/redirects/legacy-map.js` |
| Content moves (admin-editable) | `redirects` DB table → `src/lib/edge-data.js:70` |
| Month slugs, `OMRA_YEAR`, city whitelist, `cityPageIndexable()` | `src/lib/months.js` |
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
| Public read helpers (anon client, RLS applies) | `src/lib/data/content.js` |
| Settings | `src/lib/data/settings.js` |
| Offer availability + status (single source) | `src/lib/offers.js` |
| Barometer aggregation, shared by page and sitemap | `src/lib/barometer.js` |
| The one Organization node | `src/components/site/OrgJsonLd.jsx` |
| JSON-LD renderer | `src/components/site/JsonLd.jsx` |
| **Blog automation** | |
| Quality gate, shared by both engines (no `@/` imports) | `src/lib/server/article-gate.mjs` |
| Weekly writing contract | `content/ARTICLE-BRIEF.md` |
| Build-time ingest (`prebuild`) | `scripts/ingest-articles.mjs` |
| Public grounding facts | `src/app/api/content/facts/route.js` |
| Daily release cron | `src/app/api/cron/publish-articles/route.js` |
| **Admin** | |
| Authorization (single authority, fails closed) | `src/lib/admin/authz.js` |
| Entity/field registry | `src/lib/admin/registry.js` |
| **Gate** | |
| SEO audit (crawls the live sitemap) | `scripts/seo-audit.js` |

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

**Logical CSS properties, not RTL overrides.** `ms-*` / `me-*` / `ps-*` / `pe-*` / `text-start` / `text-end`.
There is no `tailwind.config.js` (Tailwind v4) and no RTL plugin.

## Traps this repo has already fallen into

- **`pickLang()` silently falls back to French.** An unfilled `_ar` column renders French text on the
  Arabic page, and nothing in the code shows it. This is the largest source of untranslated output.
- **City names are one French string on all three locales.** `CITY_SLUGS` maps slug → a French label that
  fills a translated `{city}` template, so `/ar/omra-depuis-fes` renders `عمرة انطلاقاً من Fès` and the
  English page says `Fès`, not `Fez`. There is no `name_*` column in `city_pages` and no locale-keyed
  table anywhere. The correct model already exists next door: `hotels.city` is a `makkah|madinah` enum
  mapped through `t.offer.makkah` / `t.offer.madinah`.
- **The month-hub meta description is hardcoded French** (`src/app/[locale]/[flat]/page.js:99`) while the
  title beside it is localized — the head is half-translated.
- **`withBrand()` only guards `{absolute:…}` titles.** Plain-string titles get the template suffix
  unconditionally, so `/hajj` renders "Hajj avec Wiki Tours — Wiki Tours International".
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
  site-wide. `Product` / `TouristTrip` is the sanctioned exception — the per-offer
  `aggregateRating` in `omra/[slug]/page.js` is legitimate and stays.
  *(See the hard-constraint conflict flagged in Part I before touching this.)*

## Blog automation — the AI drafts, the GATE publishes
- `api/cron/draft-article` (04:00 UTC) writes ONE trilingual article a day from
  the admin's `article_plan` (Plan éditorial), grounded only in a fact sheet of
  published DB rows; `api/cron/publish-articles` (07:00 UTC) releases whatever
  is due that morning. **Owner decision (2026-09-04): no daily human action.**
  The drafter publishes ITSELF only when ALL hold — `settings.blog_autopublish`
  on, `settings.blog_author_name` set (E-E-A-T needs a real person), the gate
  reports zero problems, and no unsourced-price / external-link / missing-
  owner-link flag (`publishDecision()` in `lib/server/article-drafter.js`).
  Anything less ⇒ unpublished draft + review e-mail. **Never loosen the gate to
  raise the publish rate** — LAW §10 and Google's scaled-content policy are why
  it exists; the gate is what stands in for the human.
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
- Expiry: RLS keeps offers readable for 60 days past `date_end` (grace state
  "Départ effectué — prochains départs"); the cron 301s to the `/omra-{month}`
  hub (fallback `/omra`) after that.

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
- `<title>` ≤ 60 chars, `<meta name=description>` ≤ 155, exactly one `<h1>`,
  canonical + hreflang (fr/ar/en + x-default) on every public page.
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

## Migrations
Numbered SQL in `supabase/migrations/`. Apply in order on staging, run
`npm run seo:audit` green, then production. `supabase/schema.sql` is the
canonical full schema and must be kept in sync with each migration.

---

## SEO baseline as of 2026-09-09

Observed against **production** (`https://wikitours.ma`), read-only. Head tags and
robots.txt are the *rendered* bytes, not the source template. Structured-data rows
are from source. Re-verify before trusting after any deploy.

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
| `['Product','TouristTrip']` | `/omra/[slug]` | `name`, `description`, `image`, `brand` → `#brand`, `offers` → `AggregateOffer` (`lowPrice`, `highPrice`, `offerCount`, `priceCurrency`) or `Offer` (`price`), each with `availability`, `validFrom`, `validThrough`, `priceValidUntil`, `availabilityEnds`; plus `aggregateRating` → `AggregateRating` and `review[]` → `Review`/`Rating`/`Person` |
| `['Product','TouristTrip']` | `/voyage/[slug]` | as above minus ratings; `Offer` emitted only when price **and** `date_start` both exist |
| `Hotel` | `/hotel/[slug]`, and nested in the `/hotels-omra` `ItemList` | `name`, `address` → `PostalAddress`, `starRating` → `Rating`, `amenityFeature` → `LocationFeatureSpecification` (distance to Haram, breakfast) |
| `ItemList` / `ListItem` | `/bab-makka`, `/hotels-omra`, `/voyages`, `/avis`, `/omra-pas-cher` | `itemListElement`, `itemListOrder`, `numberOfItems` |
| `BlogPosting` | `/blog/[slug]` | `headline`, `description`, `image`, `inLanguage`, `mainEntityOfPage`, `author` → `Person`, `reviewedBy` → `Person`, `datePublished`, `dateModified`, `publisher` → `#organization`, `speakable` |
| `Article` | `/guide-omra`, `/guide-omra/[slug]` | `headline`, `author` → `Person` (+`sameAs`), only when a body exists |
| `DefinedTermSet` / `DefinedTerm` | `/glossaire-omra` | `name`, `description` per term |
| `Dataset` | `/barometre-prix-omra` | the price-barometer periods |
| `Review` / `Rating` / `Person` | `/avis` (`itemReviewed` → `#organization`), `/omra/[slug]` | `reviewRating`, `author`, `reviewBody` |
| `VideoObject` | `/avis` | one per uploaded reel |
| `Person` | `/a-propos` | one per published team member, `worksFor` → `#organization` |
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
| Hotels | 8 published | all rows carry `city = 'makkah'` — two are Madinah properties by name |
| City pages | 8, all indexable | |
| Month hubs | 12 routes, 3 indexable | only September / October / November have a 2026 departure |
| Offers | 5 live departures | Sept ×2, Oct ×2, Nov ×1 |
| Guide pages | 7 rows | 1 pillar + **6** children |
| Glossary terms | 42 | |
