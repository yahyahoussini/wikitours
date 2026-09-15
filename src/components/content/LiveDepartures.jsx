import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { getPublishedOffers, getCovers } from '@/lib/data/content';
import { getSettings } from '@/lib/data/settings';
import { waLink } from '@/lib/whatsapp';
import { toOfferCard } from '@/lib/offer-card';
import { departuresInMonth, monthPagePath } from '@/lib/months';
import { offersForFilter } from '@/lib/content-resolver';
import { OfferCard } from '@/components/site/PackagesSection';

/**
 * <LiveDepartures filter="ramadan|hajj|month:n|next|all|occasion:x" limit="n" />
 * (run-1 spelling `month="10"` / `occasion="ramadan"` still accepted) — the
 * open departures, as the same cards the hubs use, read from the published
 * offers at request time. Prices, dates, seats and hotels come from the rows,
 * never from the prose around the tag. Empty → one sentence and a link to the
 * lander, no number invented. `hajj` never lists anything: the agency sells no
 * Hajj package online, so the block sends the reader to the interest page.
 */
export default async function LiveDepartures({ month, occasion, filter, limit, locale }) {
  const t = getDictionary(locale);
  const [offers, settings] = await Promise.all([getPublishedOffers(), getSettings()]);
  const monthIndex = month ? Number(month) - 1 : -1;
  let scoped = offers;
  let landerPath = `/${locale}/bab-makka`;
  let anchor = t.clusters.anchors['/bab-makka'];
  const f = filter ?? (monthIndex >= 0 ? `month:${monthIndex + 1}` : occasion ? `occasion:${occasion}` : 'all');
  if (monthIndex >= 0 && monthIndex < 12) {
    scoped = departuresInMonth(offers, monthIndex);
    landerPath = `/${locale}${monthPagePath(monthIndex)}`;
  } else {
    scoped = offersForFilter(offers, f);
    if (f === 'ramadan') { landerPath = `/${locale}/omra-ramadan`; anchor = t.clusters.anchors['/omra-ramadan']; }
    else if (f === 'hajj') { landerPath = `/${locale}/hajj`; anchor = t.clusters.anchors['/hajj']; }
    else if (f.startsWith('month:')) landerPath = `/${locale}${monthPagePath(Number(f.slice(6)) - 1)}`;
    else if (f.startsWith('occasion:')) landerPath = `/${locale}/omra-${f.slice(9)}`;
  }
  const max = Math.max(1, Math.min(12, Number(limit) || 6));
  const shown = scoped.slice(0, max);
  const covers = shown.length ? await getCovers('offers', shown.map((o) => o.id)) : new Map();
  const cardT = { ...t.offer, reserve: t.cta.reserve, whatsappAlt: t.cta.whatsappAlt, details: t.cta.details };

  return (
    <section data-live-departures={f}>
      <h2 className="text-2xl font-bold text-bm-black">{t.content.departuresTitle}</h2>
      {shown.length ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {shown.map((offer) => (
            <OfferCard key={offer.id} offer={toOfferCard(offer, covers.get(offer.id), locale)} locale={locale} t={cardT} whatsappHref={waLink(settings?.whatsapp_number)} compact />
          ))}
        </div>
      ) : (
        <p className="mt-3 leading-relaxed text-bm-black/70">
          {f === 'hajj' ? t.content.hajjNoPackage : t.content.departuresNone}{' '}
          <Link href={landerPath} className="font-medium text-wiki-blue underline underline-offset-4">{anchor}</Link>
        </p>
      )}
    </section>
  );
}
