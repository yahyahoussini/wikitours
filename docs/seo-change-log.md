# SEO change log

One change per ranking page per 14 days. Log the date, what changed, the rollback and the page's baseline, then judge at day 7 and day 14.

| Date | Pages | Change | Rollback | Judge on |
|---|---|---|---|---|
| 2026-11-01 | AR prices post, AR Ramadan and Chaâbane hubs, their offers | Year back in titles, live price in the lede, computed hub ledes, AR offer titles lead with the trip, tables render (04eb095, 903dfc2 + live DB rows) | Pre-edit copy of the rows is outside the repo, in the owner's `audit-2026-11-01/db/` folder | 2026-11-15 |
| 2026-11-02 | All pages | Brand favicon, blog card fallback, data-basis line, llms.txt Arabic section (9b0b998, c7a4762) | Revert the commits | No ranking effect expected |
| 2026-11-02 | 8 hotel pages | Owner: the database is right. Texts now follow each row's name, stars, distance and breakfast flag. Swiss International lost the Swissôtel claims (Abraj Al Bait, Ajyad Street, Kaaba views) and a pasted `:contentReference` string. /hotels-omra shows "depends on the trip" when an open tier includes breakfast and the hotel row does not. | `docs/seo-changes/2026-11-02-hotels-before.json` | 2026-11-16 |

Baseline for 2026-11-02, Oct 4–31: hotel URLs together about 1,624 impressions and 7 clicks. `/fr/hotel/taj-park` 126 impressions at 10.7, `/ar/hotel/emaar-grand-hotel` 193 at 11.5.
