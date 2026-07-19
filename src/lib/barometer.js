import { computeMinPrice } from '@/lib/data/content';

/**
 * Price-barometer aggregation (/barometre-prix-omra): min/avg per departure
 * month, computed ONLY from published offers with a real price. Shared by the
 * page and the sitemap so the indexability decision is identical everywhere.
 */

/** A period renders only with ≥3 real offers behind it — below that a
 *  min/avg is an anecdote, not a statistic (original-data law). */
export const MIN_OFFERS_PER_PERIOD = 3;

export function computePeriods(offers) {
  const buckets = new Map();
  let lastChanged = null;
  for (const offer of offers) {
    if (!offer.date_start) continue;
    const price = computeMinPrice(offer.tiers) ?? offer.starting_price;
    if (typeof price !== 'number' || price <= 0) continue;
    const d = new Date(offer.date_start);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket =
      buckets.get(key) ?? { key, year: d.getUTCFullYear(), monthIndex: d.getUTCMonth(), prices: [] };
    bucket.prices.push(price);
    buckets.set(key, bucket);
    if (offer.updated_at && (!lastChanged || offer.updated_at > lastChanged)) lastChanged = offer.updated_at;
  }
  const periods = [...buckets.values()]
    .filter((b) => b.prices.length >= MIN_OFFERS_PER_PERIOD)
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((b) => ({
      ...b,
      count: b.prices.length,
      min: Math.min(...b.prices),
      avg: Math.round(b.prices.reduce((s, p) => s + p, 0) / b.prices.length),
    }));
  return { periods, lastChanged, totalOffers: periods.reduce((s, p) => s + p.count, 0) };
}
