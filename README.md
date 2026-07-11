# Wiki Tours — Bab Makkah

Wiki Tours International (parent brand) and **Bab Makkah by Wiki Tours** (premium
Omra & Hajj service). Next.js 15 App Router (plain JS), Supabase, Vercel.
Trilingual fr/ar/en, SSR + ISR, admin-controls-everything.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev
```

Apply in the Supabase SQL editor, in order: `supabase/schema.sql`,
`supabase/storage.sql`, `supabase/seed.sql`. Create the single admin user in
Supabase Auth (keep public sign-ups disabled). Admin: `/admin` in dev,
`admin.wikitours.ma` in prod.

## First-party analytics — free-tier math

The site tracks itself (visitors/sessions/events in Postgres); GA4 exists only
as ad-platform plumbing. Budget at ~1 000 visitors/day (well above current
traffic):

| What | Volume | Free-tier headroom |
| --- | --- | --- |
| `events` rows | ~4/visit → 4 000/day → **360 000 rows** kept (90-day retention) | ~80 MB incl. indexes vs 500 MB Supabase free |
| `sessions` + `visitors` | ~1 200/day → ~470 k rows/13 months | ~60 MB |
| `daily_rollups` | ~40 paths/day → 14 600 rows/year | negligible |
| `/api/t` invocations | 1 batch/page ≈ 35 k/month | Vercel Hobby allows ~1 M edge/function invocations |
| Cron | 1/day (`/api/cron/rollup`, 03:30 UTC) | Hobby allows daily crons |

Retention is enforced nightly by `cleanup_analytics()`: events > 90 days
deleted, sessions/visitors > 13 months deleted, aggregates preserved forever
in `daily_rollups`. The beacon (`public/wt.js`) ships ~1.6 KB gzipped, deferred,
and never blocks rendering.

## SEO / GEO / AEO

- **Sitemap** (`/sitemap.xml`) enumerates every published route × fr/ar/en with
  `<lastmod>` from `updated_at` and hreflang alternates; `/robots.txt` allows the
  majors **and** the AI answer engines (GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended), disallowing `/admin` and `/api`.
- **IndexNow**: set `settings.indexnow_key` in admin → the key is served at
  `/indexnow-key.txt`, and every publish/update pings IndexNow with the changed
  URLs after revalidation. **This reaches Bing/Copilot near-instantly. Google
  does NOT consume IndexNow** — it discovers changes via the sitemap + on-demand
  ISR revalidation, so there is no "instant" Google path by design.
  > Vercel note: the ping is fire-and-forget after the server action responds.
  > On serverless it usually completes; wrap in `waitUntil` if a platform cuts it.
- **Canonical host**: middleware 308-redirects `www.` → apex; Next's
  `trailingSlash:false` normalizes trailing slashes. Per-page `canonical` +
  hreflang (`fr`/`ar`/`en` + `x-default`) via `lib/seo.js`.
- **JSON-LD**: sitewide `TravelAgency` (`OrgJsonLd`, `@id …/#organization`),
  `WebSite` on home, `Product`+`Offer` per offer, `LocalBusiness` on the agency
  page, `BlogPosting` on articles, `ItemList` on `/bab-makkah`, `BreadcrumbList`.
  Deliberately **no FAQPage** and **no llms.txt**.

## Pending client confirmation

Nothing below publishes until the client designates the value — enforce in
review:

- **ADDRESS CONFLICT** — the deck shows two Casablanca addresses (Intersection
  Rue Alim Chatatani & Rue Stockholm vs 418 Bd Abdelmoumen RDC), plus two more
  found online. **No address appears anywhere** (footer, `/contact`,
  `/agence-omra-casablanca`, LocalBusiness schema, GBP) until the client picks
  THE one; then it goes into `settings.address_*` once and flows everywhere.
- **EXPERIENCE WORDING** — the deck says "15 ans d'expérience terrain" while the
  SARL was registered in 2016. Company surfaces say **"depuis 2016"**; team/
  expertise copy may say **"une équipe cumulant 15 ans d'expérience terrain"**.
  Never conflate company age with team experience.
- **`phone_fixe`** landline (+212 5 22 80 18 69) — not yet wired into settings/UI.

## Key paths

- `src/app/[locale]/…` — public site (fr/ar/en, RTL-aware)
- `src/app/admin/…` — back-office (auth, CRUD engine, CRM, analytics)
- `src/lib/admin/registry.js` — add a table to the admin by adding an entry
- `supabase/` — schema, storage policies, seed (client's real poster data)
- `public/wt.js` — first-party tracking beacon
