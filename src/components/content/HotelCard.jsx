import Link from 'next/link';
import { getDictionary, pickLang } from '@/lib/i18n';
import { getHotels, getCovers } from '@/lib/data/content';
import { publicMediaUrl } from '@/lib/media';
import MediaImage from '@/components/MediaImage';

/**
 * <HotelCard slug="anjum" /> — ONE partner hotel as it stands in the hotels
 * table at request time (name, stars, city, distance to the Haram, cover),
 * linking its page. Distances and star ratings change; prose must not carry
 * them (gate G5). An unknown or unpublished slug renders nothing.
 */
export default async function HotelCard({ slug, locale }) {
  const t = getDictionary(locale);
  const hotel = (await getHotels()).find((h) => h.slug === slug);
  if (!hotel) return null;
  const cover = (await getCovers('hotels', [hotel.id])).get(hotel.id) ?? null;
  const city = hotel.city === 'madinah' ? t.offer.madinah : t.offer.makkah;
  const description = pickLang(hotel, 'description', locale);
  return (
    <aside className="flex flex-col gap-4 rounded-panel border border-bm-black/10 bg-white p-5 shadow-hairline sm:flex-row" data-hotel-card={hotel.slug}>
      {cover ? (
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-card sm:w-48">
          <MediaImage src={publicMediaUrl(cover.path)} alt={pickLang(cover, 'alt', locale) ?? hotel.name} fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-lg font-bold text-bm-black">
          <Link href={`/${locale}/hotel/${hotel.slug}`} className="underline-offset-4 hover:underline">{hotel.name}</Link>
          {hotel.stars ? <span className="ms-2 text-xs tracking-widest text-bm-gold">{'★'.repeat(hotel.stars)}</span> : null}
        </p>
        <p className="mt-1 text-sm text-bm-black/60">
          {city}
          {hotel.distance_to_haram_m != null ? ` · ${t.offer.distanceToHaram.replace('{m}', hotel.distance_to_haram_m)}` : ''}
        </p>
        {description ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-bm-black/80">{description}</p> : null}
      </div>
    </aside>
  );
}
