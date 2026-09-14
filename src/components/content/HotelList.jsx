import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { getHotels } from '@/lib/data/content';

/**
 * <HotelList city="makkah" /> — the partner hotels of a city as they stand in
 * the hotels table at request time (name, distance to the Haram, stars), each
 * linking its page. Hotel lists change; prose must not carry them.
 */
export default async function HotelList({ city, limit, locale }) {
  const t = getDictionary(locale);
  const hotels = (await getHotels()).filter((h) => !city || h.city === city);
  const max = Math.max(1, Math.min(12, Number(limit) || 8));
  const shown = hotels.slice(0, max);
  if (!shown.length) return null;
  const cityLabel = city === 'madinah' ? t.offer.madinah : city === 'makkah' ? t.offer.makkah : null;
  return (
    <section data-hotel-list={city ?? 'all'}>
      <h2 className="text-2xl font-bold text-bm-black">{cityLabel ? t.content.hotelsIn.replace('{city}', cityLabel) : t.home.hotelsTitle}</h2>
      <ul className="mt-4 divide-y divide-bm-black/10 rounded-card border border-bm-black/10 bg-white">
        {shown.map((h) => (
          <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href={`/${locale}/hotel/${h.slug}`} className="font-semibold text-bm-black underline-offset-4 hover:underline">
              {h.name}
              {h.stars ? <span className="ms-2 text-xs tracking-widest text-bm-gold">{'★'.repeat(h.stars)}</span> : null}
            </Link>
            <span className="text-sm text-bm-black/60">
              {h.city === 'madinah' ? t.offer.madinah : t.offer.makkah}
              {h.distance_to_haram_m != null ? ` · ${t.offer.distanceToHaram.replace('{m}', h.distance_to_haram_m)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
