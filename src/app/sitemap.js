import { LOCALES } from '@/lib/i18n';
import { absoluteUrl, sitemapAlternates } from '@/lib/seo';
import { getPublishedOffers, getHotels, getArticles, getOccasions, getIndexableLandingPages } from '@/lib/data/content';
import { OMRA_YEAR, MONTH_SLUGS, CITY_SLUGS } from '@/lib/months';

export const revalidate = 3600;

/**
 * Dynamic sitemap: every public, indexable route × 3 locales, each entry
 * carrying its hreflang alternates (LAWS §5). Content routes come from the DB
 * (published rows only, via the anon client) so new offers/articles appear
 * automatically — no code change per publish (LAWS §4). Landing pages (/lp)
 * are campaign surfaces and stay out of organic discovery.
 */
export default async function sitemap() {
  const [offers, hotels, articles, occasions, landingPages] = await Promise.all([
    getPublishedOffers(),
    getHotels(),
    getArticles(500),
    getOccasions(),
    getIndexableLandingPages(),
  ]);

  // [locale-relative path, priority, changeFrequency, optional lastModified]
  const staticPaths = [
    ['', 1, 'daily'],
    ['/bab-makkah', 0.9, 'daily'],
    ['/agence-omra-casablanca', 0.8, 'weekly'],
    ['/voyages', 0.6, 'monthly'],
    ['/hajj', 0.6, 'monthly'],
    ['/blog', 0.6, 'weekly'],
    ['/avis', 0.6, 'weekly'],
    ['/agrement', 0.5, 'yearly'],
    ['/a-propos', 0.5, 'yearly'],
    ['/contact', 0.5, 'yearly'],
  ];

  const dynamicPaths = [
    ...offers.map((o) => [`/omra/${o.slug}`, 0.8, 'weekly', o.updated_at]),
    ...hotels.map((h) => [`/hotel/${h.slug}`, 0.5, 'monthly', h.updated_at]),
    ...articles.map((a) => [`/blog/${a.slug}`, 0.6, 'monthly', a.updated_at ?? a.published_at]),
    // Programmatic SEO landings: 12 months, DB occasions, 8 cities.
    ...MONTH_SLUGS.map((slug) => [`/omra-${slug}-${OMRA_YEAR}`, 0.7, 'weekly']),
    ...occasions.map((o) => [`/omra-${o.slug}`, 0.6, 'weekly']),
    ...Object.keys(CITY_SLUGS).map((slug) => [`/omra-depuis-${slug}`, 0.6, 'monthly']),
    // Campaign landing pages, indexable ones only (noindex excluded).
    ...landingPages.map((p) => [`/lp/${p.slug}`, 0.5, 'monthly', p.updated_at]),
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
