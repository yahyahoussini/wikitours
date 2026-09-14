import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc, hotelNode, hotelNodeId, tripNodeId } from '@/lib/seo';
import { pageDescription, trustClauses, authoredOr } from '@/lib/page-seo';
import { titleOr, routeTitle } from '@/lib/titles';
import { getHotelBySlug, getHotels, getCovers, getPublishedOffers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { publicMediaUrl } from '@/lib/media';
import { waLink } from '@/lib/whatsapp';
import { toOfferCard } from '@/lib/offer-card';
import BrandLockup from '@/components/site/BrandLockup';
import BreadcrumbTrail from '@/components/site/BreadcrumbTrail';
import JsonLd from '@/components/site/JsonLd';
import { OfferCard } from '@/components/site/PackagesSection';
import SmartGallery from '@/components/SmartGallery';
import CtaBlock from '@/components/CtaBlock';
import WhatsAppFloat from '@/components/WhatsAppFloat';

// Hourly ISR, like the departure pages: the departures list below is
// date-sensitive (a departure drops out once it has left, its badge flips at
// 0 seats). revalidate=false would freeze that until the next admin edit.
export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound(); // metadata-phase 404: real status before streaming
  const hotelTrust = trustClauses(locale, { license: (await getSettings())?.license_number ?? null });
  return {
    // absolute → no template suffix (keeps titles ≤60). The admin's seo_title
    // wins when it is a real title; a fragment ("Swissôtel Makkah") yields to
    // the authored template, like descriptions do.
    title: {
      absolute: titleOr(
        pickLang(hotel, 'seo_title', locale),
        routeTitle('hotel', locale, {
          name: hotel.name,
          city: hotel.city === 'madinah' ? getDictionary(locale).offer.madinah : getDictionary(locale).offer.makkah,
        }),
        locale,
      ),
    },
    // Admin seo_description wins; otherwise an authored template, NOT a slice
    // of the body paragraph (which truncated mid-sentence).
    description: authoredOr(
      pickLang(hotel, 'seo_description', locale),
      pageDescription(locale, hotel.distance_to_haram_m ? 'hotel' : 'hotelNoDistance', {
        vars: {
          name: hotel.name,
          city: hotel.city === 'madinah' ? getDictionary(locale).offer.madinah : getDictionary(locale).offer.makkah,
          distance: hotel.distance_to_haram_m,
        },
        extra: [hotelTrust.noPayment, hotelTrust.whatsapp],
      }),
      { extra: [hotelTrust.noPayment, hotelTrust.whatsapp], locale },
    ),
    alternates: hreflangAlternates(locale, `/hotel/${slug}`),
  };
}

/** Prebuild every hotel × locale so the first crawl never pays a cold render. */
export async function generateStaticParams() {
  const hotels = await getHotels();
  return LOCALES.flatMap((locale) => hotels.map((h) => ({ locale, slug: h.slug })));
}

