import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc, SPEAKABLE, personNode } from '@/lib/seo';
import { getArticleBySlug, getArticles, getCovers, getTeam } from '@/lib/data/content';
import { getGallerySlides } from '@/lib/data/gallery';
import { findAuthor, authorName, isOrganisationByline } from '@/lib/authors';
import { publicMediaUrl } from '@/lib/media';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import { withBrand } from '@/lib/titles';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import ClusterLinks from '@/components/site/ClusterLinks';
import HajjBridge from '@/components/site/HajjBridge';
import JsonLd from '@/components/site/JsonLd';
import { isHajjBridge } from '@/lib/clusters';
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
      // Never older than the publication (the release cron leaves updated_at untouched).
      ...(article.updated_at || article.published_at
        ? { modifiedTime: [article.updated_at, article.published_at].filter(Boolean).sort().at(-1) }
        : {}),
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

  // E-E-A-T: the author is a real team profile (author_id, or the legacy
  // author_name matched to a renderable profile) → a Person node with the
  // /equipe @id; the organisation itself when the article is signed with the
  // agency's name (the 34 gate-published articles — honest, not anonymous);
  // a bare Person name only when a person is named but has no profile yet.
  // Never a placeholder: findAuthor() drops those (src/lib/authors.js).
  const team = await getTeam();
  const author = findAuthor(team, article, 'author');
  const reviewer = findAuthor(team, article, 'reviewer');
  const orgNames = [BRAND.parent, BRAND.lockup, 'Wiki Tours International'];
  const faceOf = async (m) => (m ? (await getGallerySlides('team_members', m.id, locale)).find((s) => s.kind === 'image')?.src ?? null : null);
  const authorNode = author
    ? personNode(author, locale, { image: await faceOf(author) })
    : !article.author_name || isOrganisationByline(article.author_name, orgNames)
      ? { '@id': `${SITE_URL}/#organization` }
      : { '@type': 'Person', name: article.author_name };
  const reviewerNode = reviewer
    ? personNode(reviewer, locale, { image: await faceOf(reviewer) })
    : article.reviewed_by
      ? { '@type': 'Person', name: article.reviewed_by }
      : null;

  // The release cron sets published_at without touching updated_at, so a
  // scheduled article's "updated" stamp can PRECEDE its publication. The
  // modification date shown and emitted is the later of the two — never
  // an update older than the publication.
  const modifiedAt = [article.updated_at, article.published_at].filter(Boolean).sort().at(-1) ?? null;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: pickLang(article, 'title', locale),
    ...(pickLang(article, 'excerpt', locale) ? { description: pickLang(article, 'excerpt', locale) } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
    inLanguage: locale,
    mainEntityOfPage: absoluteUrl(locale, `/blog/${article.slug}`),
    author: authorNode,
    ...(reviewerNode ? { reviewedBy: reviewerNode } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(modifiedAt ? { dateModified: modifiedAt } : {}),
    publisher: { '@id': `${SITE_URL}/#organization` },
    // Names the H1 and the answer-first lede as THE answer, like every other
    // page type here (hubs, guide, glossary, home). Without it the blog — the
    // site's largest surface — was the only content type answer engines had to
    // guess at.
    speakable: SPEAKABLE,
  };
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <div className="scroll-progress" data-progress aria-hidden="true" suppressHydrationWarning />
      <JsonLd data={articleJsonLd} />

      <BreadcrumbTrail locale={locale}
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: t.nav.blog, href: `/${locale}/blog` },
          { label: pickLang(article, 'title', locale) },
        ]}
      />

      <article>
        {/* Localized label, not the raw enum — the Arabic cards used to read
            "CONFIANCE" / "HOTELS" in Latin script. */}
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-wiki-blue">
          {t.articleCategory?.[article.category] ?? article.category}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
          {pickLang(article, 'title', locale)}
        </h1>

        {/* Author, verification and real dates — trust signals (LAWS §5).
            Dates use <time datetime> so the freshness is machine-readable,
            not just a localized string a parser has to guess at. */}
        <p className="mt-3 text-sm text-bm-black/50" data-byline>
          {author ? (
            <>
              {t.pages.byAuthor}{' '}
              <Link href={`/${locale}/equipe#${author.slug}`} className="font-semibold text-bm-black/80 underline-offset-4 hover:underline">
                {authorName(author, locale)}
              </Link>
            </>
          ) : (
            article.author_name ?? BRAND.parent
          )}
          {reviewer ? (
            <>
              {` · ${t.pages.verifiedBy} `}
              <Link href={`/${locale}/equipe#${reviewer.slug}`} className="font-semibold text-bm-black/80 underline-offset-4 hover:underline">
                {authorName(reviewer, locale)}
              </Link>
            </>
          ) : article.reviewed_by ? ` · ${t.pages.verifiedBy} ${article.reviewed_by}` : ''}
          {article.published_at ? (
            <>
              {` · ${t.pages.publishedOn} `}
              <time dateTime={article.published_at}>{dateFmt.format(new Date(article.published_at))}</time>
            </>
          ) : null}
          {/* Both dates, always — the update date is a freshness signal even on the publication day. */}
          {modifiedAt ? (
            <>
              {` · ${t.pages.updatedOn} `}
              <time dateTime={modifiedAt}>{dateFmt.format(new Date(modifiedAt))}</time>
            </>
          ) : null}
        </p>

        {/* Answer-first excerpt as the lede — data-answer is what the
            speakable cssSelector above points at (LAWS: AEO answer-first). */}
        {pickLang(article, 'excerpt', locale) ? (
          <p data-answer className="mt-5 border-s-4 border-bm-gold ps-4 text-lg font-medium leading-relaxed text-bm-black/85">
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

      {/* The Hajj → Omra bridge on the four lottery articles, then the
          cluster's contextual links (mandatory targets, pillar, siblings) —
          both driven by src/lib/clusters.js, never hand-placed per article. */}
      {isHajjBridge(article.slug) ? <HajjBridge locale={locale} /> : null}
      <ClusterLinks path={`/blog/${article.slug}`} locale={locale} article={article} />
      <WhatsAppFloat locale={locale} />
    </main>
  );
}
