import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { routeTitle } from '@/lib/titles';
import { getSettings } from '@/lib/data/settings';
import {
  getPublishedOffers,
  getOccasions,
  getHotels,
  getTeam,
  getTestimonials,
  getFaqs,
  getArticles,
  getDestinations,
  getCovers,
} from '@/lib/data/content';
import { toOfferCard } from '@/lib/offer-card';
import { waLink } from '@/lib/whatsapp';
import { monthName } from '@/lib/months';
import BrandLockup from '@/components/site/BrandLockup';
import JsonLd from '@/components/site/JsonLd';
import SectionBridge from '@/components/site/SectionBridge';
import SelectorBar from '@/components/site/SelectorBar';
import PackagesSection from '@/components/site/PackagesSection';
import {
  Hero,
  StatsBand,
  HotelsSection,
  StepsSection,
  ProofSection,
  MonthsLinks,
  DestinationsSection,
  StorySection,
  GuaranteesStrip,
  BlogTeasers,
  FaqSection,
  FinalCta,
} from '@/components/site/HomeSections';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return {
    title: { absolute: routeTitle('home', locale) },
    description: clampDesc(t.home.intro),
    alternates: hreflangAlternates(locale, ''),
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null; // layout already 404s

  const t = getDictionary(locale);
  const [settings, offers, occasions, hotels, team, testimonials, faqs, articles, destinations] =
    await Promise.all([
      getSettings(),
      getPublishedOffers(),
      getOccasions(),
      getHotels(),
      getTeam(),
      getTestimonials(),
      getFaqs(),
      getArticles(3),
      getDestinations(),
    ]);

  const [offerCovers, hotelCovers, articleCovers] = await Promise.all([
    getCovers('offers', offers.map((o) => o.id)),
    getCovers('hotels', hotels.map((h) => h.id)),
    getCovers('articles', articles.map((a) => a.id)),
  ]);

  const whatsappHref = waLink(settings?.whatsapp_number);
  const activeOccasions = occasions.filter((occasion) =>
    offers.some((o) => o.occasion?.slug === occasion.slug),
  );

  const cardT = {
    ...t.offer,
    reserve: t.cta.reserve,
    whatsappAlt: t.cta.whatsappAlt,
    details: t.cta.details,
    filterAll: t.home.selectorAll,
    monthAll: t.home.selectorAll,
  };

  // WebSite entity — the organization is the sitewide TravelAgency in the layout.
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: BRAND.parent,
    url: absoluteUrl(locale, ''),
    inLanguage: locale,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  // FAQPage lives HERE and only here. The no-stacking rule is about repeating
  // the same block sitewide; the home renders the full FAQ set, so a single
  // owner recovers the answer-engine value without duplicating it everywhere.
  const faqJsonLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.slice(0, 10).map((faq) => ({
          '@type': 'Question',
          name: pickLang(faq, 'question', locale),
          acceptedAnswer: { '@type': 'Answer', text: pickLang(faq, 'answer', locale) },
        })),
      }
    : null;

  return (
    <main>
      <JsonLd data={siteJsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}

      {/* 1 — hero */}
      <Hero locale={locale} />

      {/* 2 — floating selector */}
      <div className="px-4">
        <SelectorBar
          locale={locale}
          occasions={occasions.map((o) => ({ slug: o.slug, name: pickLang(o, 'name', locale) }))}
          monthNames={Array.from({ length: 12 }, (_, i) => monthName(i, locale))}
          labels={{
            occasion: t.home.selectorOccasion,
            month: t.home.selectorMonth,
            all: t.home.selectorAll,
            go: t.home.selectorGo,
          }}
        />
      </div>

      {/* 3 — packages (Bab Makkah light surface) */}
      {offers.length > 0 ? (
        <>
          <section id="offres" className="bg-wiki-white">
            <div className="mx-auto max-w-6xl px-6 py-14">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <BrandLockup locale={locale} size="lg" />
                  <h2 className="mt-3 text-3xl font-bold text-bm-black">{t.home.packagesTitle}</h2>
                </div>
              </div>
              <PackagesSection
                offers={offers.map((o) => toOfferCard(o, offerCovers.get(o.id), locale))}
                occasions={activeOccasions.map((o) => ({
                  slug: o.slug,
                  name_fr: o.name_fr,
                  [`name_${locale}`]: pickLang(o, 'name', locale),
                }))}
                locale={locale}
                t={cardT}
                whatsappHref={whatsappHref}
              />
            </div>
          </section>

          {/* 4 — why-us stays on the dark surface */}
          <SectionBridge from="light" to="dark" />
          <StatsBand locale={locale} settings={settings} />
        </>
      ) : null}

      {/* Proof directly under the why/stats band. With offers above, it keeps
          the dark surface through the reels then bridges back to light; the
          leading/trailing bridges are handled inside via enterDark. */}
      <ProofSection
        locale={locale}
        testimonials={testimonials}
        settings={settings}
        enterDark={offers.length > 0}
      />

      {/* 5 — hotels */}
      <HotelsSection locale={locale} hotels={hotels} covers={hotelCovers} />

      {/* 6 — how it works */}
      <StepsSection locale={locale} />

      {/* 9 — months hub */}
      <MonthsLinks locale={locale} />

      {/* 10 — Wiki Tours destinations */}
      <DestinationsSection locale={locale} destinations={destinations} />

      {/* 11 — story + team */}
      <StorySection locale={locale} team={team} settings={settings} fallbackStory={t.home.intro} />

      {/* 12 — guarantees + trust-marks marquee (Saudia + hotel names) */}
      <GuaranteesStrip
        locale={locale}
        license={settings?.license_number}
        marks={['Saudia', ...hotels.map((h) => h.name)]}
      />

      {/* 13 — blog */}
      <BlogTeasers locale={locale} articles={articles} covers={articleCovers} />

      {/* 14 — FAQ */}
      <FaqSection locale={locale} faqs={faqs} />

      {/* 15 — final CTA */}
      <SectionBridge from="light" to="dark" />
      <FinalCta locale={locale} />

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