export default async function HotelPage({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [hotel, settings] = await Promise.all([getHotelBySlug(slug), getSettings()]);
  if (!hotel) notFound();

  const t = getDictionary(locale);
  const description = pickLang(hotel, 'description', locale);
  const cityLabel = hotel.city === 'makkah' ? t.offer.makkah : t.offer.madinah;
  const whatsappHref = waLink(settings?.whatsapp_number);

  const covers = await getCovers('hotels', [hotel.id]);
  const coverPath = covers.get(hotel.id)?.path;
  const coverUrl = coverPath ? publicMediaUrl(coverPath) : null;

  // Hotel entity — "which hotel is closest to the Haram" is exactly the kind of
  // question answer engines field. ONE builder (hotelNode) is shared with the
  // /hotels-omra ItemList and the departure pages' itinerary, so this hotel is
  // the same node (same @id, address, numeric distance) wherever it appears.
  const hotelJsonLd = {
    '@context': 'https://schema.org',
    ...hotelNode(hotel, locale),
    ...(description ? { description } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
  };

  // Departures that stay in this hotel: published, future offers whose
  // published gammes (or the legacy offer-level hotel) reference it — the same
  // query the listings use, so a hotel can never advertise a departure the
  // hub does not.
  const usesHotel = (o) =>
    o.hotel_makkah_id === hotel.id ||
    o.hotel_madinah_id === hotel.id ||
    (o.tiers ?? []).some((tier) => tier.hotel_makkah_id === hotel.id || tier.hotel_madinah_id === hotel.id);
  const departures = (await getPublishedOffers()).filter(usesHotel);
  const departureCovers = departures.length ? await getCovers('offers', departures.map((o) => o.id)) : new Map();
  const cardT = { ...t.offer, reserve: t.cta.reserve, whatsappAlt: t.cta.whatsappAlt, details: t.cta.details };

  // Machine-readable twin of that list. TouristTrip, never Product: a Product
  // without offers fails the Rich Results Test, and the offers belong on the
  // departure page. Each trip's itinerary points back at THIS hotel's @id,
  // defined above on the same page — the reverse of the departure page's
  // itinerary → Hotel, so the relationship reads in both directions.
  const departuresJsonLd = departures.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.offer.hotelDeparturesTitle, // the visible <h2>, verbatim — markup never says what the page does not
        numberOfItems: departures.length,
        itemListElement: departures.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'TouristTrip',
            '@id': tripNodeId(o.slug),
            name: pickLang(o, 'title', locale) ?? o.slug,
            url: absoluteUrl(locale, `/omra/${o.slug}`),
            ...(o.date_start ? { departureTime: o.date_start } : {}),
            ...(o.date_end ? { arrivalTime: o.date_end } : {}),
            provider: { '@id': `${SITE_URL}/#organization` },
            itinerary: { '@id': hotelNodeId(hotel.slug) },
          },
        })),
      }
    : null;

  // Auto-FAQ computed from DB fields only (LAW: never invented): the distance
  // question is the long-tail query these pages exist for. Answers are built
  // to sit in the audit's 25–75-word extractability window.
  const fill = (s) =>
    s
      .replaceAll('{name}', hotel.name)
      .replace('{m}', String(hotel.distance_to_haram_m))
      .replace('{city}', cityLabel)
      .replace('{stars}', String(hotel.stars ?? ''));
  const hotelFaqs = [];
  if (hotel.distance_to_haram_m != null) {
    hotelFaqs.push({
      q: fill(t.offer.hotelFaqDistanceQ),
      a: fill(
        [
          t.offer.hotelFaqDistanceBase,
          hotel.stars ? t.offer.hotelFaqDistanceStars : t.offer.hotelFaqDistanceNoStars,
          t.offer.hotelFaqDistanceTail,
        ].join(' '),
      ),
    });
  }
  if (hotel.breakfast_included) {
    hotelFaqs.push({ q: fill(t.offer.hotelFaqBreakfastQ), a: fill(t.offer.hotelFaqBreakfastA) });
  }
  const faqJsonLd = hotelFaqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: hotelFaqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <JsonLd data={hotelJsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      {departuresJsonLd ? <JsonLd data={departuresJsonLd} /> : null}
      <BrandLockup locale={locale} size="sm" />

      <BreadcrumbTrail locale={locale}
        className="mt-3"
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: BRAND.service, href: `/${locale}/bab-makka` },
          { label: hotel.name },
        ]}
      />

      <h1 className="mt-3 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
        {hotel.name}
        {hotel.stars ? <span className="ms-3 text-bm-gold">{'★'.repeat(hotel.stars)}</span> : null}
      </h1>

      {/* Answer-first crawlable facts (LAWS §5) */}
      <p className="mt-2 text-lg text-bm-black/70">
        {cityLabel}
        {hotel.distance_to_haram_m != null
          ? ` · ${t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m)}`
          : ''}
        {hotel.breakfast_included ? ` · ${t.offer.breakfastIncluded}` : ''}
      </p>

      <div className="mt-8 overflow-hidden rounded-panel shadow-lift">
        <SmartGallery
          entityType="hotels"
          entityId={hotel.id}
          locale={locale}
          aspect="16 / 9"
          sizes="(min-width: 1024px) 896px, 100vw"
        />
      </div>

      {description ? (
        <p className="mt-8 max-w-prose whitespace-pre-line text-lg leading-relaxed text-bm-black/80">
          {description}
        </p>
      ) : null}

      {departures.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-bm-black">{t.offer.hotelDeparturesTitle}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {departures.map((o) => (
              <OfferCard
                key={o.id}
                compact
                offer={toOfferCard(o, departureCovers.get(o.id), locale)}
                locale={locale}
                t={cardT}
                whatsappHref={whatsappHref}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hotelFaqs.length ? (
        <section className="mt-10 max-w-prose">
          <h2 className="text-xl font-bold text-bm-black">{t.offer.faqTitle}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {hotelFaqs.map((faq, i) => (
              <details key={faq.q} open={i === 0} className="group rounded-card border border-bm-black/10 bg-white px-5 py-4 shadow-hairline">
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  {faq.q}
                </summary>
                <p data-faq-answer className="mt-3 text-sm leading-relaxed text-bm-black/70">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* Reciprocal link to the comparison hub — closes the cluster loop. */}
      <p className="mt-6 text-sm font-semibold">
        <Link href={`/${locale}/hotels-omra`} className="text-wiki-blue underline-offset-4 hover:underline">
          {t.pages.hotelsCompareTitle} →
        </Link>
      </p>

      {whatsappHref ? (
        <div className="mt-10">
          <CtaBlock
            primaryLabel={t.cta.reserve}
            primaryHref={whatsappHref}
            whatsappHref={whatsappHref}
            whatsappLabel={t.cta.whatsappAlt}
          />
        </div>
      ) : null}

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
