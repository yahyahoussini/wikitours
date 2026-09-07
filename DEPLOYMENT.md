# DEPLOYMENT.md — Vercel runbook (site + admin dashboard)

One Vercel project serves everything: the public site on `wikitours.ma` and
the admin dashboard on `admin.wikitours.ma` (the middleware rewrites the admin
host to `/admin/*`; main-domain `/admin` 308s to the admin host in
production). Locally, `/admin` keeps working in dev.

## 1. Repository

Push this repo to GitHub and import it in Vercel. Framework preset: Next.js —
default build (`npm run build`) and output settings are correct as-is.
Do NOT set `NEXT_DIST_DIR` on Vercel (it is a local audit-gate tool only).

## 2. Environment variables (Production AND Preview)

| Variable | Value / notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://wikitours.ma` — canonical URLs, JSON-LD, sitemap all derive from it |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — server-only (no `NEXT_PUBLIC` prefix, never exposed) |
| `CRON_SECRET` | any long random string (e.g. `openssl rand -hex 32`). Vercel automatically sends it as `Authorization: Bearer …` to the cron routes |
| `ADMIN_HOST` | optional — defaults to `admin.wikitours.ma`; set only if the admin lives elsewhere |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | optional — cross-instance rate limiting for `/api/lead` (without it, a per-instance in-memory limiter applies) |
| `RESEND_API_KEY` / `RESEND_FROM` | optional — instant lead alert e-mails |

Never set in production: `META_CAPI_URL`, `TIKTOK_EVENTS_URL`,
`RESEND_API_URL`, `BASE_URL`, `UA_PROBE` — these are local test overrides.
Marketing pixel ids/tokens (GA4, Meta, TikTok, Google Ads) are NOT env vars —
they live in the `settings` table and are managed in `/admin/reglages`.

## 3. Domains (Vercel → Project → Domains)

1. `wikitours.ma` — primary.
2. `www.wikitours.ma` — add it; the middleware 308s www → apex.
3. `admin.wikitours.ma` — add it; the middleware serves the dashboard there.
4. **Legacy brand domain** — `bab-makka.com`, `www.bab-makka.com`,
   `m.bab-makka.com`. All three belong to THIS project as **served** domains
   with **no "Redirect to"**: the middleware answers every request on them with
   a single 301 to the final `wikitours.ma/fr/…` page (legacy map + locale in
   one hop). A Vercel-level "Redirect to" can only target another *domain* with
   the path preserved, which is why it used to chain 301 → 307 (and → 301 again
   for deep links).

   **Order matters.** (a) Deploy the middleware that contains the
   `LEGACY_HOST` block — it is inert while a domain-level redirect intercepts.
   (b) Only then edit `bab-makka.com` and `www.bab-makka.com` in Domains and
   clear "Redirect to". (c) Add `m.bab-makka.com` the same way.
   DNS: apex `A 76.76.21.21`; `www` and `m` → the project CNAME shown on the
   domain card (`…vercel-dns-017.com`, the same value `www` already uses).
   `m.` had no DNS record at all until 2026-09 (NXDOMAIN) — every backlink to
   the old mobile site was dead, since no redirect can fire on a hostname that
   does not resolve.
   Verify: `curl -sI https://bab-makka.com/omra/1104/x` must return ONE `301`
   with `Location: https://wikitours.ma/fr/bab-makka`.

## 4. Crons

`vercel.json` already declares them (no action beyond setting `CRON_SECRET`):
- `/api/ping` daily 06:00 UTC — keepalive/health.
- `/api/cron/rollup` daily 03:30 UTC — analytics rollups + expired-offer 301s
  (the offers lifecycle depends on it — LAW: offers redirect, never 404).
- `/api/cron/sync-reviews` daily 05:00 UTC — Google rating/count sync.
- `/api/cron/draft-article` daily 04:00 UTC — **the AI drafter.** Takes the
  next row of the admin's *Plan éditorial* (`article_plan`), writes a trilingual
  draft grounded ONLY in DB facts (settings, live offers, hotels, FAQ, team),
  runs a code-side gate (slug, length, sections, owner link, FAQ block, every
  MAD amount checked against the fact sheet). If **Réglages → Blog automatique**
  has auto-publish ON and an author set, and the gate is clean, it **publishes
  itself** for the next free 08:00 slot; otherwise it lands **unpublished** with
  a review e-mail that names the failed condition. Sets `supports_path` so the
  owner page lists it under « Pour aller plus loin ». Needs
  `ANTHROPIC_API_KEY` (no key ⇒ no-op). Pauses itself at 7 unreviewed drafts.
  Route sets `maxDuration = 300` — check your Vercel plan allows it.
