import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { getDictionary, pickLang } from '@/lib/i18n';
import { SITE_URL, absoluteUrl } from '@/lib/seo';
import { toOfferCard } from '@/lib/offer-card';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import OffersPriceTable from '@/components/site/OffersPriceTable';
import PackagesSection from '@/components/site/PackagesSection';
import WhatsAppFloat from '@/components/WhatsAppFloat';

/**
 * Evergreen seasonal SEO hub (pas-cher, ramadan, …). Permanent URL; any year
 * lives in the H1/content only — dates are data, never URLs (CLAUDE.md). Lists
 * REAL DB offers and generically-true FAQ; nothing factual is invented. Empty
 * hubs are set noindex by the calling page until they have departures.
 */
export default function SeasonalHub({ locale, path, heading, lede, intro, offers, covers, faq = [], whatsappHref, updated }) {
  const t = getDictionary(locale);
  const url = absoluteUrl(locale, path);
  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
    filterAll: t.archive.filterAll,
    monthAll: t.home.selectorMonth,
  };

  const itemList = offers.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: heading,
        numberOfItems: offers.length,
        itemListElement: offers.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absoluteUrl(locale, `/omra/${o.slug}`),
          name: pickLang(o, 'title', locale) ?? o.slug,
        })),
      }
    : null;

  // Only emit FAQ schema for real answers (defensive — never ship a placeholder).
  const realFaq = faq.filter((f) => f.a && !f.a.includes('[CONTENT NEEDED]'));
  const faqJsonLd = realFaq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: realFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: heading,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    ...(lede ? { description: lede } : {}),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, { dateStyle: 'long' });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
      <JsonLd data={webPage} />
      {itemList ? <JsonLd data={itemList} /> : null}
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}

      <BrandLockup locale={locale} size="sm" />
      <BreadcrumbTrail
        className="mt-3"
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: BRAND.service, href: `/${locale}/bab-makka` },
          { label: heading },
        ]}
      />

      <h1 className="mt-3 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">{heading}</h1>
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">{lede}</p>
      {intro ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bm-black/50">{intro}</p> : null}
      {updated ? (
        <p className="mt-3 text-xs text-bm-black/40">
          {t.pages.seasonalUpdated} <time dateTime={updated}>{dateFmt.format(new Date(updated))}</time>
        </p>
      ) : null}

      {offers.length ? (
        <div className="mt-8">
          <PackagesSection
            offers={offers.map((o) => toOfferCard(o, covers.get(o.id), locale))}
            occasions={[]}
            locale={locale}
            t={cardT}
            whatsappHref={whatsappHref}
          />
        </div>
      ) : (
        <p className="mt-8 max-w-lg rounded-panel border border-bm-gold/25 bg-bm-gold/5 p-6 text-sm leading-relaxed text-bm-black/70">
          {t.months.alertPrompt}{' '}
          <Link href={`/${locale}/bab-makka`} className="font-semibold text-bm-gold underline-offset-4 hover:underline">
            {t.cta.discoverOffers} →
          </Link>
        </p>
      )}

      {/* AEO: the same offers as a real, extractable price table (DB-driven). */}
      <OffersPriceTable offers={offers} locale={locale} t={t} />

      {realFaq.length ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold text-bm-black">FAQ</h2>
          <div className="mt-4 flex flex-col gap-3">
            {realFaq.map((f) => (
              <details key={f.q} className="group rounded-card border border-bm-black/5 bg-white px-5 py-4 shadow-hairline">
                <summary className="cursor-pointer list-none font-semibold text-bm-black marker:content-none">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-bm-black/70">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
