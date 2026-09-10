import { LOCALES } from '@/lib/i18n';
import { absoluteUrl, sitemapAlternates } from '@/lib/seo';
import { lastModifiedOf } from '@/lib/freshness';
import {
  getPublishedOffers,
  getHotels,
  getArticles,
  getOccasions,
  getIndexableLandingPages,
  getCityPages,
  getGuidePages,
  getGlossaryTerms,
  getVoyages,
  getTestimonials,
  getTeam,
  getLegalPages,
} from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { OMRA_YEAR, MONTH_SLUGS, CITY_SLUGS, cityPageIndexable } from '@/lib/months';
import { GUIDE_PILLAR_SLUG, GUIDE_CHILD_SLUGS, guideIndexable, GLOSSARY_MIN_TERMS } from '@/lib/guides';
import { legalIsFilled } from '@/lib/legal-page';
import { computePeriods } from '@/lib/barometer';

export const revalidate = 86400;

/**
 * Dynamic sitemap: every public, indexable route × 3 locales, each entry
 * carrying its hreflang alternates INCLUDING x-default (LAWS §5). Content
 * routes come from the DB (published rows only, via the anon client) so new
 * offers/articles appear automatically — no code change per publish (LAWS §4).
 * Landing pages (/lp) are campaign surfaces and stay out of organic discovery.
 *
 * TWO INVARIANTS, both audited by scripts/seo-audit.js:
 *  - A noindex URL NEVER appears here (seo-audit.js:244). Every scaffold is
 *    gated on the SAME predicate its page uses to noindex itself, so the two
 *    can never disagree: cityPageIndexable, guideIndexable, legalIsFilled,
 *    GLOSSARY_MIN_TERMS, barometer.periods.length, monthsWithOffers.
 *  - Every entry carries a <lastmod> derived from the rows that compose the
 *    page (lastModifiedOf), which is the same expression behind the visible
 *    "Mis à jour le" line. Never build time — that would re-date all 246 URLs
 *    on every deploy and tell a crawler nothing true.
 */
