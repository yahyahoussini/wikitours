import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, hreflangAlternates, personNode } from '@/lib/seo';
import { authoredOr, pageDescription, trustClauses } from '@/lib/page-seo';
import { getArticleBySlug, getArticles, getCovers, getTeam } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { getGallerySlides } from '@/lib/data/gallery';
import { findAuthor, authorName, isOrganisationByline } from '@/lib/authors';
import { publicMediaUrl } from '@/lib/media';
import { blogPostingJsonLd, faqPageJsonLd, extractFaq, articleModifiedAt } from '@/lib/article-schema';
import ArticleBody from '@/components/content/ArticleBody';
import { withBrand } from '@/lib/titles';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import ClusterLinks from '@/components/site/ClusterLinks';
import HajjBridge from '@/components/site/HajjBridge';
import JsonLd from '@/components/site/JsonLd';
import { isHajjBridge } from '@/lib/clusters';
import SmartGallery from '@/components/SmartGallery';
import WhatsAppFloat from '@/components/WhatsAppFloat';

// Publish-by-time: an article is public the moment its published_at has
// passed (the anon RLS policy). A page requested BEFORE that moment renders a
// 404 — with revalidate=false that 404 was cached until a cron or an admin
// write revalidated it. Hourly ISR is what makes the release cron optional.
// ISR window (2026-09-21): 6 h, not 1 h. Vercel free-plan ISR writes were
// at 178k/200k because ~258 prerendered pages each regenerated hourly
// (24 x 258 = ~186k/month). Every source behind this page already calls
// revalidateForTable() on an admin write (src/lib/revalidate.js), so the
// timer only has to catch what changes with the CLOCK: the departure
// lifecycle (live -> archived -> retired) and the month-lander year
// rollover, both of which move at day boundaries. The publish-by-time
// listings (home, /blog, sitemap, llms.txt) stay at 3600.
export const revalidate = 21600;

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
  const articleTrust = trustClauses(locale, { license: (await getSettings())?.license_number ?? null });
  return {
    title: { absolute: withBrand(pickLang(article, 'seo_title', locale) ?? pickLang(article, 'title', locale)) },
    // The authored seo_description (else the excerpt) verbatim, lifted to the
    // description floor with the licence clause — through the same composer as
    // every other page, never clampDesc(), which cut mid-sentence.
    description: authoredOr(
      pickLang(article, 'seo_description', locale) ?? pickLang(article, 'excerpt', locale),
      pageDescription(locale, 'article', { vars: { title: pickLang(article, 'title', locale) }, extra: [articleTrust.licence] }),
      { extra: [articleTrust.licence], locale },
    ),
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
  const modifiedAt = articleModifiedAt(article);

  // BlogPosting + FAQPage from ONE builder (src/lib/article-schema.js) — the
  // same nodes the content gate (G13) checks before a post is scheduled. The
  // hero image: the gallery cover, else the typographic card the sibling
  // /hero route draws (title + cluster label + the Bab Makka mark).
  const body = pickLang(article, 'body', locale);
  const heroUrl = coverUrl ?? absoluteUrl(locale, `/blog/${article.slug}/hero`);
  const articleJsonLd = blogPostingJsonLd({ article, locale, authorNode, reviewerNode, coverUrl: heroUrl });
  const faqJsonLd = faqPageJsonLd(extractFaq(body));
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
      <div className="scroll-progress" data-progress aria-hidden="true" suppressHydrationWarning />
      <JsonLd data={articleJsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}

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

        {coverUrl ? (
          <div className="mt-6 overflow-hidden rounded-panel empty:hidden">
            <SmartGallery entityType="articles" entityId={article.id} locale={locale} aspect="16 / 9" sizes="(min-width: 768px) 768px, 100vw" />
          </div>
        ) : (
          // No gallery cover: the typographic hero card (1600×900) drawn by the
          // sibling /hero route — free, cached, alt in the page's language.
          // A plain <img>: the card is already the right size and format.
          <img
            src={`/${locale}/blog/${article.slug}/hero`}
            alt={pickLang(article, 'title', locale) ?? ''}
            width={1600}
            height={900}
            loading="lazy"
            decoding="async"
            className="mt-6 aspect-video w-full rounded-panel object-cover"
          />
        )}

        {body ? (
          // Markdown prose + placeholder tags rendered as request-time server
          // components (src/lib/content-tags.js): prices, departures, quotes,
          // Hijri countdowns and CTAs are never in the prose.
          <ArticleBody body={body} locale={locale} />
        ) : null}

        {/* The DATA-BASIS line (content brief B7): what in this article is live
            and what is checked, under every post, in every locale. */}
        <p className="mt-10 border-t border-bm-black/10 pt-4 text-xs leading-relaxed text-bm-black/55" data-data-basis>
          {t.content.dataBasis}
        </p>
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
