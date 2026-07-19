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

## 4. Crons

`vercel.json` already declares them (no action beyond setting `CRON_SECRET`):
- `/api/ping` daily 06:00 UTC — keepalive/health.
- `/api/cron/rollup` daily 03:30 UTC — analytics rollups + expired-offer 301s
  (the offers lifecycle depends on it — LAW: offers redirect, never 404).

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
