# PROJECT LAWS

The ten constraints the client set for this build (declared 2026-07-10, before any
code existed). Source code cites them as `LAW §n` / `LAWS §n` in dozens of
comments — this file is what those references point at.

> **Precedence:** where a law and `CLAUDE.md` disagree, **CLAUDE.md wins.** It
> records decisions taken *after* these laws were written (see the superseded
> notes below). This file is the original constitution; CLAUDE.md is the current
> amendment record.

---

### §1 — BRAND LAW
Wiki Tours is the parent company. The Omra & Hajj service is its premium brand,
never presented as independent. Every branded surface carries the lockup, and one
shared `BRAND` constant (`src/lib/brand.js`) feeds UI, schema, OG, footer, emails.

> ⚠️ **Superseded in part by CLAUDE.md.** The original law made **"Bab Makkah"**
> (with h) the canonical Latin spelling. That was reversed: the canonical name is
> **"Bab Makka"** (no h) — it matches the domain, Google Business Profile, press
> and reviews. "Bab Makkah" survives **only** as schema `alternateName`. See
> CLAUDE.md § Brand & naming and FIX-PLAN.md decision 2.

### §2 — Stack
Plain JavaScript (`.js` / `.jsx`). **No TypeScript.** Next.js 15 App Router on
Vercel. Supabase (Postgres + Auth + Storage). Upstash for rate limits.

### §3 — Server rendering
All public content server-rendered (ISR + on-demand revalidation). Client JS only
for interactivity; carousel and tab content must exist in the served HTML.

### §4 — Admin controls EVERYTHING
Post-deploy, zero code changes for operations. If a business action would require
a developer, the build is wrong.

### §5 — SEO / GEO / AEO first
Semantic HTML, exactly one clear H1, answer-first opening paragraph, hreflang
fr/ar/en, JSON-LD, crawlable facts (prices, dates, distances as text), Core Web
Vitals. Hard limits and the shipping gate live in CLAUDE.md.

### §6 — CTAs are requests, never purchases
"Réserver ma place", not "Acheter". **Zero payment code.** No fake scarcity —
status comes from the DB, past offers are auto-hidden. Hajj stays interest-only
until the agrément is confirmed.

### §7 — Design: original luxury identity, never copy competitors
Wiki Tours surfaces: blue `#1398C9` on warm white `#FDFDFC`. Bab Makka surfaces:
black `#0D0D0D`→`#1A1A1A` + gold `#D4AF37` (light `#E8C766`), blue reserved for
primary actions. Montserrat (headings) · Inter (body) · Playfair Display italic
(spiritual accents) · Tajawal (AR). **Logical CSS properties only** — flawless
RTL. Exactly 3 shadows (hairline / lift / float), radii 10/16/24, transitions
200–300ms `cubic-bezier(0.16,1,0.3,1)`.

> ⚠️ **Partly superseded by implementation.** The public site now reads as a
> LIGHT surface (white ground, `--color-bm-black` body text, gold as accent),
> with dark reserved for the footer and photo heroes. A `--color-bm-gold-deep`
> token exists because `#D4AF37` fails contrast as text on white.
> **`src/app/globals.css` is the live source of truth for the palette.**

### §8 — Security
RLS on every table; anon reads published content only; leads / analytics / CRM
unreadable by anon; **service key server-only**; zod on every write; generic
errors to clients.

> Amended: `authenticated` is no longer equivalent to admin. Access requires the
> `ADMIN_EMAILS` allowlist (code) **and** `public.admin_allowlist` (RLS). See
> CLAUDE.md § Admin access.

### §9 — WhatsApp CTA pattern
Every CTA: primary button, plus a quieter "ou écrivez-nous sur WhatsApp" link
beneath it, plus the global floating WhatsApp button (bottom-end) on all public
pages.

### §10 — Never invent content
Seeded data is the client's real data. **Missing data ⇒ the section hides.** No
placeholder ever ships as visible text. This is the law behind every
`...(value ? { field: value } : {})` spread in the JSON-LD builders.

---

**Why these matter:** they are the client's hard constraints. Violating any —
especially the brand lockup, no-TypeScript, no-payment-code, or
admin-controls-everything — breaks the engagement.

**When to re-read:** before scaffolding, before adding any table / page /
component, before writing copy, and before choosing colours or fonts.
