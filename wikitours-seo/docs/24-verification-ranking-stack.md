# Is the Ranking Stack applied on wikitours.ma? Verification of 2026-10-04

Goal checked: high-quality **Omra** leads from Moroccan pilgrims and their families, Omra as the main
product, Hajj secondary. Course: *The Ranking Stack v2* (21 layers + playbooks, facts of 28 Sep 2026).

Line-by-line evidence for all 485 checks: `reports/audit-ranking-stack-2026-10-04.md`
(raw data: `reports/audit-ranking-stack-2026-10-04.json`).

## 1. The answer

**No — the course is not applied at 100%.** 123 of the 485 checks pass (25 %), 159 are partial,
119 fail, 56 wait on an owner action that nobody has confirmed, 17 cannot be measured with the current
access, 11 are by design or do not apply.

The pattern is clear:

- **The website code is mostly right.** Server-rendered pages, every crawler gets a 200, canonical
  and hreflang are correct, the TravelAgency / TouristTrip / Offer markup is valid and the offer pages
  carry real per-room prices, hotels and dates.
- **The weekly operation has barely started.** Measurement, the Business Profile, reviews, off-site
  work, the weekly rhythm and lead follow-up are where most of the gaps are (Layers 12, 15, 17, 20, 21).
- **A few live errors are sending leads away right now** (section 3). They can be fixed today in the
  admin, without a deploy.

| Layer | Verdict | ✅ | 🟡 | ❌ | 👤 |
|---|---|---|---|---|---|
| 1 The map | Mostly | 3 | 4 | 0 | 0 |
| 2 HTML a machine can read | Mostly | 9 | 7 | 5 | 0 |
| 3 Speed, mobile first | Partial | 6 | 4 | 2 | 0 |
| 4 JavaScript without hiding content | Mostly | 6 | 1 | 0 | 0 |
| 5 Crawl, index, get counted | Partial | 8 | 5 | 1 | 6 |
| 6 Inside Google | Partial | 13 | 7 | 3 | 0 |
| 7 Research | Partial | 5 | 5 | 4 | 0 |
| 8 The entity | Partial | 3 | 8 | 8 | 1 |
| 9 Architecture | Partial | 5 | 12 | 6 | 0 |
| 10 Content, conversion, Omra focus | Partial | 9 | 25 | 18 | 0 |
| 11 Links | Partial | 1 | 5 | 2 | 4 |
| 12 Local | **Not applied** | 5 | 4 | 8 | 11 |
| 13 AEO | Partial | 0 | 5 | 7 | 2 |
| 14 GEO | Partial | 4 | 8 | 5 | 1 |
| 15 Off-site | **Not applied** | 0 | 3 | 10 | 3 |
| 16 Risk ledger | Partial | 15 | 8 | 8 | 6 |
| 17 Measurement | Partial | 2 | 5 | 4 | 7 |
| 18 Diagnostics | Partial | 4 | 5 | 4 | 2 |
| 19 Omra agency special case | Partial | 11 | 5 | 6 | 0 |
| 20 Running it as a business | **Not applied** | 2 | 4 | 4 | 4 |
| 21 Weekly operating system | **Not applied** | 0 | 5 | 6 | 5 |
| 90-day plan + capstone | Partial | 4 | 15 | 3 | 3 |
| Playbooks (Morocco, Omra, MRE, calendar) | Partial | 8 | 10 | 5 | 1 |

✅ done · 🟡 partial · ❌ not done or wrong · 👤 owner action not confirmed

## 2. What the lead data says (site tracker + leads table, last 30 days unless stated)

- **65 form leads in total, 29 in the last 30 days;** 55 of 65 are tied to an offer, mostly with tier
  and room. The offer pages are the lead engine.
- **WhatsApp is the real channel:** about 167 WhatsApp clicks against 29 forms (≈ 6 to 1). Outside the
  offer pages, WhatsApp links carry no pre-filled text, so those leads arrive without saying which
  departure they want.
- **ChatGPT already brings about 22 % of form leads** (14 of 65 with `utm_source=chatgpt.com`), yet AI
  answers have never been measured.
- **25 % of leads come from abroad, 38 of 65 from outside Casablanca, only 6 of 65 through Arabic pages.**
- **Lead quality cannot be judged:** 64 of 65 leads are still "contacted", one is "lost", none is
  marked qualified, deposit paid or travelled, and the value is never filled.
- **The form loses half its starters:** 59 form starts → 29 submissions (49 %).
- **Mobile speed:** LCP at the 75th percentile is 2.84 s on mobile (home page 3.4 s) — above the 2.5 s
  line. INP (168 ms) and CLS (0.005) are good.

## 3. Fix today — wrong signals live now (admin or database, no deploy needed)

1. **The banner on every page sells departures that are not on sale.** "Omra Octobre 2026 — départs 6
   et 17 octobre avec Saudia, dès 12 300 DH" is active until 14 Oct, but both October departures were
   unpublished on 1 Oct, and 12 300 DH is lower than anything on sale. The banner that takes over on
   14 Oct says Ramadan 2027 is not open yet, while four Ramadan and Chaâbane-Ramadan departures are on
   sale. Replace both (Admin → Annonces). The October banner text also feeds llms.txt.
2. **The two October departure pages return 404.** They were among the top entry pages from Google and
   ChatGPT (about 110 ChatGPT sessions in 30 days). Either republish them marked "Complet" (status
   full: the page stays up, says sold out, links to the next departures and archives itself after the
   return), or add admin redirects to `/omra-novembre`. Unpublishing a departure is what creates the 404.
3. **The 32-day Ramadan offer shows a generic FAQ saying an Omra lasts "environ 15 jours".**
4. **`/omra-special-septembre` is indexable and sells trips that have already left;** the footer still
   pushes past seasons (Été, Mawlid, Spécial Septembre).
