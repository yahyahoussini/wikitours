import { getDictionary } from '@/lib/i18n';
import { getPublishedOffers } from '@/lib/data/content';
import { departuresInMonth } from '@/lib/months';
import { offersForFilter } from '@/lib/content-resolver';

const nf = new Intl.NumberFormat('fr-MA');

/**
 * <PriceRange filter="ramadan|month:n|next|all|occasion:x" /> — « dès X MAD »
 * (and the top of the range when several departures are open), computed from
 * the published offers' tier prices at request time. Renders NOTHING when no
 * inventory matches: a price never comes from the prose, and an empty range is
 * not a sentence.
 */
export default async function PriceRange({ filter, month, occasion, locale }) {
  const t = getDictionary(locale);
  const offers = await getPublishedOffers();
  const f = filter ?? (month ? `month:${month}` : occasion ? `occasion:${occasion}` : 'all');
  const scoped = month ? departuresInMonth(offers, Number(month) - 1) : offersForFilter(offers, f);
  const prices = scoped.map((o) => o.starting_price).filter((p) => typeof p === 'number' && p > 0);
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const line = max > min
    ? t.content.priceRange.replace('{min}', nf.format(min)).replace('{max}', nf.format(max)).replace('{n}', String(scoped.length))
    : t.content.priceFrom.replace('{min}', nf.format(min));
  return (
    <p className="rounded-card border border-bm-gold/40 bg-bm-gold/10 px-5 py-3 font-semibold text-bm-black" data-price-range={f}>
      {line} <span className="block text-xs font-normal text-bm-black/60">{t.content.priceNote}</span>
    </p>
  );
}
