# 03 — Dominance plan

How this calendar takes the first position in Morocco for Omra, Omra Ramadan and
Hajj queries, in French **and** in Arabic. Written 2026-09-14 from the coverage
map (`01-coverage-map.md`), the gaps (`02-gaps.md`) and what the site already
ranks with. Every claim here is a decision, not a forecast.

The whole plan rests on one asymmetry: **the site's commercial pages already
exist and are indexable, but almost nothing feeds them.** Thirty-six posts, of
which twenty-eight carry fewer than 450 French words and thirty-four carry no
FAQ block at all. The landers rank on their own thinness. The calendar's job is
not to add pages — it is to put a body of genuinely useful, Moroccan-specific
writing behind the landers that already convert.

---

## a) Own the Arabic side

Moroccans search for Omra and Hajj **in Arabic**, in a mix of Modern Standard
Arabic and Darija, and almost every competing page they find is either French or
Levantine Arabic written for a Gulf audience. That is the opening.

**The decision: Arabic is a co-master, not a translation.** Every Ramadan slot
and every Hajj slot in the calendar carries `master_locale = ar_co_master`. The
writing session drafts the Arabic FIRST, from the Arabic query set and an Arabic
outline — the questions Moroccans actually type, in the order they ask them —
and the French is then adapted from the Arabic. The slug stays identical across
the three locales, so hreflang keeps its reciprocal set.

The seed query set, extended by every writing session:

| Arabic | What it is |
|---|---|
| عمرة رمضان من المغرب | the head Ramadan query, owned by `/omra-ramadan` — posts support it, never target it |
| ثمن عمرة رمضان | price intent; the answer is a mechanism, the figure renders live |
| عمرة العشر الأواخر | the last ten nights — the highest-intent Ramadan window |
| عمرة رمضان الدار البيضاء | city + occasion, the diaspora and the Casablanca reader |
| شنو خاصني نوجد لعمرة رمضان | Darija, preparation intent |
| كيفاش كيدوز رمضان فمكة | Darija, experience intent — what the month is actually like |
| الحج 1448 المغرب | the Hajj season; the post never writes the year, the countdown tag does |
| القرعة ديال الحج | Darija, the lottery — the single biggest Hajj query in Morocco |
| التسجيل فالحج | Darija, registration |
| ما تسميتيش فالقرعة | Darija, the rejection moment — where the Hajj → Omra bridge earns its keep |

Three mechanical rules protect the register, all enforced by
`scripts/content-gate.mjs` (G9) and the shared gate:

1. Moroccan month names only — شتنبر، غشت، نونبر، دجنبر, never the Levantine
   forms. A Levantine month in an Arabic body fails the gate.
2. City names in Arabic script — الدار البيضاء، الرباط، مراكش، فاس، طنجة،
   أكادير، مكناس، وجدة. A Latin city name in an Arabic body fails the gate.
3. At least 95 % Arabic letters once proper nouns (hotel names, airlines,
   Nusuk, WhatsApp, ONCF) are removed. Below that it reads as a translation and
   fails.

Darija lives in the query fields and, sparingly, in FAQ questions — never as a
primary keyword, never transliterated into Latin script inside an Arabic body.
The transliterations Moroccans type (`3omra`, `oumra`, `umrah`, `hadj`, `7ajj`,
`ramdan`) live in `secondary_queries`, which is a planning field, not prose.

The AR reviewer (`reviewers/ar-reviewer.md`) scores every co-mastered post on
whether it reads as written for a Moroccan Arabic searcher rather than
translated. Below 8/10 it is rewritten once, then skipped.

---

## b) Front-load Ramadan 1448

Ramadan 1448 begins on or about **8 February 2027** (Umm al-Qura, ± two days
until the sighting). Moroccan families decide between **October and December**;
competitors publish in January and February, when the decision is already made.

**The decision: the twelve-part series is indexed before the competition starts
writing.** Part 1 lands on the first slot of the calendar (21 September 2026);
parts 2–6 are all published **before 1 January 2027**; parts 7–12 before
Ramadan begins. Spacing is 6 to 9 days, so the series never reads as a dump and
each part has time to be crawled and to accumulate internal links from the next.

The phase weights carry the same intent — the share of slots given to the
Ramadan track rises as the decision window opens and peaks while Ramadan runs:

| Window | Ramadan | Omra core | Hajj |
|---|---|---|---|
| 13 Sep – 31 Oct 2026 | 35 % | 50 % | 15 % |
| 1 Nov – 31 Dec 2026 | 50 % | 35 % | 15 % |
| 1 Jan – 7 Feb 2027 | 60 % | 25 % | 15 % |
| 8 Feb – 9 Mar 2027 | 60 % | 20 % | 20 % |
| 10 Mar – 30 Apr 2027 | 25 % | 35 % | 40 % |
| 1 May – 15 Jun 2027 | 10 % | 40 % | 50 % |
| 16 Jun – 31 Aug 2027 | 20 % | 60 % | 20 % |
| 1 – 19 Sep 2027 | 45 % | 40 % | 15 % |

