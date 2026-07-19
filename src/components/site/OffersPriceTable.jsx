import Link from 'next/link';
import { pickLang } from '@/lib/i18n';
import { computeMinPrice } from '@/lib/data/content';
import { monthName } from '@/lib/months';

/**
 * Real HTML price table over the offers a hub shows (AEO: engines extract
 * tables far more reliably than card grids). Strictly DB-driven — rows without
 * a price show "—", never an invented figure. Hidden when no offer at all.
 */
export default function OffersPriceTable({ offers, locale, t, dark = false }) {
  if (!offers?.length) return null;
  const nf = new Intl.NumberFormat('fr-MA');
  const border = dark ? 'border-white/15' : 'border-bm-black/15';
  const rowBorder = dark ? 'border-white/5' : 'border-bm-black/5';
  const muted = dark ? 'text-white/50' : 'text-bm-black/50';
  const strong = dark ? 'text-white' : 'text-bm-black';

  return (
    <section className="mt-10">
      <h2 className={`text-xl font-bold ${strong}`}>{t.priceTable.title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className={`border-b ${border} text-xs font-semibold uppercase tracking-wide ${muted}`}>
              <th className="py-2 text-start">{t.priceTable.colOffer}</th>
              <th className="py-2 text-start">{t.priceTable.colDeparture}</th>
              <th className="py-2 text-end">{t.priceTable.colDuration}</th>
              <th className="py-2 text-end">{t.priceTable.colFrom}</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const price = computeMinPrice(offer.tiers) ?? offer.starting_price;
              const d = offer.date_start ? new Date(offer.date_start) : null;
              return (
                <tr key={offer.id} className={`border-b ${rowBorder}`}>
                  <td className="py-2 font-medium">
                    <Link href={`/${locale}/omra/${offer.slug}`} className="hover:underline">
                      {pickLang(offer, 'title', locale) ?? offer.slug}
                    </Link>
                  </td>
                  <td className="py-2 capitalize">
                    {d ? `${monthName(d.getUTCMonth(), locale)} ${d.getUTCFullYear()}` : '—'}
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    {offer.duration_days ? t.priceTable.days.replace('{n}', String(offer.duration_days)) : '—'}
                  </td>
                  <td className="py-2 text-end font-semibold tabular-nums">
                    {typeof price === 'number' && price > 0 ? `${nf.format(price)} MAD` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