export default async function sitemap() {
  const [
    offers, hotels, articles, occasions, landingPages, settings,
    cityPages, guidePages, glossaryTerms, voyages, testimonials, team, legalPages,
  ] = await Promise.all([
    getPublishedOffers(),
    getHotels(),
    getArticles(500),
    getOccasions(),
    getIndexableLandingPages(),
    getSettings(),
    getCityPages(),
    getGuidePages(),
    getGlossaryTerms(),
    getVoyages(),
    getTestimonials(),
    getTeam(),
    getLegalPages(),
  ]);

  // [locale-relative path, priority, changeFrequency, lastModified]
  // Every static page's freshness comes from the rows it actually renders, so a
  // sitemap date can never claim a change the page does not show.
  const staticPaths = [
    ['', 1, 'daily', lastModifiedOf(settings, offers, hotels, articles, testimonials)],
    ['/bab-makka', 0.9, 'daily', lastModifiedOf(offers, settings)],
    ['/hotels-omra', 0.7, 'weekly', lastModifiedOf(hotels)],
    ['/agence-omra-casablanca', 0.8, 'weekly', lastModifiedOf(settings, offers, testimonials)],
    ['/hajj', 0.6, 'monthly', lastModifiedOf(settings)],
    ['/blog', 0.6, 'weekly', lastModifiedOf(articles)],
    ['/avis', 0.6, 'weekly', lastModifiedOf(testimonials, settings)],
    ['/agrement', 0.5, 'yearly', lastModifiedOf(settings)],
    ['/a-propos', 0.5, 'yearly', lastModifiedOf(settings, team)],
    ['/contact', 0.5, 'yearly', lastModifiedOf(settings)],
  ];

  // Only months that actually have a departure are listed: an empty month hub
  // is noindex (see [locale]/[flat]/page.js) and listing a noindex URL sends
  // Google contradictory signals. They appear here automatically once filled.
  const offersInMonth = (i) =>
    offers.filter((o) => o.date_start && new Date(o.date_start).getUTCFullYear() === OMRA_YEAR && new Date(o.date_start).getUTCMonth() === i);
  const monthsWithOffers = new Set(
    offers
      .filter((o) => o.date_start && new Date(o.date_start).getUTCFullYear() === OMRA_YEAR)
      .map((o) => new Date(o.date_start).getUTCMonth()),
  );

  const barometer = computePeriods(offers);
  const offersForOccasion = (slug) => offers.filter((o) => o.occasion?.slug === slug);

  const dynamicPaths = [
    ...offers.map((o) => [`/omra/${o.slug}`, 0.8, 'weekly', o.updated_at]),
    // Voyages catalog: the hub is noindex while empty (scaffold law), so it
    // only enters the sitemap once a voyage is published.
    ...(voyages.length ? [['/voyages', 0.7, 'weekly', lastModifiedOf(voyages)]] : []),
    ...voyages.map((v) => [`/voyage/${v.slug}`, 0.7, 'weekly', v.updated_at]),
    ...hotels.map((h) => [`/hotel/${h.slug}`, 0.5, 'monthly', h.updated_at]),
    ...articles.map((a) => [`/blog/${a.slug}`, 0.6, 'monthly', a.updated_at ?? a.published_at]),
    // Programmatic SEO landings: months with departures, DB occasions, 8 cities.
    // The month hub's lastmod is the SAME expression its page renders as
    // "Mis à jour le" ([flat]/page.js) — they used to disagree.
    ...MONTH_SLUGS
      .map((slug, i) => [slug, i])
      .filter(([, i]) => monthsWithOffers.has(i))
      .map(([slug, i]) => [`/omra-${slug}`, 0.7, 'weekly', lastModifiedOf(offersInMonth(i))]),
    ...occasions.map((o) => [`/omra-${o.slug}`, 0.6, 'weekly', lastModifiedOf(o, offersForOccasion(o.slug))]),
    // City pages: only once their anti-doorway guard passes (unique content
    // filled + admin toggle) — a noindex URL never belongs in the sitemap.
    ...Object.keys(CITY_SLUGS)
      .filter((slug) => cityPageIndexable(cityPages.get(slug)))
      .map((slug) => [`/omra-depuis-${slug}`, 0.6, 'monthly', lastModifiedOf(cityPages.get(slug), offers)]),
    // Guide cluster + glossary + price barometer: same noindex-until-filled law.
    ...[GUIDE_PILLAR_SLUG, ...GUIDE_CHILD_SLUGS]
      .filter((slug) => guideIndexable(guidePages.get(slug)))
      .map((slug) => [
        slug === GUIDE_PILLAR_SLUG ? '/guide-omra' : `/guide-omra/${slug}`,
        slug === GUIDE_PILLAR_SLUG ? 0.7 : 0.6,
        'monthly',
        lastModifiedOf(guidePages.get(slug)),
      ]),
    ...(glossaryTerms.length >= GLOSSARY_MIN_TERMS
      ? [['/glossaire-omra', 0.5, 'monthly', lastModifiedOf(glossaryTerms)]]
      : []),
    // The barometer is the site's only original-data page, but it self-noindexes
    // until a period reaches MIN_OFFERS_PER_PERIOD real offers. Listing it while
    // empty would contradict its own robots meta, so it enters by itself the
    // moment the data supports it.
    ...(barometer.periods.length ? [['/barometre-prix-omra', 0.6, 'weekly', barometer.lastChanged]] : []),
    // Campaign landing pages, indexable ones only (noindex excluded).
    ...landingPages.map((p) => [`/lp/${p.slug}`, 0.5, 'monthly', p.updated_at]),
    // Legal pages — indexable only once published AND filled in fr+ar, the same
    // legalIsFilled() the page and the footer use. They were missing entirely:
    // /politique-de-confidentialite is live, footer-linked and indexable, and
    // was absent from the sitemap.
    ...legalPages
      .filter(legalIsFilled)
      .map((row) => [`/${row.slug}`, 0.3, 'yearly', lastModifiedOf(row)]),
    // Seasonal/evergreen hubs — listed only when indexable (they noindex when
    // empty, so listing an empty one would contradict Google, like month hubs).
    ...(offers.length ? [['/omra-pas-cher', 0.7, 'weekly', lastModifiedOf(offers)]] : []),
    ...(offersForOccasion('ramadan').length
      ? [['/omra-ramadan', 0.8, 'weekly', lastModifiedOf(offersForOccasion('ramadan'))]]
      : []),
    ...(settings?.press_url ? [['/presse', 0.4, 'yearly', lastModifiedOf(settings)]] : []),
  ];

  // De-duplicate by path, keeping the highest priority. `/omra-ramadan` is
  // emitted twice the moment Ramadan exists BOTH as a DB occasion and as the
  // occasion of a live offer — a duplicate <loc> in one sitemap. Latent today
  // (no Ramadan departure is published yet), guaranteed the day one is.
  const byPath = new Map();
  for (const entry of [...staticPaths, ...dynamicPaths]) {
    const [path, priority] = entry;
    const seen = byPath.get(path);
    if (!seen || priority > seen[1]) byPath.set(path, entry);
  }

  const entries = [];
  for (const [path, priority, changeFrequency, lastModified] of byPath.values()) {
    for (const locale of LOCALES) {
      entries.push({
        url: absoluteUrl(locale, path),
        lastModified: lastModified ? new Date(lastModified) : undefined,
        changeFrequency,
        priority,
        alternates: sitemapAlternates(path),
      });
    }
  }
  return entries;
}
