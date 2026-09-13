import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getArticles, getPublishedOffers, getMonthPages } from '@/lib/data/content';
import { clusterOfArticle, clusterOfPath, mandatoryTargetsFor, siblingArticles, articlesInCluster } from '@/lib/clusters';
import { monthName, monthPagePath, indexableMonths, targetYearFor } from '@/lib/months';

/**
 * The related-content block every cluster page carries (blog articles, guide
 * chapters) — driven by src/lib/clusters.js, never hand-placed:
 *   1. the page's MANDATORY targets (owner brief), dynamic ones resolved
 *      against live data (indexable month landers, live departures)
 *   2. the cluster's pillar (the "up" link) and a commercial door (/bab-makka)
 *      when the pillar itself is not commercial — so every article carries at
 *      least one contextual link to a commercial page
 *   3. up to three sibling pages of the same cluster
 * Anchors are descriptive dictionary strings (the seo:audit rejects generic
 * ones). Renders nothing when the page belongs to no cluster.
 */
export default async function ClusterLinks({ path, locale, article = null, className = '' }) {
  const cluster = article ? clusterOfArticle(article) : clusterOfPath(path);
  if (!cluster) return null;
  const t = getDictionary(locale);
  const anchors = t.clusters.anchors;
  const [articles, offers, monthPages] = await Promise.all([getArticles(500), getPublishedOffers(), getMonthPages()]);
  const self = `/${locale}${path}`;

  const links = [];
  const push = (href, label) => {
    if (href && label && href !== self && !links.some((l) => l.href === href)) links.push({ href, label });
  };
  const hub = (p) => push(`/${locale}${p}`, anchors[p]);

  for (const target of article ? mandatoryTargetsFor(article.slug) : []) {
    if (target === 'months') {
      for (const i of [...indexableMonths(offers, monthPages)].slice(0, 3)) {
        push(`/${locale}${monthPagePath(i)}`, anchors.months.replace('{month}', monthName(i, locale)).replace('{year}', String(targetYearFor(i, { offers }))));
      }
    } else if (target === 'departures') {
      for (const o of offers.slice(0, 3)) push(`/${locale}/omra/${o.slug}`, anchors.departures.replace('{title}', pickLang(o, 'title', locale) ?? o.slug));
      if (!offers.length) hub('/bab-makka');
    } else if (target === 'school-holiday-departure') {
      const o = offers.find((x) => /vacances-scolaires/.test(x.slug));
      if (o) push(`/${locale}/omra/${o.slug}`, anchors['school-holiday-departure'].replace('{title}', pickLang(o, 'title', locale) ?? o.slug));
      else hub('/bab-makka');
    } else {
      hub(target);
    }
  }
  hub(cluster.pillar);
  if (!cluster.commercial || cluster.pillar === '/hajj') hub('/bab-makka');

  const siblings = article ? siblingArticles(article, articles, 3) : articlesInCluster(cluster, articles).slice(0, 3);

  return (
    <section className={`mt-12 rounded-panel border border-bm-black/10 bg-white p-6 shadow-hairline ${className}`} aria-labelledby="cluster-links-title" data-cluster={cluster.id}>
      <h2 id="cluster-links-title" className="text-lg font-bold text-bm-black">{t.clusters.seeAlso}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="font-semibold text-wiki-blue underline-offset-4 hover:underline">
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
      {siblings.length ? (
        <>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-bm-black/50">{t.clusters.siblings}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {siblings.map((a) => (
              <li key={a.slug}>
                <Link href={`/${locale}/blog/${a.slug}`} className="text-bm-black/80 underline-offset-4 hover:underline">
                  {pickLang(a, 'title', locale)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
