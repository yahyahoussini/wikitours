import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getRelatedArticles } from '@/lib/data/content';

/**
 * Reverse internal link: the articles that declare `supports_path` = this page.
 * The AI drafter sets it from the plan's owner page; an admin can set it on
 * any article. This closes the hub ↔ article loop — the article links UP to
 * its hub (the drafter's gate enforces that), the hub links DOWN to the
 * articles that support it — which is what turns a daily post into ranking
 * power for the money page instead of an orphan. Renders nothing when empty
 * (LAW §10). Server component; reads through the anon client, so RLS shows
 * published + dated rows only. Anchor text is the article title: descriptive,
 * never "en savoir plus" (the seo:audit gate rejects generic anchors).
 */
export default async function RelatedArticles({ path, locale, className = '' }) {
  const articles = await getRelatedArticles(path);
  if (!articles.length) return null;
  const t = getDictionary(locale);
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <section className={`mx-auto max-w-5xl px-6 py-10 ${className}`} aria-labelledby="related-articles-title">
      <h2 id="related-articles-title" className="text-xl font-bold text-bm-black">
        {t.pages.relatedTitle}
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {articles.map((a) => {
          const excerpt = pickLang(a, 'excerpt', locale);
          return (
            <li key={a.slug} className="rounded-panel border border-bm-black/5 bg-white p-5 shadow-hairline">
              <Link
                href={`/${locale}/blog/${a.slug}`}
                className="font-semibold text-bm-black underline-offset-4 hover:underline"
              >
                {pickLang(a, 'title', locale)}
              </Link>
              {excerpt ? <p className="mt-2 text-sm leading-relaxed text-bm-black/70">{excerpt}</p> : null}
              {a.published_at ? (
                <p className="mt-2 text-xs text-bm-black/50">{fmt.format(new Date(a.published_at))}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
