'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BLUR_DATA_URL } from '@/lib/blur';

/**
 * Partner-hotels grid with a responsive "load more". Collapsed shows full
 * rows only (3 / 4 on sm / 3 on lg) via the container-level .hotels-collapsed
 * CSS state — the per-card className MUST stay constant across renders:
 * toggling classes on the cards themselves made React rewrite each card's
 * class attribute on expand, wiping the `is-in` the reveal observer had added
 * to the DOM, so the already-visible cards snapped to opacity 0 and stayed
 * invisible. Every card is always in the served HTML (LAWS §3).
 */
export default function HotelsGrid({ hotels, locale, labels }) {
  const [expanded, setExpanded] = useState(false);

  const showBase = hotels.length > 3; // phone + lg collapsed rows show 3
  const showSm = hotels.length > 4; // sm collapsed rows show 4

  return (
    <>
      <div className={`mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${expanded ? '' : 'hotels-collapsed'}`}>
        {hotels.map((hotel) => (
          <Link
            key={hotel.id}
            data-reveal
            suppressHydrationWarning
            href={`/${locale}/hotel/${hotel.slug}`}
            className="group overflow-hidden rounded-card bg-white shadow-hairline transition hover:shadow-lift"
          >
            <div className="relative aspect-[16/10] bg-bm-black/5">
              {hotel.cover ? (
                <Image
                  src={hotel.cover.src}
                  alt={hotel.cover.alt ?? hotel.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover transition duration-500 ease-luxe group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-bold text-bm-black">
                {hotel.name}
                {hotel.stars ? (
                  <span className="ms-2 text-sm font-normal tracking-widest text-bm-gold">
                    {'★'.repeat(hotel.stars)}
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-sm text-bm-black/60">
                {hotel.city === 'makkah' ? labels.makkah : labels.madinah}
                {hotel.distance_to_haram_m != null
                  ? ` · ${labels.distanceToHaram.replace('{m}', hotel.distance_to_haram_m)}`
                  : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {!expanded && showBase ? (
        // Per-breakpoint: hidden wherever the collapsed rows already fit all.
        <div
          className={`mt-8 justify-center ${showBase ? 'flex' : 'hidden'} ${showSm ? 'sm:flex' : 'sm:hidden'} ${showBase ? 'lg:flex' : 'lg:hidden'}`}
        >
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-bm-black/15 bg-white px-6 py-2.5 text-sm font-semibold text-bm-black shadow-hairline transition hover:border-bm-gold/50 hover:shadow-lift"
          >
            {labels.loadMore}
          </button>
        </div>
      ) : null}
    </>
  );
}
