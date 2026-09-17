# Month pages — where every statement comes from

The authored blocks of `month_pages` (Admin → Pages mois) are rendered on
`/{locale}/omra-{mois}` under « Météo et affluence », « À qui convient… » and
« Quand réserver… ». They are evergreen: no year, no date, no price. This file
records the source of each factual statement so the next edit can check it.
Re-read the sources before changing a figure.

## Written so far

| Month | Blocks | Languages | Written |
|---|---|---|---|
| février | weather, crowds, suits, lead_time | fr, ar, en | 2026-09-17 |
| mars | weather, crowds, suits, lead_time | fr, ar, en | 2026-09-17 |

The other ten months are still empty. A month indexes once `weather` and
`suits` exist in fr **and** ar and the toggle is on (`monthPageFilled()` in
`src/lib/months.js`), or when it has a departure this cycle.

## Climate normals (WMO 1991–2020)

Read on 2026-09-17 from the climate tables of the English Wikipedia articles.
Those tables cite the WMO 1991–2020 Climatological Standard Normals (NOAA
archive, Makkah station 41030, Madinah station 40430) and the Jeddah Regional
Climate Center. The pages give the rounded values.

| City | Month | Mean max | Mean min | Precipitation | Source |
|---|---|---|---|---|---|
| Makkah | February | 32.6 °C | 19.9 °C | 2.5 mm | https://en.wikipedia.org/wiki/Mecca#Climate |
| Makkah | March | 35.4 °C | 21.8 °C | 5.2 mm | same |
| Madinah | February | 27.0 °C | 14.1 °C | 3.0 mm | https://en.wikipedia.org/wiki/Medina#Climate |
| Madinah | March | 30.8 °C | 17.4 °C | 5.3 mm | same |

« L'air sec, surtout à Médine » rests on the same tables: mean relative
humidity is 54 % in February and 48 % in March in Makkah, against 31 % and 25 % in Madinah.

## Crowds and season

| Statement on the page | Source |
|---|---|
| Ramadan draws far more visitors than an ordinary month | General Authority for the Two Holy Mosques: 122.3 million visitors in Ramadan 1446 (Asharq Al-Awsat relaying SPA, 1 Apr 2025, https://english.aawsat.com/gulf/5127692-two-holy-mosques-welcome-over-122-million-visitors-during-ramadan) against 60 million+ in Muharram 1447 (Gulf News, 9 Aug 2025). GASTAT: Ramadan months were the peak for domestic Umrah performers in 2024 and 2025 (Argaam, 21 Mar 2025 and 21 Nov 2025). |
| The last ten nights gather the largest congregations of the month | The Saudi Times, 11 Mar 2026, https://thesauditimes.net/en/millions-of-worshippers-converge-on-the-two-holy-mosques-as-ramadans-last-ten-nights-begin/ |
| The Saudi authorities advised avoiding peak hours for Umrah during the last ten nights | Ministry of Hajj and Umrah, reported by Gulf News, 11 Mar 2026 |
| The days of Eid al-Fitr stay very busy | GASTAT 2024: April 2024, which held the last ten days of Ramadan and the Eid holiday, was the domestic peak month (Argaam, 21 Mar 2025) |
| In recent seasons, entry for overseas Umrah pilgrims closed about two weeks after Eid al-Fitr and only reopened after Hajj; the authorities set this calendar each season | 1446: last entry 13 Apr 2025 = 15 Shawwal, last departure 29 Apr 2025 (Gulf News, 7 Apr 2025, https://gulfnews.com/world/gulf/saudi/saudi-arabia-sets-april-29-deadline-for-foreign-umrah-pilgrims-to-depart-ahead-of-hajj-season-1.500085881). 1447: Umrah from 11 Jun 2025 = 15 Dhul Hijjah 1446, last entry 3 Apr 2026 = 15 Shawwal (The Peninsula, 10 May 2025, https://thepeninsulaqatar.com/article/10/05/2025/saudi-arabia-announces-umrah-season-calendar). Re-check on haj.gov.sa or Nusuk each season. |
| In Morocco, Ramadan places go months ahead; most booking happens between September and December | The agency's own Ramadan category text (`occasions.ramadan`), already on the site |

Ramadan and Eid dates are computed with the Umm al-Qura calendar
(`src/lib/hijri.js`). February overlaps Ramadan in 1448, 1449 and 1450 AH.
March opens with the end of Ramadan and Eid only in 1448 AH (2027).

**Why the pages warn about the pre-Hajj pause.** Suppose the recent pattern
holds: last entry on 15 Shawwal, reopening around 15 Dhul Hijjah. Then entry
would close around these dates:

| Year | Entry closes |
|---|---|
| 2027 | 23 March |
| 2028 | 11 March |
| 2029 | 28 February |
| 2030 | 18 February |

From 2031 to 2036, February and March fall in the pause or in Hajj itself in
most years. This is a planning projection, never page copy. It is why no page
calls a non-Ramadan February or March "calmer", and why both pages tell the
reader to check the season calendar first.

## Deliberately not claimed

- **Ramadan as the foreign-pilgrim peak.** GASTAT shows January 2025 as the international peak.
- **« After Eid is quiet » as a fact.** No official source says so. It is also misleading, because the closure is what empties those weeks.
- **« Booking a few months ahead is enough » outside Ramadan.** No source supports it.
- **« The heat is bearable ».** It is a comfort judgement, not a normal.
- **Laylat al-Qadr as the 27th night.** Its date is unknown; the 27th is only the most observed night.
- **Any agency observation.** The owner has not validated any as a source yet (RESUME owner item 0).
- **Crowd figures.** The pages stay qualitative. Any number above 10 in an article must first be added to `data/official-facts.json`.
