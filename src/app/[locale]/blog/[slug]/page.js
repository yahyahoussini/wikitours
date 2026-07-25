import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { getArticleBySlug, getArticles, getCovers } from '@/lib/data/content';
import { publicMediaUrl } from '@/lib/media';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import { withBrand } from '@/lib/titles';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import JsonLd from '@/components/site/JsonLd';
import SmartGallery from '@/components/SmartGallery';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

/** Prebuild every article × locale (see the offer page for the rationale). */
export async function generateStaticParams() {
  const articles = await getArticles(500);
  return LOCALES.flatMap((locale) => articles.map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await getArticleBySlug(slug);
  if (!article) notFound(); // metadata-phase 404: real status before streaming
  return {
    title: { absolute: withBrand(pickLang(article, 'seo_title', locale) ?? pickLang(article, 'title', locale)) },
    description: clampDesc(pickLang(article, 'seo_description', locale) ?? pickLang(article, 'excerpt', locale)),
    alternates: hreflangAlternates(locale, `/blog/${slug}`),
    // Article-typed OG so shares/AI cards carry byline + dates, not just a page.
    openGraph: {
      type: 'article',
      url: absoluteUrl(locale, `/blog/${slug}`),
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
      ...(article.updated_at ? { modifiedTime: article.updated_at } : {}),
      ...(article.author_name ? { authors: [article.author_name] } : {}),
    },
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
    publisher: { '@id': `${SITE_URL}/#organization` },
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
      <div className="scroll-progress" data-progress aria-hidden="true" suppressHydrationWarning />
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <Breadcrumbs
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: t.nav.blog, href: `/${locale}/blog` },
          { label: pickLang(article, 'title', locale) },
        ]}
      />

      <article>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-wiki-blue">{article.category}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
          {pickLang(article, 'title', locale)}
        </h1>

        {/* Author, verification and real dates — trust signals (LAWS §5).
            Dates use <time datetime> so the freshness is machine-readable,
            not just a localized string a parser has to guess at. */}
        <p className="mt-3 text-sm text-bm-black/50">
          {article.author_name}
          {article.reviewed_by ? ` · ${t.pages.verifiedBy} ${article.reviewed_by}` : ''}
          {article.published_at ? (
            <>
              {` · ${t.pages.publishedOn} `}
              <time dateTime={article.published_at}>{dateFmt.format(new Date(article.published_at))}</time>
            </>
          ) : null}
          {article.updated_at && article.published_at && article.updated_at.slice(0, 10) !== article.published_at.slice(0, 10) ? (
            <>
              {` · ${t.pages.updatedOn} `}
              <time dateTime={article.updated_at}>{dateFmt.format(new Date(article.updated_at))}</time>
            </>
          ) : null}
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
