'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const INTERVAL_MS = 6000;

/**
 * Hero mode: blur-crossfade every 6s with a slow Ken Burns drift, slide
 * progress bars. No horizontal motion → RTL-neutral by design.
 */
export default function HeroSlideshow({ slides }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduced) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, count, paused, reduced]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-hidden="true"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 transition-[opacity,filter] duration-[1200ms] ease-luxe"
          style={{
            opacity: i === index ? 1 : 0,
            filter: i === index ? 'blur(0px)' : 'blur(10px)',
          }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            // Explicit — priority alone wasn't emitting fetchpriority here, so
            // the LCP hero raced the rest of the page instead of leading it.
            fetchPriority={i === 0 ? 'high' : undefined}
            sizes="100vw"
            quality={65}
            className="object-cover"
            style={{
              animation: !reduced && i === index ? `hero-kenburns ${INTERVAL_MS + 1500}ms linear forwards` : 'none',
            }}
          />
        </div>
      ))}
      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-bm-black/75 via-bm-black/25 to-bm-black/20" />

      {count > 1 ? (
        <div className="absolute bottom-4 start-1/2 flex w-40 -translate-x-1/2 gap-1 rtl:translate-x-1/2">
          {slides.map((slide, i) => (
            <span key={slide.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              {i === index ? (
                <span
                  key={index}
                  className="block h-full w-full bg-bm-gold-light"
                  style={{ transformOrigin: 'left', animation: paused || reduced ? 'none' : `carousel-progress ${INTERVAL_MS}ms linear`, transform: paused || reduced ? 'scaleX(1)' : undefined }}
                />
              ) : i < index ? (
                <span className="block h-full w-full bg-white/50" />
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