The last row is not a repeat: it is the Ramadan **1449** cycle opening, eleven
days earlier in the Gregorian year. The calendar already reserves slots for it.

---

## c) One definitive resource per intent

The failure mode this plan exists to avoid is the one the coverage map already
shows: seven pages that all answer "how much does an Omra cost", four that all
answer "when is Ramadan and when should I book". Each of them is short, each
splits the same intent, and none of them wins.

**The decision: one intent, one definitive piece, everything else links into
it.** The twelve-part Ramadan series is the reference for Ramadan; every other
Ramadan post links into the relevant part instead of re-explaining it, and every
one of them points at the lander through `<CommercialCTA intent="ramadan" />`,
never through a hard-coded URL. The same shape holds for the eight-part Hajj
series, the eight-part first-Omra series and the twelve-part month series.

Three mechanical rules keep the calendar out of the existing overlaps:

- A slot whose primary query equals a lander's H1, or an existing post's title,
  or another scheduled slot's query, is rejected at build time
  (`scripts/build-content-calendar.mjs`) and again at write time (gate G8).
- Every slot carries `closest_existing_url` **and** a mandatory `delta` saying
  what it adds. A slot without a delta is not a slot.
- Two consecutive slots never share a cluster, and the gate refuses a body whose
  3-gram similarity to any existing post reaches 0.85 (G15).

---

## d) Time the Hajj cycle

The Moroccan Hajj is an annual administrative machine, and its calendar is
public. For the 1448 season the electronic registration ran in December 2025 and
the lottery in March 2026 — both already past — with the season itself around
Arafah in **May 2027**. The 1449 registration window is expected in late 2026 but
is not published yet.

**The decision: publish against the cycle's moments, and never write a date.**
Registration content lands in the autumn, when people start asking; the lottery
content lands in the lottery season; the rejection-to-Omra bridge peaks right
after the results, which is the single highest-intent moment of the Moroccan
Hajj year and the reason `<HajjBridgeCTA />` is mandatory on every Hajj-cluster
slot. Preparation runs April–May, the rites during the season itself, post-Hajj
and the next registration cycle after.

Dates never enter the prose. The official facts
(`data/official-facts.json`, copied into `data/allowed-facts.json`) are marked
`verification: "search-summary"` — the ministry's own pages could not be fetched
from this machine (their certificate chain does not verify here), so they are
usable as **structure** (who organises, the two channels, the levels of the
draw, the waiting list, the age and the ten-year rule) and never as a figure.
The gate refuses a date, a quota and an amount in prose regardless. When the
owner confirms a fact in a browser and marks it `fetched`, it becomes quotable.

---

## e) Feed the pillars

Every post links up to its pillar and forward to its commercial target, so the
authority accrues to the pages that actually rank and convert rather than to the
blog.

**The decision: an article never hard-codes a commercial URL.** It declares an
INTENT — `ramadan`, `hajj`, `pas_cher`, `premium`, `agency`, `guide`, `hotels`,
`month:11`, `city:fes` — and `src/lib/content-resolver.js` maps it to the best
existing, indexable lander at request time, using the same predicates the
sitemap and the footer use. A noindex month, an unpublished occasion or a
retired page falls back to the Omra hub, so a post can never send a reader or a
crawler to a page that should not rank. Gate G6 fails a markdown link to a
commercial page and requires at least four internal links, the pillar among
them, plus two siblings of the same cluster.

The reverse edge already exists: `supports_path` puts the post in its hub's
« Pour aller plus loin » block, so the loop closes in both directions.

---

## f) Measure free

No paid tool. Three free instruments, in order of usefulness:

1. **Search Console export** — if the owner drops a CSV into `data/gsc/`, the
   next generating session reads it and re-prioritises the pool: a query where
   the site is at position 5–15 with impressions is worth more than a fresh
   angle, and the slot's `delta` is then written against the page that already
   ranks.
2. **The site's own gate output** — `docs/content-system/gate-reports/*.json`
   per post and `docs/content-system/calendar-report.md` per build, both
   committed, so drift is visible in the diff.
3. **`npm run seo:suite` and `npm run links:audit`** after each deploy: the
   internal-link graph tells you whether the new posts actually reach the
   landers, which is the mechanism this whole plan depends on.

---

## What this plan does not claim

The honest limits, so no one plans against a fiction:

- The calendar's slot count and the pool's distinct-angle count are not the same
  number. `docs/content-system/calendar-report.md` lists every slot no topic
  could fill, and `02-gaps.md` gives the honest count of distinct angles the map
  supports. Cadence is a ceiling; an unfilled slot stays unfilled.
- Nothing here predicts a ranking. It removes the three mechanical reasons the
  site is not ranking today: no depth behind the landers, no Arabic written for
  Moroccans, and an intent split across near-duplicate pages.
- The existing thin posts are not rewritten by this plan. They keep their URLs;
  where a new slot covers the same ground in depth, the slot's `delta` says so
  and the thin post becomes a sibling link, not a competitor.
