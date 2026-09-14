# scripts/ — the build-time SEO gates

Two gates run in `npm run build` (`postbuild`), on Vercel and in CI alike, and read the
prerendered HTML in the build output (`NEXT_DIST_DIR`, default `.next`) — no server, no
database, seconds:

| Gate | What it asserts | Self-test |
|---|---|---|
| `scripts/seo-suite.mjs` (`npm run seo:suite`) | titles, meta descriptions, canonical, hreflang, sitemap ⇄ indexability, internal links (3xx / 404 / nav → noindex / orphans), language (Latin city names on `/ar`, French fallback on `/ar` and `/en`), rendering without JavaScript — then runs the schema gate as its SCHEMA step | `npm run seo:suite -- --self-test` |
| `scripts/schema-audit.mjs` (`npm run schema:audit`) | JSON-LD: valid, schema.org vocabulary, required fields per type, `@id` graph, locale, no ratings, markup ⇄ content, expected node types per page type | `npm run schema:audit -- --self-test` |

Both share **`scripts/lib/build-pages.mjs`**: the list of prerendered routes, how a route
maps to a *page type*, the HTML loader and the text helpers. `npm test` (node:test) runs
right after them.

A self-test reintroduces every defect the suite exists to catch — in memory, on the real
pages of the current build — and proves each one fails with its specific message. Run it
after editing a gate; both must stay 100 %.

## Running against a server

The suite's route list always comes from the local build (the sitemap cannot enumerate
noindex pages). With `BASE_URL` it fetches every route from that server with a JS-less
crawler user agent, and resolves sitemap URLs, hreflang targets and internal links over
HTTP instead of from the build output:

```
BASE_URL=https://wikitours.ma npm run seo:suite
```

`scripts/seo-audit.js` (`npm run seo:audit`) is the older live crawl of the sitemap; the
GitHub workflow still runs it against a started server after the build.

## Adding a new page type

1. **Classify the route** in `scripts/lib/build-pages.mjs`: a fixed path goes into `STATIC`
   (`'mon-chemin': 'mon-type'`), a `/{head}/{slug}` route into `DYNAMIC` (`head: 'mon-type'`).
   An unclassified route fails both gates with *"unclassified route — add it to
   STATIC/DYNAMIC"*, so this step cannot be forgotten.
2. **Declare its structured data** in `scripts/schema-audit.mjs` → `EXPECT`: the node types
   every page of that type must carry (`'mon-type': ['WebPage', 'BreadcrumbList']`).
   Data-dependent types (nothing published ⇒ nothing prerendered) also go in
   `OPTIONAL_TYPES`, otherwise the coverage check demands one page per locale.
   `npm run schema:audit -- --inventory` prints the node types actually found per page type.
3. **Build and run both gates**: `NEXT_DIST_DIR=.next-audit npm run build`. The suite covers
   the new type automatically — every prerendered page of every type is checked; the
   rendering section samples one page per type per locale.
4. **Teach the self-tests if the page type has a rule of its own** — add a mutation to the
   `MUTATIONS` list of the gate concerned (a real page mutated in memory, the section it must
   fail in, the message fragment it must produce) and run `--self-test`.
5. **Sitemap and navigation**: the suite requires every indexable page to be in the sitemap
   (`src/app/sitemap.js`) and to have at least two inbound internal links; a page that
   noindexes itself must be gated out of the sitemap, the footer and any hub list by the
   **same predicate** (see CLAUDE.md, "Indexability is one expression, reused").

## Rules the suite enforces (and where the numbers live)

| Rule | Source of truth |
|---|---|
| Title length: floor `titleFloor(locale)` (30, Arabic 20 — denser script), ceiling 65 | `src/lib/titles.js` |
| Description 120–165, ends on a sentence, never an ellipsis; the composer pads short ones with the shared trust clauses | `src/lib/page-seo.js` (`DESC_MIN`, `padDescription`) |
| Redirect rules (dated month hub, legacy map, missing locale, trailing slash, www) | `src/middleware.js`, `src/lib/redirects/legacy-map.js`, `MONTH_SLUGS` — imported by the suite, not copied |
| Latin-script city names on `/ar` | the `cities` block of `src/i18n/fr.json` + `en.json` |
| French-fallback detection | stopword lists in `scripts/lib/build-pages.mjs` |

The suite loads `tests/register.mjs` (the `@/` alias hooks) so it can import those app
modules; the schema gate runs under plain `node`.
