import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '@/lib/i18n';
import { hreflangAlternates } from '@/lib/seo';
import { pageDescription, trustClauses } from '@/lib/page-seo';
import { getPublishedOffers, getCovers, computeMinPrice } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import SeasonalHub from '@/components/site/SeasonalHub';

// Date-sensitive surface. Availability, validThrough and the "has this departed?"
// branch are all computed from today's date AT RENDER TIME, so revalidate=false
// froze them: a departure could pass and the cached HTML would keep advertising
// InStock with a validThrough already in the past, until an admin happened to
// edit something. Hourly ISR lets the passage of time correct itself. On-demand
// invalidation from admin writes (revalidateForTable) still applies on top, and
// regeneration only costs an ISR write when the page is actually requested.
export const revalidate = 3600;

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
  const pasCherTrust = trustClauses(locale, { license: (await getSettings())?.license_number ?? null });
  return {
    title: { absolute: t.pages.pasCherTitle },
    description: pageDescription(locale, 'pasCher', { extra: [pasCherTrust.licence, pasCherTrust.noPayment] }),
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
