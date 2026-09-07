# CLAUDE.md — project rules (read before any SEO / content / schema change)

Wiki Tours International — Omra/Hajj agency, Casablanca. Next.js 15 App Router,
Supabase, plain JS. Public site is fr / ar / en. See also `docs/PROJECT-LAWS.md`
(the 10 project laws that `LAW §n` comments cite) and `AUDIT-REPORT.md` /
`FIX-PLAN.md`. Where a law and this file disagree, **this file wins** — it
records the later decisions.

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

## Migrations
Numbered SQL in `supabase/migrations/`. Apply in order on staging, run
`npm run seo:audit` green, then production. `supabase/schema.sql` is the
canonical full schema and must be kept in sync with each migration.
