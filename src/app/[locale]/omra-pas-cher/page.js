import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { getPublishedOffers, getCovers, computeMinPrice } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import SeasonalHub from '@/components/site/SeasonalHub';

export const revalidate = false;

const nf = new Intl.NumberFormat('fr-MA');

/** Cheapest first — the whole point of this hub. */
function byPrice(offers) {
  const min = (o) => computeMinPrice(o.tiers) ?? o.starting_price ?? Number.POSITIVE_INFINITY;
  return [...offers].sort((a, b) => min(a) - min(b));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const offers = await getPublishedOffers();
  return {
    title: { absolute: t.pages.pasCherTitle },
    description: t.pages.pasCherIntro,
    alternates: hreflangAlternates(locale, '/omra-pas-cher'),
    // Nothing to rank on with zero offers — noindex until departures exist.
    ...(offers.length ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function OmraPasCherPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [allOffers, settings] = await Promise.all([getPublishedOffers(), getSettings()]);
  const offers = byPrice(allOffers);
  const covers = await getCovers('offers', offers.map((o) => o.id));

  const prices = offers.map((o) => computeMinPrice(o.tiers) ?? o.starting_price).filter((p) => p != null);
  const min = prices.length ? Math.min(...prices) : null;
  const updated = offers.reduce((max, o) => (o.updated_at > max ? o.updated_at : max), '');

  return (
    <SeasonalHub
      locale={locale}
      path="/omra-pas-cher"
      heading={t.pages.pasCherTitle}
      lede={t.pages.pasCherLede.replace('{min}', min != null ? nf.format(min) : '—')}
      intro={t.pages.pasCherIntro}
      offers={offers}
      covers={covers}
      faq={t.pages.pasCherFaq}
      body={t.pages.pasCherBody}
      whatsappHref={waLink(settings?.whatsapp_number)}
      updated={updated || null}
    />
  );
}
