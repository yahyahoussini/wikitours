'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 9:16 reels strip — center-snapped so the current ("main") reel sits in the
 * middle of the screen. POSTER-FIRST, tap to play: the reel's bytes are never
 * fetched until the visitor taps. That matters because these webm files carry
 * their seek-index at the END, so even preload="metadata" pulls the whole
 * 10MB+ file — autoplaying/​preloading them was a ~15MB page weight. Tapping
 * mounts the <video>, plays WITH sound and shows native controls; only one
 * reel plays at a time.
 */
export default function ReelsRow({ reels }) {
  const [activeId, setActiveId] = useState(null);
  const videoRef = useRef(null);

  // Play (unmuted) once the active reel's <video> has actually mounted —
  // setState is async, so this can't happen inside the click handler.
  useEffect(() => {
    if (!activeId) return;
    const el = videoRef.current;
    if (el) {
      el.muted = false;
      el.play().catch(() => {});
    }
  }, [activeId]);

  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-7rem)] pb-3">
      {reels.map((reel) => {
        const active = activeId === reel.id;
        return (
          <figure key={reel.id} className="relative w-56 flex-none snap-center">
            {active ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative social reels */
              <video
                ref={videoRef}
                src={reel.src}
                poster={reel.poster ?? undefined}
                controls
                loop
                playsInline
                preload="none"
                className="aspect-9/16 w-full rounded-card bg-bm-black object-cover shadow-lift"
              />
            ) : (
              // Poster-first tile — zero video bytes until tapped. Real poster
              // image if one exists, else a branded gradient with a play
              // affordance so it reads as "tap to watch", never a black box.
              <button
                type="button"
                aria-label="Lire la vidéo"
                onClick={() => setActiveId(reel.id)}
                style={reel.poster ? { backgroundImage: `url(${reel.poster})` } : undefined}
                className="group flex aspect-9/16 w-full items-center justify-center rounded-card bg-linear-to-b from-bm-black-soft to-bm-black bg-cover bg-center shadow-lift"
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-float backdrop-blur transition group-hover:scale-105">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="ms-0.5 size-6 fill-bm-black">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
          </figure>
        );
      })}
    </div>
  );
}
