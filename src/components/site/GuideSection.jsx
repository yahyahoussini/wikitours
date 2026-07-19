import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl } from '@/lib/seo';
import { pickLang } from '@/lib/i18n';
import { renderMarkdown, markdownClass } from '@/lib/markdown';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

/**
 * Shared body for the guide pillar and its chapters. Renders ONLY admin
 * content (guide_pages row + faqs) — when the body is missing it shows the
 * honest "en préparation" state, flagged `data-guard="empty"` so the audit
 * fails any such page that is indexable (noindex-until-filled law).
 */
export default function GuideSection({
  locale,
  t,
  path, // locale-relative, e.g. '/guide-omra/budget'
  heading,
  row,
  faqs = [],
  chapterLinks = [], // [{ href, label }] — chapters (pillar) or siblings (child)
  chaptersTitle,
  breadcrumbs,
  whatsappHref,
}) {
  const summary = pickLang(row, 'summary', locale);
  const body = pickLang(row, 'body', locale);
  const lede = summary ?? t.guide.pillarLede;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, path)}#webpage`,
    url: absoluteUrl(locale, path),
    name: heading,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    description: lede,
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  // Article + Person author only when the content really exists (LAW §10).
  const articleJsonLd = body
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: heading,
        inLanguage: locale,
        mainEntityOfPage: absoluteUrl(locale, path),
        publisher: { '@id': `${SITE_URL}/#organization` },
        ...(row?.updated_at ? { dateModified: row.updated_at } : {}),
        ...(row?.created_at ? { datePublished: row.created_at } : {}),
        ...(row?.author_name
          ? {
              author: {
                '@type': 'Person',
                name: row.author_name,
                worksFor: { '@id': `${SITE_URL}/#organization` },
                ...(row.author_sameas_url ? { sameAs: [row.author_sameas_url] } : {}),
              },
            }
          : {}),
      }
    : null;

  const faqJsonLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: pickLang(f, 'question', locale),
          acceptedAnswer: { '@type': 'Answer', text: pickLang(f, 'answer', locale) },
        })),
      }
    : null;

  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <JsonLd data={webPageJsonLd} />
      {articleJsonLd ? <JsonLd data={articleJsonLd} /> : null}
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail className="mt-3" items={breadcrumbs} />

      <h1 className="mt-3 text-3xl font-bold text-bm-black sm:text-4xl">{heading}</h1>
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{lede}</p>

      {row?.author_name ? (
        <p className="mt-2 text-sm text-bm-black/50">
          {t.guide.writtenBy}{' '}
          {row.author_sameas_url ? (
            <a href={row.author_sameas_url} rel="noopener noreferrer" target="_blank" className="font-semibold underline-offset-4 hover:underline">
              {row.author_name}
            </a>
          ) : (
            <span className="font-semibold">{row.author_name}</span>
          )}
          {row.updated_at ? (
            <>
              {` · ${t.pages.updatedOn} `}
              <time dateTime={row.updated_at}>{dateFmt.format(new Date(row.updated_at))}</time>
            </>
          ) : null}
        </p>
      ) : null}

      {body ? (
        <div className={`mt-8 ${markdownClass}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      ) : (
        /* Honest empty state — the audit fails an indexable page showing this. */
        <section data-guard="empty" className="mt-8 rounded-panel border border-dashed border-bm-black/15 bg-bm-black/[0.02] p-6">
          <p className="text-sm leading-relaxed text-bm-black/60">{t.guide.inPreparation}</p>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              data-wt="whatsapp_click"
              data-wt-label="guide_empty"
              className="mt-4 inline-flex rounded-full bg-wiki-blue px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90"
            >
              WhatsApp
            </a>
          ) : null}
        </section>
      )}

      {faqs.length ? (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-bm-black">FAQ</h2>
          <div className="mt-4 flex flex-col gap-3">
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-card border border-bm-black/10 bg-white px-5 py-4 shadow-hairline">
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  {pickLang(f, 'question', locale)}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-bm-black/70">{pickLang(f, 'answer', locale)}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {chapterLinks.length ? (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-bm-black">{chaptersTitle ?? t.guide.chapters}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {chapterLinks.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="block rounded-card border border-bm-black/10 bg-white px-5 py-4 font-semibold text-bm-black shadow-hairline transition hover:border-wiki-blue hover:text-wiki-blue"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Money-hub interlinks: guide ↔ offers surfaces (never orphaned). */}
      <section className="mt-12 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href={`/${locale}/bab-makka`} className="rounded-full border border-bm-gold/50 px-5 py-2 text-bm-gold-deep transition hover:bg-bm-gold/10">
          {t.guide.seeDepartures} — {BRAND.service}
        </Link>
        <Link href={`/${locale}/omra-pas-cher`} className="rounded-full border border-bm-black/15 px-5 py-2 text-bm-black/70 transition hover:border-bm-black/40">
          {t.pages.pasCherTitle}
        </Link>
        <Link href={`/${locale}/barometre-prix-omra`} className="rounded-full border border-bm-black/15 px-5 py-2 text-bm-black/70 transition hover:border-bm-black/40">
          {t.barometer.title}
        </Link>
      </section>

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
