import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getArticles, getPublishedOffers, getMonthPages, getCityPages, getHotels, getOccasions } from '@/lib/data/content';
import { CLUSTERS, articlesInCluster } from '@/lib/clusters';
import { CITY_SLUGS, cityName, cityPageIndexable, monthName, monthPagePath, indexableMonths, targetYearFor } from '@/lib/months';

/**
 * A pillar's links DOWN to every page of its clusters — /bab-makka carries all
 * seven, /hajj its own — rendered from src/lib/clusters.js plus live data
 * (indexable month landers and city pages, partner hotels, published
 * articles). Adding an article to a cluster (explicit entry, supports_path or
 * category) lists it here on the next render. Only indexable pages are
 * linked: a noindex month or city page is never a pillar target.
 */
export default async function ClusterIndex({ locale, ids = CLUSTERS.map((c) => c.id), title, className = '' }) {
  const t = getDictionary(locale);
  const anchors = t.clusters.anchors;
  const [articles, offers, monthPages, cityPages, hotels, occasions] = await Promise.all([
    getArticles(500), getPublishedOffers(), getMonthPages(), getCityPages(), getHotels(), getOccasions(),
  ]);
  const liveMonths = [...indexableMonths(offers, monthPages)];
  const liveCities = Object.keys(CITY_SLUGS).filter((slug) => cityPageIndexable(cityPages.get(slug)));

  const groups = CLUSTERS.filter((c) => ids.includes(c.id)).map((c) => {
    const links = [];
    const add = (href, label) => { if (href && label && !links.some((l) => l.href === href)) links.push({ href, label }); };
    for (const p of c.pages) add(`/${locale}${p}`, anchors[p]);
    for (const kind of c.dynamic ?? []) {
      // Occasion hubs are DB rows (indexed even when empty — see [flat]); the
      // explicit /omra-ramadan and /omra-5-etoiles entries above dedupe by href.
      if (kind === 'occasions') for (const o of occasions) add(`/${locale}/omra-${o.slug}`, anchors.occasions.replace('{name}', pickLang(o, 'name', locale) ?? o.slug));
      if (kind === 'months') for (const i of liveMonths) add(`/${locale}${monthPagePath(i)}`, anchors.months.replace('{month}', monthName(i, locale)).replace('{year}', String(targetYearFor(i, { offers }))));
      if (kind === 'cities') for (const slug of liveCities) add(`/${locale}/omra-depuis-${slug}`, t.cityPage.title.replace('{city}', cityName(slug, locale)));
      if (kind === 'hotels') for (const h of hotels) add(`/${locale}/hotel/${h.slug}`, h.name);
    }
    for (const a of articlesInCluster(c, articles)) add(`/${locale}/blog/${a.slug}`, pickLang(a, 'title', locale));
    return { id: c.id, name: t.clusters.names[c.id], pillar: c.pillar, links };
  }).filter((g) => g.links.length);

  if (!groups.length) return null;
  return (
    <section className={`mx-auto max-w-6xl px-6 py-12 ${className}`} aria-labelledby="cluster-index-title">
      <h2 id="cluster-index-title" className="text-2xl font-bold text-bm-black">{title ?? t.clusters.indexTitle}</h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.id} data-cluster={g.id}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-bm-black/50">{g.name}</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-bm-black/80 underline-offset-4 hover:text-wiki-blue hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
