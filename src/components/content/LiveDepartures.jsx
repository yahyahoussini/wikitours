import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { getPublishedOffers, getCovers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { toOfferCard } from '@/lib/offer-card';
import { departuresInMonth, monthPagePath } from '@/lib/months';
import { OfferCard } from '@/components/site/PackagesSection';

/**
 * <LiveDepartures month="10" /> · <LiveDepartures occasion="ramadan" /> ·
 * <LiveDepartures /> — the open departures, as the same cards the hubs use,
 * read from the published offers at request time. Prices, dates, seats and
 * hotels come from the rows, never from the prose around the tag. Empty → one
 * sentence and a link to the lander, no number invented.
 */
export default async function LiveDepartures({ month, occasion, limit, locale }) {
  const t = getDictionary(locale);
  const [offers, settings] = await Promise.all([getPublishedOffers(), getSettings()]);
  const monthIndex = month ? Number(month) - 1 : -1;
  let scoped = offers;
  let landerPath = `/${locale}/bab-makka`;
  if (monthIndex >= 0 && monthIndex < 12) {
    scoped = departuresInMonth(offers, monthIndex);
    landerPath = monthPagePath(monthIndex, locale);
  } else if (occasion) {
    scoped = offers.filter((o) => o.occasion?.slug === occasion);
    landerPath = `/${locale}/omra-${occasion}`;
  }
  const max = Math.max(1, Math.min(12, Number(limit) || 6));
  const shown = scoped.slice(0, max);
  const covers = shown.length ? await getCovers('offers', shown.map((o) => o.id)) : new Map();
  const cardT = { ...t.offer, reserve: t.cta.reserve, whatsappAlt: t.cta.whatsappAlt, details: t.cta.details };
  const anchor = t.clusters.anchors['/bab-makka'];

  return (
    <section data-live-departures={month ?? occasion ?? 'all'}>
      <h2 className="text-2xl font-bold text-bm-black">{t.content.departuresTitle}</h2>
      {shown.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {shown.map((offer) => (
            <OfferCard key={offer.id} offer={toOfferCard(offer, covers.get(offer.id), locale)} locale={locale} t={cardT} whatsappHref={waLink(settings?.whatsapp_number)} compact />
          ))}
        </div>
      ) : (
        <p className="mt-3 leading-relaxed text-bm-black/70">
          {t.content.departuresNone}{' '}
          <Link href={landerPath} className="font-medium text-wiki-blue underline underline-offset-4">{anchor}</Link>
        </p>
      )}
    </section>
  );
}