5. **`/omra-decembre` still says "aucun départ"** although two December departures are published.
   Saving any offer in the admin refreshes it.

## 4. Owner actions, by lead impact

1. **Repair the Vercel deploy** (send the build log). No code fix in section 5 can go live until it works.
2. **Pick one booking phone** and use it everywhere. Today the site and llms.txt show
   +212 634 845 177, the Business Profile, the JSON-LD and Waze show 06 01 35 11 05, and the October
   posters print the landline 05 22 80 18 69, which is nowhere on the site.
3. **Google Business Profile** — it decides "agence omra casablanca" (you are 3rd in Maps): remove
   "Omra & Hajj" from the name (a keyword in the name is a suspension risk), add the postal code, set
   the services and prices to what is on sale (Ramadan, Chaâbane-Ramadan, November, December), Ramadan
   hours, the UTM-tagged link, one post a week, an answer to every review.
4. **Review engine:** the group back on 7 Oct is the first chance. Send each pilgrim the
   write-a-review link by WhatsApp the same day. Reviews went 141 → 142 in 13 days; the course asks
   for 3 a week.
5. **Lead follow-up:** mark every lead qualified / deposit paid / travelled / lost, with its value, each
   week. Add the WhatsApp and phone enquiries too. Without this, nobody knows which page or channel
   brings paying pilgrims. Check the reply speed: a form lead waits a median 5.6 h for its first logged
   status change, while the site promises a WhatsApp reply in under 5 minutes.
6. **Facts only you can give:** the cancellation and refund policy, the balance deadline, the group
   size, and RC / ICE / IF. The CGV and Mentions légales drafts still contain "[À COMPLÉTER]", so they
   cannot be published yet. A family paying 50 % in advance needs these terms before sending a deposit.
7. **Search Console and Bing:** Search Console is in use (indexing was requested on 28 Sep), but the
   sitemap submission, the Pages report, Manual actions, Security issues and the generative-AI control
   are not confirmed, and Bing Webmaster Tools is not set up. Export the 12-month queries to `data/gsc/`.
8. **`bab-makka.com` still answers a temporary 307** (TikTok's bio links to it). Make it a permanent
   301 in Vercel.
9. **Measure from Morocco, for free, every Monday:** the 33 prompts on a phone in Casablanca and in the
   ChatGPT, Gemini, Perplexity and Claude apps; the day-7 and day-14 snippet checks (due 5 and 12 Oct);
   the 5-point map-pack check. Only one week (W39, 12 prompts, Google only, from outside Morocco) exists.
10. **People and proof:** bios and photos of the director and the mourchids that reviews name (Mustapha,
    Hassan); real local facts for the city pages, which today fail the name-swap test; a YouTube
    channel with testimonial videos from returning groups (with consent).

## 5. Code and content fixes, ready to build once the deploy works

1. **WhatsApp as the primary action, pre-filled everywhere:** offer + tier + room + number of people on
   offer pages; the page name on the home page, hubs, cards and the floating button.
2. **Lead form:** add the departure or month, the number of pilgrims and the tier; add a consent notice
   (Law 09-08).
3. **Offer pages:** brand and place in the titles; fix the answer block that reads "L'Omra Omra
   Décembre…"; show the Madinah hotel distance; group size and cancellation terms in the Conditions
   section once the owner gives them; a compressed share image (now 846 KB, risky for WhatsApp previews).
4. **The money hubs** (`/omra-ramadan`, `/omra-pas-cher`, `/omra-chaabane-ramadan`, home): an answer of
   40–60 words with Bab Makka + Casablanca + a dated "from" price, question-form headings, the brand in
   FAQ answers, one Darija question, a key-facts block. The home H1 is a slogan; make it say Omra from
   Casablanca.
5. **One source for each fact:** the passport rule appears four ways; "from" prices differ between hub
   cards and offer pages.
6. **Navigation:** put "Omra" in the header; take "Voyages" (5 expired summer trips, 1 lead of 65) out of
   the top bar; noindex the occasion hubs with no live departure; fix the two broken Arabic footer
   labels ("عمرة الصيفالصيف", "عمرة عمرة شتنبر 2026").
7. **Unpublished future departures should 301, never 404.**
8. **Mobile LCP:** serve the first home slide at display size with high priority and defer the others;
   stop preloading the Arabic font files on French and English pages.
9. **Missing pages the course and the Omra playbook ask for:**
   - a company / association Omra page;
   - an MRE page "offer an Omra to your parents" (25 % of leads come from abroad);
   - an honest comparison page;
   - a free Omra budget simulator;
   - an owner page for "prix omra 2 personnes".

## 6. Not a defect (deliberate decisions)

Bare hreflang codes and `/fr` URLs; no aggregateRating; month landers noindex until they have content;
descriptions of 120–155 characters; the 6-month passport rule on Chaâbane-Ramadan; the 56-day departure
off; the 32-day premium tier hidden; the $0 rule (no paid API keys).

## 7. How this was verified

- **Who checked:** 7 auditors read the repo, the rank-first docs and scoreboard, the database (aggregates
  only) and a capped number of live pages. 2 verifiers then tried to disprove each of the 239 negative
  findings: 223 held, 16 were corrected, and 6 requirements nobody had checked were added.
- **What changed during the audit:** nothing was written. The crawler tests added about 11 synthetic rows
  to `bot_hits` around 09:59 UTC on 2026-10-04, and one share image was generated.
- **Limits:**
  - no access to the Google and Bing accounts, so those items are marked owner-pending;
  - positions, answer boxes and AI answers were not measured from Morocco;
  - code findings are the same in the live build (fb4d0e5) and the repo, because nothing has deployed
    since 25 Sep.
