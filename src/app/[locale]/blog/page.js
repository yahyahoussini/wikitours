import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getArticles } from '@/lib/data/content';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pages.blogTitle, alternates: hreflangAlternates(locale, '/blog') };
}

export default async function BlogPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const articles = await getArticles();

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-8">
      <h1 className="text-3xl font-bold text-bm-black sm:text-4xl">{t.pages.blogTitle}</h1>
      <div className="mt-8 flex flex-col gap-5">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${locale}/blog/${article.slug}`}
            className="group rounded-card bg-white p-6 shadow-hairline transition hover:shadow-lift"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
            <h2 className="mt-2 text-xl font-bold text-bm-black group-hover:text-wiki-blue">
              {pickLang(article, 'title', locale)}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-bm-black/60">{pickLang(article, 'excerpt', locale)}</p>
            <p className="mt-3 text-xs text-bm-black/40">
              {article.author_name}
              {article.published_at
                ? ` · ${new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' }).format(new Date(article.published_at))}`
                : ''}
            </p>
          </Link>
        ))}
        {articles.length === 0 ? <p className="text-sm text-bm-black/50">—</p> : null}
      </div>
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