- `/api/cron/publish-articles` daily 07:00 UTC (08:00 Casablanca) — **the
  blog's daily release.** Revalidates `/`, `/blog`, the article pages and
  `llms.txt`/sitemap for every article whose `published_at` passed since the
  last run, pings IndexNow, and e-mails `settings.email` (Resend) when a day
  went by with no release or the scheduled runway hits 7 / 3 / 1 / 0 days.

### How "one post a day, no daily action" works
Release is data: the anon RLS policy on `articles` is
`is_published AND published_at <= now()`. To schedule, write the article in
`/admin/e/articles`, tick **Publié**, and set **Date de publication** to the
morning it should go out — **08:00 Casablanca or earlier** so the 08:00 run
releases and pings it the same morning (a later time still surfaces within the
hour via the hourly ISR on `/blog`, and is pinged the next morning). Write in
batches: 30 articles dated one per day = a month with zero actions. The
dashboard card "Blog — articles programmés" turns red under 7 days of runway;
the e-mail alert is the backstop. Quality is enforced by the drafter's gate;
a human can always dépublier.

### The daily loop, end to end
04:00 UTC the drafter writes tomorrow's article. Gate clean + auto-publish ON
+ author set ⇒ it is already « Publié » for the next 08:00 slot and you get a
« Publié automatiquement » FYI (dépubliez-le si besoin). Otherwise you get
« Brouillon à relire » with the blocking problems, the flags (unsourced prices,
missing links) and the model's « [À VÉRIFIER] » list, and it waits for your
tick. 07:00 UTC the release cron makes due posts live, refreshes the pages,
the supporting hub and the sitemap, and pings IndexNow. Migrations 016 → 021
in order (019 needs `is_admin()` from 017) — or paste
`supabase/APPLY-ALL-016-to-021.sql` once in the Supabase SQL editor: it carries
the seeds (the three admin logins, the blog author) and is idempotent.

**Prove it without touching the DB** (both with the cron bearer token):
`GET /api/cron/draft-article?dry=1&sample=1` — gate, slot maths and publish
decision on synthetic drafts, no API key needed; `GET …?dry=1` — one real
model call on the next topic, nothing inserted, returns gate + decision +
preview. `GET /api/cron/publish-articles` is read-only apart from
revalidation, so it is safe to call by hand.

## 5. Supabase production state

- Migrations `001` → `013` applied (`011`–`013` verified applied on
  2026-07-19: `settings.babmakka_*`, `leads.message`, `leads.ip`).
- Storage bucket `public-images` allow-list includes AVIF/WebM (applied live
  2026-07-19; `supabase/storage.sql` is canonical).
- Admin users exist in Supabase Auth (email/password — no OAuth redirect
  URLs needed).
- RLS: per `supabase/schema.sql`; `offer_tiers` carries `admin_full_access`.

## 6. Post-deploy verification

```
# SEO gate against production
BASE_URL=https://wikitours.ma npm run seo:audit

# Health endpoint (surfaces empty critical settings)
curl https://wikitours.ma/api/health/seo
```
Then manually: admin login at `https://admin.wikitours.ma`, one test lead via
an offer page (check it lands in the CRM with comment + IP), robots.txt +
sitemap.xml, and one offer page's structured data via
https://search.google.com/test/rich-results.

Known content-side audit failures (data, not code — fix in `/admin`):
5 Arabic FAQ answers under 25 words; 2 hotel `seo_title_ar` values saved
doubled/mixed; no `omra`-category FAQs yet (offer pages need them to pass).

## 7. Preview deployments

Vercel serves previews with `X-Robots-Tag: noindex` automatically, and
`/api/lead` accepts `*.vercel.app` origins, so previews are fully testable
without SEO risk.
