import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang, LOCALES } from '@/lib/i18n';
import { absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { withBrand } from '@/lib/titles';
import { getHotelBySlug, getHotels, getCovers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { publicMediaUrl } from '@/lib/media';
import { waLink } from '@/lib/whatsapp';
import BrandLockup from '@/components/site/BrandLockup';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import JsonLd from '@/components/site/JsonLd';
import SmartGallery from '@/components/SmartGallery';
import CtaBlock from '@/components/CtaBlock';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound(); // metadata-phase 404: real status before streaming
  return {
    // absolute → no template suffix (keeps titles ≤60); description clamped ≤155.
    title: { absolute: withBrand(pickLang(hotel, 'seo_title', locale) ?? hotel.name) },
    description: clampDesc(pickLang(hotel, 'seo_description', locale) ?? pickLang(hotel, 'description', locale)),
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
  // question answer engines field, so the distance is modelled as an amenity.
  const amenities = [
    hotel.distance_to_haram_m != null
      ? {
          '@type': 'LocationFeatureSpecification',
          name: t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m),
          value: true,
        }
      : null,
    hotel.breakfast_included
      ? { '@type': 'LocationFeatureSpecification', name: t.offer.breakfastIncluded, value: true }
      : null,
  ].filter(Boolean);

  const hotelJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    ...(description ? { description } : {}),
    ...(coverUrl ? { image: coverUrl } : {}),
    url: absoluteUrl(locale, `/hotel/${slug}`),
    address: {
      '@type': 'PostalAddress',
      addressLocality: hotel.city === 'makkah' ? 'Makkah' : 'Madinah',
      addressCountry: 'SA',
    },
    ...(hotel.stars
      ? { starRating: { '@type': 'Rating', ratingValue: hotel.stars, bestRating: 5 } }
      : {}),
    ...(amenities.length ? { amenityFeature: amenities } : {}),
  };

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.home, item: absoluteUrl(locale, '') },
      { '@type': 'ListItem', position: 2, name: BRAND.service, item: absoluteUrl(locale, '/bab-makka') },
      { '@type': 'ListItem', position: 3, name: hotel.name },
    ],
  };

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <JsonLd data={hotelJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {faqJsonLd ? <JsonLd data={faqJsonLd} /> : null}
      <BrandLockup locale={locale} size="sm" />

      <Breadcrumbs
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

      {hotelFaqs.length ? (
        <section className="mt-10 max-w-prose">
          <h2 className="text-xl font-bold text-bm-black">{t.offer.faqTitle}</h2>
          <div className="mt-4 flex flex-col gap-3">
            {hotelFaqs.map((faq, i) => (
              <details key={faq.q} open={i === 0} className="group rounded-card border border-bm-black/10 bg-white px-5 py-4 shadow-hairline">
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-bm-black/70">{faq.a}</p>
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
