import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, hreflangAlternates } from '@/lib/seo';
import { getArticleBySlug, getCovers } from '@/lib/data/content';
import { publicMediaUrl } from '@/lib/media';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import JsonLd from '@/components/site/JsonLd';
import SmartGallery from '@/components/SmartGallery';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: pickLang(article, 'seo_title', locale) ?? pickLang(article, 'title', locale),
    description: pickLang(article, 'seo_description', locale) ?? pickLang(article, 'excerpt', locale),
    alternates: hreflangAlternates(locale, `/blog/${slug}`),
  };
}

export default async function ArticlePage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const t = getDictionary(locale);
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  const covers = await getCovers('articles', [article.id]);
  const coverUrl = covers.get(article.id) ? publicMediaUrl(covers.get(article.id).path) : null;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: pickLang(article, 'title', locale),
    ...(pickLang(article, 'excerpt', locale) ? { description: pickLang(article, 'excerpt', locale) } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(locale, `/blog/${article.slug}`),
    ...(article.author_name ? { author: { '@type': 'Person', name: article.author_name } } : {}),
    ...(article.reviewed_by ? { reviewedBy: { '@type': 'Person', name: article.reviewed_by } } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.updated_at ? { dateModified: article.updated_at } : {}),
    publisher: {
      '@type': 'Organization',
      name: BRAND.parent,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/wikitours-logo.png` },
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(locale, '') },
      { '@type': 'ListItem', position: 2, name: t.nav.blog, item: absoluteUrl(locale, '/blog') },
      { '@type': 'ListItem', position: 3, name: pickLang(article, 'title', locale) },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <div className="scroll-progress" data-progress aria-hidden="true" />
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <article>
        <p className="text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
          {pickLang(article, 'title', locale)}
        </h1>

        {/* Author, verification and real dates — trust signals (LAWS §5) */}
        <p className="mt-3 text-sm text-bm-black/50">
          {article.author_name}
          {article.reviewed_by ? ` · ${t.pages.verifiedBy} ${article.reviewed_by}` : ''}
          {article.published_at ? ` · ${t.pages.publishedOn} ${dateFmt.format(new Date(article.published_at))}` : ''}
          {article.updated_at && article.published_at && article.updated_at.slice(0, 10) !== article.published_at.slice(0, 10)
            ? ` · ${t.pages.updatedOn} ${dateFmt.format(new Date(article.updated_at))}`
            : ''}
        </p>

        {/* Answer-first excerpt as the lede */}
        {pickLang(article, 'excerpt', locale) ? (
          <p className="mt-5 border-s-4 border-bm-gold ps-4 text-lg font-medium leading-relaxed text-bm-black/85">
            {pickLang(article, 'excerpt', locale)}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-panel empty:hidden">
          <SmartGallery entityType="articles" entityId={article.id} locale={locale} aspect="16 / 9" sizes="(min-width: 768px) 768px, 100vw" />
        </div>

        {pickLang(article, 'body', locale) ? (
          <div
            className={`mt-8 text-bm-black/80 ${markdownClass}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(pickLang(article, 'body', locale)) }}
          />
        ) : null}
      </article>
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
