import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { getDictionary, isLocale, pickLang } from '@/lib/i18n';
import { SITE_URL, absoluteUrl, hreflangAlternates, clampDesc } from '@/lib/seo';
import { getHotels } from '@/lib/data/content';
import BrandLockup from '@/components/site/BrandLockup';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import JsonLd from '@/components/site/JsonLd';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const revalidate = false;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: { absolute: t.pages.hotelsCompareTitle },
    description: clampDesc(t.pages.hotelsCompareIntro),
    alternates: hreflangAlternates(locale, '/hotels-omra'),
  };
}

/** Makkah first, then nearest-to-Haram first; unknown distances sink to the end. */
function ranked(hotels) {
  const rank = (h) => (h.city === 'makkah' ? 0 : 1);
  const dist = (h) => (h.distance_to_haram_m == null ? Number.POSITIVE_INFINITY : h.distance_to_haram_m);
  return [...hotels].sort((a, b) => rank(a) - rank(b) || dist(a) - dist(b));
}

/**
 * /hotels-omra — an honest comparison table of the partner hotels by walking
 * distance to the Haram. Comparison tables are what AI answer engines pull from
 * for "which hotel is closest / best" questions, and this is built entirely
 * from real DB distances (LAWS §6/§10) — no invented numbers.
 */
export default async function HotelsComparePage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const hotels = ranked(await getHotels());
  if (!hotels.length) notFound();

  const cityLabel = (c) => (c === 'makkah' ? t.offer.makkah : t.offer.madinah);
  const closest = hotels.find((h) => h.distance_to_haram_m != null) ?? hotels[0];

  const lede = t.pages.hotelsCompareLede
    .replace('{n}', hotels.length)
    .replace('{closest}', closest.name)
    .replace('{closestM}', closest.distance_to_haram_m ?? '—');

  // ItemList of Hotel entities in ranked order — the machine-readable twin of
  // the visible table, so the ranking an engine cites matches what users see.
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t.pages.hotelsCompareTitle,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: hotels.length,
    itemListElement: hotels.map((h, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Hotel',
        name: h.name,
        url: absoluteUrl(locale, `/hotel/${h.slug}`),
        address: {
          '@type': 'PostalAddress',
          addressLocality: h.city === 'makkah' ? 'Makkah' : 'Madinah',
          addressCountry: 'SA',
        },
        ...(h.stars ? { starRating: { '@type': 'Rating', ratingValue: h.stars, bestRating: 5 } } : {}),
        ...(h.distance_to_haram_m != null
          ? {
              amenityFeature: {
                '@type': 'LocationFeatureSpecification',
                name: t.offer.distanceToHaram.replace('{m}', h.distance_to_haram_m),
                value: true,
              },
            }
          : {}),
      },
    })),
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(locale, '/hotels-omra')}#webpage`,
    url: absoluteUrl(locale, '/hotels-omra'),
    name: t.pages.hotelsCompareTitle,
    description: lede,
    inLanguage: locale,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-answer]'] },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <JsonLd data={itemListJsonLd} />
      <JsonLd data={webPageJsonLd} />

      <BrandLockup locale={locale} size="sm" />
      <Breadcrumbs
        className="mt-3"
        items={[
          { label: t.nav.home, href: `/${locale}` },
          { label: BRAND.service, href: `/${locale}/bab-makka` },
          { label: t.pages.colHotel },
        ]}
      />

      <h1 className="mt-3 text-3xl font-bold leading-tight text-bm-black sm:text-4xl">
        {t.pages.hotelsCompareTitle}
      </h1>

      {/* Answer-first lede — the extractable sentence (which hotel is closest). */}
      <p data-answer className="mt-4 max-w-2xl text-lg leading-relaxed text-bm-black/70">
        {lede}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bm-black/50">
        {t.pages.hotelsCompareIntro}
      </p>

      <div className="mt-8 overflow-x-auto rounded-panel border border-bm-black/10 shadow-hairline">
        <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-bm-black/10 bg-bm-black/[0.02] text-xs font-bold uppercase tracking-wide text-bm-black/50">
              <th scope="col" className="px-4 py-3 text-start">{t.pages.colHotel}</th>
              <th scope="col" className="px-4 py-3 text-start">{t.pages.colCity}</th>
              <th scope="col" className="px-4 py-3 text-start">{t.pages.colStars}</th>
              <th scope="col" className="px-4 py-3 text-start">{t.pages.colDistance}</th>
              <th scope="col" className="px-4 py-3 text-start">{t.pages.colBreakfast}</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id} className="border-b border-bm-black/5 last:border-0 hover:bg-bm-gold/[0.04]">
                <th scope="row" className="px-4 py-3 text-start font-semibold text-bm-black">
                  <Link href={`/${locale}/hotel/${h.slug}`} className="hover:text-bm-gold">
                    {h.name}
                  </Link>
                </th>
                <td className="px-4 py-3 text-bm-black/70">{cityLabel(h.city)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-bm-gold">
                  {h.stars ? '★'.repeat(h.stars) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-bm-black">
                  {h.distance_to_haram_m != null ? `${h.distance_to_haram_m} m` : '—'}
                </td>
                <td className="px-4 py-3 text-bm-black/70">
                  {h.breakfast_included ? t.pages.yes : t.pages.no}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href={`/${locale}/bab-makka`} className="text-wiki-blue underline-offset-4 hover:underline">
          {t.nav.offers} →
        </Link>
        <Link href={`/${locale}/agence-omra-casablanca`} className="text-wiki-blue underline-offset-4 hover:underline">
          {t.pages.contactTitle} →
        </Link>
      </div>

      <WhatsAppFloat locale={locale} />
    </main>
  );
}
