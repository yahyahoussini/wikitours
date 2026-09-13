import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { getPublishedOffers } from '@/lib/data/content';

const nf = new Intl.NumberFormat('fr-MA');

/**
 * The Hajj → Omra bridge, at the end of the four Hajj-lottery articles
 * (src/lib/clusters.js HAJJ_BRIDGE_SLUGS): an applicant not drawn in the
 * national lottery has budget and intent and no trip. Every figure is live —
 * the number of open departures and the lowest per-person price come from
 * the published offers; with none open the block still links the hub, with
 * no number invented.
 */
export default async function HajjBridge({ locale }) {
  const t = getDictionary(locale);
  const offers = await getPublishedOffers();
  const prices = offers.map((o) => o.starting_price).filter((p) => typeof p === 'number' && p > 0);
  const body = prices.length
    ? t.clusters.bridgeBody.replace('{n}', String(offers.length)).replace('{minPrice}', nf.format(Math.min(...prices)))
    : t.clusters.bridgeBodyNoPrice;
  return (
    <aside className="mt-10 rounded-panel border border-bm-gold/40 bg-bm-gold/10 p-6" aria-labelledby="hajj-bridge-title" data-hajj-bridge>
      <h2 id="hajj-bridge-title" className="text-xl font-bold text-bm-black">{t.clusters.bridgeTitle}</h2>
      <p className="mt-2 max-w-prose leading-relaxed text-bm-black/80">{body}</p>
      <Link
        href={`/${locale}/bab-makka`}
        className="mt-4 inline-flex rounded-full bg-bm-black px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:bg-bm-black-soft"
      >
        {t.clusters.bridgeCta} →
      </Link>
    </aside>
  );
}
