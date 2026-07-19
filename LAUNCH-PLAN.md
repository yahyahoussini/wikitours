# LAUNCH-PLAN.md — split to-do (code vs admin) + first-page plan

Two owners: **CODE** = Claude (in the repo, gated + pushed). **ADMIN** = you,
in `/admin` and external consoles. Ordered by leverage.

---

## CODE — remaining engineering (in order)

1. **Legal pages** — `politique-de-confidentialite`, `mentions-legales`, `cgv`
   (admin-editable body fr/ar/en, footer links, noindex-until-filled guard).
   Blocking for Meta/Google Ads campaigns and client credibility.
2. **Soft-404 fix** — unknown URLs currently return 200 with a 404 UI
   (documented in PERF-AUDIT.md); return real 404s + add an `seo:audit` rule
   asserting statuses so it can never regress.
3. **RUM panel** — add TTFB to `wt.js`; admin panel with p75 LCP/CLS/INP/TTFB
   per route class × device against targets (the field truth for Core Web
   Vitals — what Google actually ranks with).
4. **Storage cache backfill** — one-off script re-setting Cache-Control 1y on
   existing media objects (new uploads already get it).
5. When you send the detailed Lighthouse list: **contrast pass** on the exact
   flagged elements (targeted, so the gold look survives).
6. Later (nice-to-have): Lighthouse CI budget in GitHub Actions; captions for
   reels if real subtitle files ever exist.

---

## ADMIN — Day 1 (today, ~2–3h, all in /admin)

- [ ] **Purge test data**: July offer gammes — real prices (not 11/22/33),
      real nights (not 2233). Réservations: delete any test leads.
- [ ] **Fix the two Arabic hotel titles** (saved doubled/mixed):
      `makarem-madinah`, `dhiafat-al-rajaa-hotel` → clean `seo_title_ar`,
      ≤60 chars, no brand suffix (the site adds it).
- [ ] **FAQs**: create 4–6 FAQs in category **omra** (fr+ar+en, 25–75 word
      answers, answer-first) — this unlocks the FAQ block + schema on every
      offer page. Lengthen the 5 short Arabic `confiance` answers.
- [ ] **Photos**: upload team photo (Galeries → Photo équipe), the
      "Pourquoi nous" photo (its own gallery), hero images re-exported
      ≤300 KB each, reels ≤4 MB each (re-upload = they get the 1-year cache).
- [ ] **Offers**: publish toward 6–10 real offers across different months —
      feeds the hubs, the filter, and the price barometer (needs ≥3/period).

## ADMIN — Day 2 (the day DNS goes live, ~1h)

- [ ] Vercel → Domains: `wikitours.ma`, `www`, `admin.` (set DNS records shown).
- [ ] **Google Search Console**: verify via meta tag → paste into Réglages →
      verification metas. Submit `sitemap.xml`. Request indexing for the
      home + `/bab-makka` + top offers (URL inspection → Request indexing).
- [ ] **Bing Webmaster Tools**: import from GSC (one click) — Bing powers
      Copilot/ChatGPT browsing; with IndexNow already wired site-side, Bing
      indexes in hours, not weeks. This is the fastest "be first" channel.
- [ ] **Réglages**: GBP rating + review count + review link + fiche URL;
      both social profile sets; WhatsApp + phones verified.
- [ ] Vercel env: `RESEND_API_KEY` + `RESEND_FROM` → instant lead e-mails.
- [ ] Re-run PageSpeed + `BASE_URL=https://wikitours.ma npm run seo:audit`.

---

## FIRST-PAGE PLAN — SEO / local / GEO / AEO

Honest timeline: **days** for the map pack + Bing/Copilot + brand terms;
**weeks** for competitive Google organic ("agence omra casablanca"). The
system is built for all four channels — the inputs below are what activate it.

### Local SEO (map pack — the real "first in days")
- GBP: primary category *Agence de voyages*, secondary *Agence de pèlerinage*;
  fill services (Omra, Hajj, per month), description = the site's entity
  description **verbatim** (entity consistency), link `wikitours.ma`.
- **Review velocity beats review count**: after each traveled client, use the
  CRM's "Demander un avis ★" button (it opens your review link and logs the
  ask). 2–3 fresh reviews/week + owner replies to every one (fr/ar).
- Photos on GBP weekly (departures, groups at the Haram — real ones).
- NAP: footer address/phone must equal GBP character-for-character.
- 3–5 Moroccan citations (annuaires, pages jaunes locales) with the same NAP.

### AEO / GEO (being the answer in ChatGPT, Copilot, Perplexity, AI Overviews)
- Already engineered: `llms.txt`, speakable answer-first ledes, FAQ/Offer/
  Organization schema, bot logging. Watch `/admin` → bot hits: when GPTBot /
  PerplexityBot start crawling, your content is entering their corpus.
- Your job: the **FAQs and guide content ARE the AI answers** — write them as
  direct 40–60-word answers. One claim, one place (keyword map).
- The **price barometer** is your citation magnet: original data AI engines
  can only get from you. Keep offers flowing so it stays populated.
- Same entity text everywhere: site = GBP = socials = directories.

### Classic Google SEO (weeks — compounding)
- Publish 1 piece/day into the built scaffolds: guide chapters, glossary
  terms, city pages (fr first, ar within the week — parity gate applies).
  Every filled scaffold auto-indexes, auto-links, joins the sitemap.
- Month hubs auto-index as offers land in their months — the offer volume
  from Day 1 is literally an SEO input.
- 2–3 real backlinks: press release (the `/presse` page exists to receive
  coverage), partner hotels linking back, local business associations.
- Weekly 15-min review: GSC coverage + queries, bot hits, audit re-run.
  Monthly: refresh GBP numbers in Réglages.
