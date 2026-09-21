# Scoreboard — Bab Makka (wikitours.ma)

The 30-prompt set is the KPI of the whole programme (Layer 7). Measure before building, then every week (Layer 17).

## Files
- `prompts.csv` — the prompt set: 10 informational, 10 commercial, 10 local (+3 brand prompts). Replace scaffold phrasing with the words customers really type; keep the ids.
- `runs/YYYY-Www.csv` — one file per week, one row per prompt per engine (copy `runs-template.csv`).
- `summary.csv` — written by `npm run score` (citation-share.mjs).
- `competitors.csv` — the named competitors (name as shown in Google Maps, domain, GBP rating/reviews): market.mjs and ai-runs.mjs use it to attribute local-pack rows and AI mentions.
- Automated files per week (when the keys exist): `runs/<week>-google.csv` (serp.mjs: Google + AI Overview rows), `runs/<week>-gsc.csv` (gsc-api.mjs: Search Console average position for prompts without a Google row), `runs/<week>-ai.csv` (ai-runs.mjs: ChatGPT, Perplexity, Gemini, Claude). A hand-filled `runs/<week>.csv` row always overrides an automated row for the same prompt and engine.

## Weekly run (Monday, 1 h)
For each prompt, from a Moroccan location on a phone (or an incognito session with the location set):
1. **Google**: record `google_position` of wikitours.ma (0 = not in top 100), `snippet_owner` (domain owning the featured snippet or first People Also Ask answer), `ai_overview_cited` (yes/no) and the AI Overview `cited_domains` in order; on local prompts, `map_pack` = yes/no (is the business in the map pack?).
2. **ChatGPT, Perplexity, Gemini, Claude** (Copilot / AI Mode optional): paste the prompt, record `cited_domains` in the order shown; `brand_named` = yes when the brand is named without a link; `brand_position` = rank among sources.
3. `npm run score` → citation share per engine, snippet share, top-1/top-3 share, map-pack share, streaks, most cited domains, the prompt that moved most, the definition-of-first check.
4. `npm run market` → docs/19-marche-et-concurrence.md: who owns the category (Google share of voice + AI citations + map pack), the battle map per prompt, the ten moves. `npm run weekly` runs everything that has a key, then writes reports/<week>.md and reports/dashboard.html.
5. With API keys (docs/12 → API): `npm run serp` (SerpApi: Google rows written for you, PAA harvest, listicles, share of voice), `npm run ai` (the four AI engines through their APIs: rows, fan-out queries, share of model, facts the engines repeat or get wrong), `npm run gsc -- positions --to-runs` (Search Console average positions).

## Reading it
- Answers vary between runs: judge four-week trends, never a single week.
- Leading indicators (impressions, positions, citation share, mentions, reviews) move in days to weeks; lagging ones (clicks, WhatsApp leads, revenue) in weeks to months.
- Definition of first (course thresholds, four consecutive weeks): Google position 1 on ≥ half of commercial+local prompts and top 3 on the rest, map pack held; a snippet/PAA/AI Overview citation on ≥ a third; cited on ≥ half of prompts in ≥ two AI engines and the most cited domain of the category.
