'use client';

import { useEffect, useRef } from 'react';

/**
 * 9:16 reels strip: scroll-snap row, muted autoplay only while on screen,
 * poster + preload=none (zero cost until visible).
 */
export default function ReelsRow({ reels }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }
      },
      { threshold: 0.6 },
    );
    root.querySelectorAll('video').forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]"
    >
      {reels.map((reel) => (
        <figure key={reel.id} className="w-52 flex-none snap-start">
          <video
            src={reel.src}
            poster={reel.poster ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            className="aspect-[9/16] w-full rounded-card object-cover shadow-lift"
          />
          {reel.caption ? (
            <figcaption className="mt-2 truncate text-xs text-white/60">{reel.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
