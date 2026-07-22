import { LOCALES } from '@/lib/i18n';
import { absoluteUrl, sitemapAlternates } from '@/lib/seo';
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
} from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { OMRA_YEAR, MONTH_SLUGS, CITY_SLUGS, cityPageIndexable } from '@/lib/months';
import { GUIDE_PILLAR_SLUG, GUIDE_CHILD_SLUGS, guideIndexable, GLOSSARY_MIN_TERMS } from '@/lib/guides';
import { computePeriods } from '@/lib/barometer';

export const revalidate = 3600;

/**
 * Dynamic sitemap: every public, indexable route × 3 locales, each entry
 * carrying its hreflang alternates (LAWS §5). Content routes come from the DB
 * (published rows only, via the anon client) so new offers/articles appear
 * automatically — no code change per publish (LAWS §4). Landing pages (/lp)
 * are campaign surfaces and stay out of organic discovery.
 */
export default async function sitemap() {
  const [offers, hotels, articles, occasions, landingPages, settings, cityPages, guidePages, glossaryTerms, voyages] =
    await Promise.all([
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
    ]);

  // [locale-relative path, priority, changeFrequency, optional lastModified]
  const staticPaths = [
    ['', 1, 'daily'],
    ['/bab-makka', 0.9, 'daily'],
    ['/hotels-omra', 0.7, 'weekly'],
    ['/agence-omra-casablanca', 0.8, 'weekly'],
    ['/hajj', 0.6, 'monthly'],
    ['/blog', 0.6, 'weekly'],
    ['/avis', 0.6, 'weekly'],
    ['/agrement', 0.5, 'yearly'],
    ['/a-propos', 0.5, 'yearly'],
    ['/contact', 0.5, 'yearly'],
  ];

  // Only months that actually have a departure are listed: an empty month hub
  // is noindex (see [locale]/[flat]/page.js) and listing a noindex URL sends
  // Google contradictory signals. They appear here automatically once filled.
  const monthsWithOffers = new Set(
    offers
      .filter((o) => o.date_start && new Date(o.date_start).getUTCFullYear() === OMRA_YEAR)
      .map((o) => new Date(o.date_start).getUTCMonth()),
  );

  const barometer = computePeriods(offers);

  const dynamicPaths = [
    ...offers.map((o) => [`/omra/${o.slug}`, 0.8, 'weekly', o.updated_at]),
    // Voyages catalog: the hub is noindex while empty (scaffold law), so it
    // only enters the sitemap once a voyage is published.
    ...(voyages.length ? [['/voyages', 0.7, 'weekly']] : []),
    ...voyages.map((v) => [`/voyage/${v.slug}`, 0.7, 'weekly', v.updated_at]),
    ...hotels.map((h) => [`/hotel/${h.slug}`, 0.5, 'monthly', h.updated_at]),
    ...articles.map((a) => [`/blog/${a.slug}`, 0.6, 'monthly', a.updated_at ?? a.published_at]),
    // Programmatic SEO landings: months with departures, DB occasions, 8 cities.
    ...MONTH_SLUGS.filter((_, i) => monthsWithOffers.has(i)).map((slug) => [
      `/omra-${slug}`,
      0.7,
      'weekly',
    ]),
    ...occasions.map((o) => [`/omra-${o.slug}`, 0.6, 'weekly']),
    // City pages: only once their anti-doorway guard passes (unique content
    // filled + admin toggle) — a noindex URL never belongs in the sitemap.
    ...Object.keys(CITY_SLUGS)
      .filter((slug) => cityPageIndexable(cityPages.get(slug)))
      .map((slug) => [`/omra-depuis-${slug}`, 0.6, 'monthly', cityPages.get(slug)?.updated_at]),
    // Guide cluster + glossary + price barometer: same noindex-until-filled law.
    ...[GUIDE_PILLAR_SLUG, ...GUIDE_CHILD_SLUGS]
      .filter((slug) => guideIndexable(guidePages.get(slug)))
      .map((slug) => [
        slug === GUIDE_PILLAR_SLUG ? '/guide-omra' : `/guide-omra/${slug}`,
        slug === GUIDE_PILLAR_SLUG ? 0.7 : 0.6,
        'monthly',
        guidePages.get(slug)?.updated_at,
      ]),
    ...(glossaryTerms.length >= GLOSSARY_MIN_TERMS
      ? [['/glossaire-omra', 0.5, 'monthly', glossaryTerms.reduce((m, t) => (t.updated_at > m ? t.updated_at : m), glossaryTerms[0].updated_at)]]
      : []),
    ...(barometer.periods.length ? [['/barometre-prix-omra', 0.6, 'weekly', barometer.lastChanged]] : []),
    // Campaign landing pages, indexable ones only (noindex excluded).
    ...landingPages.map((p) => [`/lp/${p.slug}`, 0.5, 'monthly', p.updated_at]),
    // Seasonal/evergreen hubs — listed only when indexable (they noindex when
    // empty, so listing an empty one would contradict Google, like month hubs).
    ...(offers.length ? [['/omra-pas-cher', 0.7, 'weekly']] : []),
    ...(offers.some((o) => o.occasion?.slug === 'ramadan') ? [['/omra-ramadan', 0.8, 'weekly']] : []),
    ...(settings?.press_url ? [['/presse', 0.4, 'yearly']] : []),
  ];

  const entries = [];
  for (const [path, priority, changeFrequency, lastModified] of [...staticPaths, ...dynamicPaths]) {
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
