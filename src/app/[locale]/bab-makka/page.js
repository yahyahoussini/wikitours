import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { getPublishedOffers, getOccasions, getFaqs, getCovers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { toOfferCard } from '@/lib/offer-card';
import { waLink } from '@/lib/whatsapp';
import { OMRA_YEAR, MONTH_SLUGS, monthName } from '@/lib/months';
import { SITE_URL, absoluteUrl, hreflangAlternates } from '@/lib/seo';
import { routeTitle } from '@/lib/titles';
import BrandLockup from '@/components/site/BrandLockup';
import PackagesSection from '@/components/site/PackagesSection';
import JsonLd from '@/components/site/JsonLd';
import { StepsSection, FaqSection, MonthsLinks } from '@/components/site/HomeSections';
import LeadForm from '@/components/LeadForm';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

const nf = new Intl.NumberFormat('fr-MA');

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: { absolute: routeTitle('babmakkah', locale) },
    description: t.brand.premiumService,
    alternates: hreflangAlternates(locale, '/bab-makka'),
  };
}

export default async function BabMakkahPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const [offers, occasions, faqs, settings] = await Promise.all([
    getPublishedOffers(),
    getOccasions(),
    getFaqs('confiance'),
    getSettings(),
  ]);
  const covers = await getCovers('offers', offers.map((o) => o.id));
  const whatsappHref = waLink(settings?.whatsapp_number);

  // Computed answer-first block — every figure straight from the DB.
  const open = offers.filter((o) => o.status !== 'full');
  const minPrice = Math.min(...open.map((o) => o.starting_price).filter((p) => p != null));
  const distances = open
    .flatMap((o) => [o.tiers?.[0]?.distance_to_haram_m ?? o.tiers?.[0]?.hotel_makkah?.distance_to_haram_m])
    .filter((d) => d != null);
  const nextDeparture = open
    .map((o) => o.date_start)
    .filter(Boolean)
    .sort()[0];
  const lastUpdated = offers
    .map((o) => o.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : `${locale}-MA`, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const answer =
    open.length > 0 && Number.isFinite(minPrice) && distances.length && nextDeparture
      ? t.archive.answerLine
          .replace('{n}', open.length)
          .replace('{min}', nf.format(minPrice))
          .replace('{dmin}', Math.min(...distances))
          .replace('{dmax}', Math.max(...distances))
          .replace('{date}', dateFmt.format(new Date(nextDeparture)))
      : null;

  const activeOccasions = occasions.filter((occasion) =>
    offers.some((o) => o.occasion?.slug === occasion.slug),
  );

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
    filterAll: t.archive.filterAll,
    monthAll: t.home.selectorMonth,
  };

  // ItemList of the programmes (LAWS §5) — crawlable list of every offer URL.
  const itemListJsonLd = offers.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.archive.title,
        numberOfItems: offers.length,
        itemListElement: offers.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absoluteUrl(locale, `/omra/${o.slug}`),
          name: pickLang(o, 'title', locale) ?? o.slug,
        })),
      }
    : null;

  // WebPage + speakable: tells answer engines which sentence IS the answer.
  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, '/bab-makka')}#webpage`,
    url: absoluteUrl(locale, '/bab-makka'),
    name: t.archive.title,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    ...(answer ? { description: answer } : {}),
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  return (
    <div className="bg-wiki-white text-bm-black">
      {itemListJsonLd ? <JsonLd data={itemListJsonLd} /> : null}
      <JsonLd data={webPageJsonLd} />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        {/* Compact dark hero */}
        <header>
          <BrandLockup locale={locale} size="md" />
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            {t.archive.title}
          </h1>
          {answer ? (
            <p
              data-answer
              className="mt-4 max-w-2xl rounded-card border border-bm-gold/30 bg-bm-gold/5 px-5 py-4 text-lg leading-relaxed text-bm-black/80"
            >
              {answer}
            </p>
          ) : null}
          {lastUpdated ? (
            <p className="mt-2 text-xs text-bm-black/60">
              {t.archive.lastUpdated} : {dateFmt.format(new Date(lastUpdated))}
            </p>
          ) : null}
        </header>

        <h2 className="sr-only">{t.home.packagesTitle}</h2>
        <div className="mt-8">
          <PackagesSection
            mode="archive"
            offers={offers.map((offer) => toOfferCard(offer, covers.get(offer.id), locale))}
            occasions={activeOccasions.map((o) => ({
              slug: o.slug,
              name_fr: o.name_fr,
              [`name_${locale}`]: pickLang(o, 'name', locale),
            }))}
            months={MONTH_SLUGS.map((slug, i) => ({ value: String(i), label: `${monthName(i, locale)} ${OMRA_YEAR}` }))}
            locale={locale}
            t={cardT}
            whatsappHref={whatsappHref}
          />
        </div>

        {/* Omra sur mesure — captures demand that fits no card (zero inventory cost) */}
        <section className="mt-14 rounded-panel border border-bm-gold/30 bg-white shadow-hairline p-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-bm-black">{t.archive.surMesureTitle}</h2>
              <p className="accent-line mt-2 max-w-md text-lg text-bm-black/80">{t.archive.surMesureBody}</p>
            </div>
            <div>
              <LeadForm locale={locale} labels={t.form} source="sur_mesure" whatsappNumber={settings?.whatsapp_number} />
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wt="whatsapp_click"
                  data-wt-label="sur_mesure"
                  className="mt-3 inline-block text-xs text-bm-black/60 underline-offset-4 hover:text-bm-black hover:underline"
                >
                  {t.cta.whatsappAlt}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {/* Hajj honest block (LAWS §6: interest-only) */}
        <section className="mt-14 max-w-2xl rounded-panel border border-bm-black/10 bg-white shadow-hairline p-6">
          <h2 className="text-xl font-bold text-bm-black">{t.archive.hajjTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-bm-black/70">{t.archive.hajjBody}</p>
          <Link href={`/${locale}/hajj`} className="mt-3 inline-block text-sm font-semibold text-bm-gold underline-offset-4 hover:underline">
            {t.hajjPage.interestCta} →
          </Link>
        </section>
      </main>

      <div className="bg-wiki-white text-bm-black">
        <StepsSection locale={locale} />
        <FaqSection locale={locale} faqs={faqs.slice(0, 4)} title={t.archive.howToTitle} />
        <MonthsLinks locale={locale} />
      </div>
      <WhatsAppFloat locale={locale} />
    </div>
  );
}
